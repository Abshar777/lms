import { Types } from 'mongoose'
import { OrderRepository } from '@/repositories/order.repository.ts'
import { CouponService } from '@/services/coupon.service.ts'
import { StripeService } from '@/services/stripe.service.ts'
import { EnrollmentService } from '@/services/enrollment.service.ts'
import { NotificationService } from '@/services/notification.service.ts'
import { sendEnrollmentConfirmation } from '@/services/email.service.ts'
import { CourseModel, UserModel } from '@/models/schema.ts'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

export class OrderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'OrderError'
  }
}

export class OrderService {
  private readonly orderRepo     = new OrderRepository()
  private readonly couponSvc     = new CouponService()
  private readonly stripeSvc     = new StripeService()
  private readonly enrollSvc     = new EnrollmentService()
  private readonly notifications = new NotificationService()

  /* ─── Create Stripe checkout session ──────────────── */
  async createCheckoutSession(userId: string, courseId: string, couponCode?: string): Promise<{ url: string }> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new OrderError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }

    const course = await CourseModel.findById(courseId).exec()
    if (!course || course.status !== 'published') {
      throw new OrderError('COURSE_NOT_FOUND', 'Course not found', 404)
    }
    if (course.isFree || course.price <= 0) {
      throw new OrderError('COURSE_IS_FREE', 'This course is free — use the enroll endpoint instead', 400)
    }

    /* Prevent re-purchase if already enrolled */
    const { enrollment } = await this.enrollSvc.enroll(userId, courseId).catch(() => ({ enrollment: null }))
    // If enrollment succeeded (free course or already enrolled), redirect; else proceed
    // Actually for paid courses enroll() returns 402 — so check differently:
    const { EnrollmentModel } = await import('@/models/schema.ts')
    const existing = await EnrollmentModel.findOne({ userId, courseId }).exec()
    if (existing) {
      throw new OrderError('ALREADY_ENROLLED', 'You are already enrolled in this course', 409)
    }

    const originalCents = Math.round(course.price * 100)
    let finalCents      = originalCents
    let discountCents   = 0
    let couponId: string | undefined

    if (couponCode) {
      const coupon = await this.couponSvc.validate(couponCode, courseId)
      const applied = this.couponSvc.applyDiscount(originalCents, coupon)
      finalCents    = applied.finalCents
      discountCents = applied.discountCents
      couponId      = coupon.id
    }

    /* Stripe requires minimum 50 cents; 100% coupons result in 0 */
    if (finalCents > 0 && finalCents < 50) finalCents = 50

    const clientUrl  = env.CLIENT_URL
    const successUrl = `${clientUrl}/courses/${course.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl  = `${clientUrl}/courses/${course.slug}?checkout=cancel`

    /* Create placeholder Order first so we have an orderId for metadata */
    const order = await this.orderRepo.create({
      userId,
      courseId,
      stripeCheckoutSessionId: 'pending',  // updated after session creation
      amount:   finalCents,
      currency: env.STRIPE_CURRENCY,
      ...(couponId      && { couponId }),
      ...(discountCents && { discountAmount: discountCents }),
    })

    const session = await this.stripeSvc.createCheckoutSession({
      orderId:       order.id,
      userId,
      courseId,
      courseTitle:   course.title,
      thumbnailUrl:  course.thumbnailUrl,
      description:   course.description,
      amountCents:   finalCents,
      currency:      env.STRIPE_CURRENCY,
      successUrl,
      cancelUrl,
    })

    /* Patch the order with the real session id */
    await OrderModel_patchSession(order.id, session.id)

    return { url: session.url! }
  }

  /* ─── Webhook fulfillment ────────────────────────── */
  async fulfillOrder(stripeSessionId: string, paymentIntentId: string): Promise<void> {
    const order = await this.orderRepo.findBySessionId(stripeSessionId)
    if (!order) {
      logger.warn({ stripeSessionId }, 'Webhook: no matching order found')
      return
    }
    if (order.status === 'paid') {
      logger.info({ orderId: order.id }, 'Webhook: order already fulfilled, skipping')
      return
    }

    await this.orderRepo.fulfill(order.id, paymentIntentId)

    /* Increment coupon usage if applicable */
    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    /* Create enrollment idempotently — bypass the free-course guard by
       calling the repository directly */
    const { EnrollmentRepository } = await import('@/repositories/enrollment.repository.ts')
    const { CourseRepository }     = await import('@/repositories/course.repository.ts')
    const enrollRepo = new EnrollmentRepository()
    const courseRepo = new CourseRepository()

    const already = await enrollRepo.findByUserCourse(order.userId.toString(), order.courseId.toString())
    if (!already) {
      await enrollRepo.create_({
        userId:   order.userId.toString(),
        courseId: order.courseId.toString(),
      })
      await courseRepo.incrementEnrollment(order.courseId.toString(), 1)
    }

    /* Fire-and-forget notification + email */
    const { CourseModel: CM } = await import('@/models/schema.ts')
    const course = await CM.findById(order.courseId).select('title slug').exec()
    if (course) {
      void this.notifications.create(order.userId.toString(), {
        kind:  'enrollment',
        title: `Enrolled in ${course.title}`,
        body:  'Your payment was successful. Start learning now!',
        link:  `/courses/${course.slug}`,
      }).catch(() => {})

      /* Enrollment confirmation email */
      void (async () => {
        try {
          const user = await UserModel.findById(order.userId).select('name email').exec()
          if (user) {
            const courseUrl = `${env.CLIENT_URL}/courses/${course.slug}`
            await sendEnrollmentConfirmation(user.email, user.name, course.title, courseUrl)
          }
        } catch (err) {
          logger.warn({ err, orderId: order.id }, 'order enrollment email failed')
        }
      })()
    }
  }

  /* ─── Refund (admin) ────────────────────────────── */
  async refund(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId)
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 'Order not found', 404)
    if (order.status !== 'paid') {
      throw new OrderError('ORDER_NOT_PAID', 'Only paid orders can be refunded', 400)
    }
    if (!order.stripePaymentIntentId) {
      throw new OrderError('NO_PAYMENT_INTENT', 'Cannot refund — no payment intent on record', 400)
    }

    await this.stripeSvc.refundPaymentIntent(order.stripePaymentIntentId)
    await this.orderRepo.markRefunded(orderId)
  }

  /* ─── List orders (student) ─────────────────────── */
  async listForUser(userId: string) {
    return this.orderRepo.listForUser(userId)
  }

  /* ─── Admin list + analytics ─────────────────────── */
  async adminList(page = 1, perPage = 20, status?: string) {
    return this.orderRepo.listAll(page, perPage, status)
  }

  async revenueTimeseries(days: number) {
    return this.orderRepo.revenueTimeseries(days)
  }

  async totalRevenue(): Promise<number> {
    return this.orderRepo.totalRevenue()
  }
}

/* Helper: update placeholder session id after Stripe session is created */
async function OrderModel_patchSession(orderId: string, sessionId: string): Promise<void> {
  const { OrderModel } = await import('@/models/schema.ts')
  await OrderModel.findByIdAndUpdate(orderId, { $set: { stripeCheckoutSessionId: sessionId } }).exec()
}
