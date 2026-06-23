import { Types } from 'mongoose'
import { OrderRepository } from '@/repositories/order.repository.ts'
import { CouponService } from '@/services/coupon.service.ts'
import { StripeService } from '@/services/stripe.service.ts'
import { RazorpayService } from '@/services/razorpay.service.ts'
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
  private readonly razorpaySvc   = new RazorpayService()
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

    if (finalCents > 0 && finalCents < 50) finalCents = 50

    const clientUrl  = env.CLIENT_URL
    const successUrl = `${clientUrl}/courses/${course.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl  = `${clientUrl}/courses/${course.slug}?checkout=cancel`

    const order = await this.orderRepo.create({
      userId,
      courseId,
      gateway:                  'stripe',
      stripeCheckoutSessionId:  'pending',
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

    await patchStripeSession(order.id, session.id)

    return { url: session.url! }
  }

  /* ─── Create Razorpay order ────────────────────────── */
  async createRazorpayOrder(
    userId: string,
    courseId: string,
    couponCode?: string,
  ): Promise<{
    razorpayOrderId: string
    amount:          number
    currency:        string
    key:             string
    courseName:      string
    userEmail:       string
    userName:        string
  }> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new OrderError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }

    const course = await CourseModel.findById(courseId).exec()
    if (!course || course.status !== 'published') {
      throw new OrderError('COURSE_NOT_FOUND', 'Course not found', 404)
    }
    if (course.isFree || (!(course as any).priceINR && course.price <= 0)) {
      throw new OrderError('COURSE_IS_FREE', 'This course is free — use the enroll endpoint instead', 400)
    }

    const { EnrollmentModel } = await import('@/models/schema.ts')
    const existing = await EnrollmentModel.findOne({ userId, courseId }).exec()
    if (existing) {
      throw new OrderError('ALREADY_ENROLLED', 'You are already enrolled in this course', 409)
    }

    /* Convert price to paise: prefer priceINR, fallback to USD * 83 */
    const priceINR      = (course as any).priceINR ?? Math.round(course.price * 83)
    const originalPaise = Math.round(priceINR * 100)
    let   finalPaise    = originalPaise
    let   discountPaise = 0
    let   couponId: string | undefined

    if (couponCode) {
      const coupon = await this.couponSvc.validate(couponCode, courseId)
      const applied = this.couponSvc.applyDiscount(originalPaise, coupon)
      finalPaise    = applied.finalCents
      discountPaise = applied.discountCents
      couponId      = coupon.id
    }

    /* Razorpay minimum: 100 paise (₹1) */
    if (finalPaise > 0 && finalPaise < 100) finalPaise = 100

    const order = await this.orderRepo.create({
      userId,
      courseId,
      gateway:  'razorpay',
      amount:   finalPaise,
      currency: env.RAZORPAY_CURRENCY,
      ...(couponId      && { couponId }),
      ...(discountPaise && { discountAmount: discountPaise }),
    })

    const rzpOrder = await this.razorpaySvc.createOrder({
      amountPaise: finalPaise,
      currency:    env.RAZORPAY_CURRENCY,
      receipt:     order.id.slice(-40),
      notes:       { courseId, userId },
    })

    /* Patch order with real Razorpay order id */
    await patchRazorpayOrderId(order.id, rzpOrder.id)

    const user = await UserModel.findById(userId).select('name email').exec()

    return {
      razorpayOrderId: rzpOrder.id,
      amount:          finalPaise,
      currency:        env.RAZORPAY_CURRENCY,
      key:             env.RAZORPAY_KEY_ID!,
      courseName:      course.title,
      userEmail:       user?.email ?? '',
      userName:        user?.name  ?? '',
    }
  }

  /* ─── Verify Razorpay signature + fulfill ─────────── */
  async verifyAndFulfillRazorpay(
    razorpayOrderId:   string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<{ orderId: string }> {
    const valid = this.razorpaySvc.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    if (!valid) {
      throw new OrderError('INVALID_SIGNATURE', 'Payment signature verification failed', 400)
    }

    const order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId)
    if (!order) {
      throw new OrderError('ORDER_NOT_FOUND', 'Order not found', 404)
    }

    /* Idempotent — already fulfilled (e.g. webhook beat us here) */
    if (order.status === 'paid') {
      logger.info({ orderId: order.id }, 'Razorpay: order already fulfilled, skipping')
      return { orderId: order.id }
    }

    await this.orderRepo.fulfillRazorpay(order.id, razorpayPaymentId, razorpaySignature)

    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    await this._createEnrollment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)

    return { orderId: order.id }
  }

  /* ─── Webhook backup fulfillment (idempotent) ──────── */
  async fulfillFromWebhook(razorpayOrderId: string, razorpayPaymentId: string): Promise<void> {
    const order = await this.orderRepo.findByRazorpayOrderId(razorpayOrderId)
    if (!order) {
      logger.warn({ razorpayOrderId }, 'Webhook: no matching order found')
      return
    }
    if (order.status === 'paid') {
      logger.info({ orderId: order.id }, 'Webhook: order already fulfilled, skipping')
      return
    }

    await this.orderRepo.fulfillRazorpay(order.id, razorpayPaymentId, '')

    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    await this._createEnrollment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)
  }

  /* ─── Stripe webhook fulfillment ────────────────────── */
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

    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    await this._createEnrollment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)
  }

  /* ─── Refund (gateway-aware) ────────────────────────── */
  async refund(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId)
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 'Order not found', 404)
    if (order.status !== 'paid') {
      throw new OrderError('ORDER_NOT_PAID', 'Only paid orders can be refunded', 400)
    }

    if (order.gateway === 'razorpay') {
      if (!order.razorpayPaymentId) {
        throw new OrderError('NO_PAYMENT_ID', 'Cannot refund — no Razorpay payment id on record', 400)
      }
      await this.razorpaySvc.refundPayment(order.razorpayPaymentId)
    } else {
      if (!order.stripePaymentIntentId) {
        throw new OrderError('NO_PAYMENT_ID', 'Cannot refund — no payment intent on record', 400)
      }
      await this.stripeSvc.refundPaymentIntent(order.stripePaymentIntentId)
    }

    await this.orderRepo.markRefunded(orderId)
  }

  /* ─── List orders (student) ─────────────────────────── */
  async listForUser(userId: string) {
    return this.orderRepo.listForUser(userId)
  }

  /* ─── Admin list + analytics ──────────────────────── */
  async adminList(page = 1, perPage = 20, status?: string) {
    return this.orderRepo.listAll(page, perPage, status)
  }

  async revenueTimeseries(days: number) {
    return this.orderRepo.revenueTimeseries(days)
  }

  async totalRevenue(): Promise<number> {
    return this.orderRepo.totalRevenue()
  }

  /* ─── Private helpers ───────────────────────────────── */
  private async _createEnrollment(userId: string, courseId: string): Promise<void> {
    const { EnrollmentRepository } = await import('@/repositories/enrollment.repository.ts')
    const { CourseRepository }     = await import('@/repositories/course.repository.ts')
    const enrollRepo = new EnrollmentRepository()
    const courseRepo = new CourseRepository()

    const already = await enrollRepo.findByUserCourse(userId, courseId)
    if (!already) {
      await enrollRepo.create_({ userId, courseId })
      await courseRepo.incrementEnrollment(courseId, 1)
    }
  }

  private async _sendPostPaymentNotifications(userId: string, courseId: string, orderId: string): Promise<void> {
    try {
      const course = await CourseModel.findById(courseId).select('title slug').exec()
      if (!course) return

      void this.notifications.create(userId, {
        kind:  'enrollment',
        title: `Enrolled in ${course.title}`,
        body:  'Your payment was successful. Start learning now!',
        link:  `/courses/${course.slug}`,
      }).catch(() => {})

      const user = await UserModel.findById(userId).select('name email').exec()
      if (user) {
        const courseUrl = `${env.CLIENT_URL}/courses/${course.slug}`
        await sendEnrollmentConfirmation(user.email, user.name, course.title, courseUrl)
      }
    } catch (err) {
      logger.warn({ err, orderId }, 'Post-payment notification failed')
    }
  }
}

async function patchStripeSession(orderId: string, sessionId: string): Promise<void> {
  const { OrderModel } = await import('@/models/schema.ts')
  await OrderModel.findByIdAndUpdate(orderId, { $set: { stripeCheckoutSessionId: sessionId } }).exec()
}

async function patchRazorpayOrderId(orderId: string, razorpayOrderId: string): Promise<void> {
  const { OrderModel } = await import('@/models/schema.ts')
  await OrderModel.findByIdAndUpdate(orderId, { $set: { razorpayOrderId } }).exec()
}
