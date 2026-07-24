import { Types } from 'mongoose'
import { OrderRepository } from '@/repositories/order.repository.ts'
import { CouponService } from '@/services/coupon.service.ts'
import { StripeService } from '@/services/stripe.service.ts'
import { RazorpayService } from '@/services/razorpay.service.ts'
import { TabbyService } from '@/services/tabby.service.ts'
import { AbzerService } from '@/services/abzer.service.ts'
import { EnrollmentService } from '@/services/enrollment.service.ts'
import { NotificationService } from '@/services/notification.service.ts'
import { sendEnrollmentConfirmation } from '@/services/email.service.ts'
import { CourseModel, UserModel } from '@/models/schema.ts'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

export type GatewayConfig =
  | { gateways: ('tabby' | 'abzer')[]; currency: 'AED' }
  | { gateways: ['razorpay'];          currency: 'INR' }
  | { gateways: [];                    currency: 'USD' }

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
  private readonly tabbySvc      = new TabbyService()
  private readonly abzerSvc      = new AbzerService()
  private readonly enrollSvc     = new EnrollmentService()
  private readonly notifications = new NotificationService()

  /* ─── Gateway config for current user ────────────────────────
     UAE users (homeCountry === 'United Arab Emirates') get Tabby + Abzer
     when those credentials are configured. Everyone else gets Razorpay. */
  async getGatewayConfig(userId: string): Promise<GatewayConfig> {
    const user = await UserModel.findById(userId).select('enrollmentApplication.homeCountry').lean()
    const isUAE = (user as any)?.enrollmentApplication?.homeCountry === 'United Arab Emirates'

    if (isUAE) {
      const gateways: ('tabby' | 'abzer')[] = []
      if (env.TABBY_SECRET_KEY)  gateways.push('tabby')
      if (env.ABZER_ACCESS_KEY)  gateways.push('abzer')
      if (gateways.length > 0)   return { gateways, currency: 'AED' }
    }
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      return { gateways: ['razorpay'], currency: 'INR' }
    }
    return { gateways: [], currency: 'USD' }
  }

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
    await this._autoApproveViaPayment(order.userId.toString(), order.courseId.toString())
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
    await this._autoApproveViaPayment(order.userId.toString(), order.courseId.toString())
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
    await this._autoApproveViaPayment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)
  }

  /* ─── Create Tabby checkout (UAE) ───────────────────── */
  async createTabbyOrder(
    userId:      string,
    courseId:    string,
    slug:        string,
    couponCode?: string,
  ): Promise<{ checkoutUrl: string; checkoutId: string }> {
    if (!env.TABBY_SECRET_KEY || !env.TABBY_MERCHANT_CODE) {
      throw new OrderError('TABBY_NOT_CONFIGURED', 'Tabby is not configured on this server.', 503)
    }
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

    /* Convert USD price to AED */
    const priceAED      = (course as any).priceAED ?? Math.round(course.price * env.UAE_EXCHANGE_RATE * 100) / 100
    const originalFils  = Math.round(priceAED * 100)
    let   finalFils     = originalFils
    let   discountFils  = 0
    let   couponId: string | undefined

    if (couponCode) {
      const coupon   = await this.couponSvc.validate(couponCode, courseId)
      const applied  = this.couponSvc.applyDiscount(originalFils, coupon)
      finalFils      = applied.finalCents
      discountFils   = applied.discountCents
      couponId       = coupon.id
    }

    const finalAED = finalFils / 100

    const order = await this.orderRepo.create({
      userId,
      courseId,
      gateway:  'tabby',
      amount:   finalFils,
      currency: env.TABBY_CURRENCY,
      ...(couponId     && { couponId }),
      ...(discountFils && { discountAmount: discountFils }),
    })

    const user = await UserModel.findById(userId).select('name email phone').exec()
    const successUrl = `${env.CLIENT_URL}/courses/${slug}?checkout=success`
    const cancelUrl  = `${env.CLIENT_URL}/courses/${slug}?checkout=cancel`
    const failureUrl = `${env.CLIENT_URL}/courses/${slug}?checkout=cancel`

    const result = await this.tabbySvc.createCheckout({
      amountAED:   finalAED,
      orderId:     order.id,
      courseTitle: course.title,
      courseId:    course.id,
      buyerEmail:  user?.email ?? '',
      buyerName:   user?.name  ?? '',
      buyerPhone:  (user as any)?.phone ?? '',
      successUrl,
      cancelUrl,
      failureUrl,
    })

    await patchTabbyCheckoutId(order.id, result.checkoutId, result.paymentId)

    return { checkoutUrl: result.checkoutUrl, checkoutId: result.checkoutId }
  }

  /* ─── Tabby webhook fulfillment (idempotent) ─────────── */
  async fulfillTabbyFromWebhook(tabbyCheckoutId: string, tabbyPaymentId: string): Promise<void> {
    const order = await this.orderRepo.findByTabbyCheckoutId(tabbyCheckoutId)
    if (!order) {
      logger.warn({ tabbyCheckoutId }, 'Tabby webhook: no matching order')
      return
    }
    if (order.status === 'paid') {
      logger.info({ orderId: order.id }, 'Tabby webhook: already fulfilled')
      return
    }

    await this.orderRepo.fulfillTabby(order.id, tabbyPaymentId)

    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    await this._createEnrollment(order.userId.toString(), order.courseId.toString())
    await this._autoApproveViaPayment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)
  }

  /* ─── Create Abzer checkout (UAE) ───────────────────── */
  async createAbzerOrder(
    userId:      string,
    courseId:    string,
    slug:        string,
    couponCode?: string,
  ): Promise<{ checkoutUrl: string; abzerOrderId: string }> {
    if (!env.ABZER_ACCESS_KEY || !env.ABZER_SECRET_KEY) {
      throw new OrderError('ABZER_NOT_CONFIGURED', 'Abzer is not configured on this server.', 503)
    }
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

    const priceAED     = (course as any).priceAED ?? Math.round(course.price * env.UAE_EXCHANGE_RATE * 100) / 100
    const originalFils = Math.round(priceAED * 100)
    let   finalFils    = originalFils
    let   discountFils = 0
    let   couponId: string | undefined

    if (couponCode) {
      const coupon   = await this.couponSvc.validate(couponCode, courseId)
      const applied  = this.couponSvc.applyDiscount(originalFils, coupon)
      finalFils      = applied.finalCents
      discountFils   = applied.discountCents
      couponId       = coupon.id
    }

    const order = await this.orderRepo.create({
      userId,
      courseId,
      gateway:  'abzer',
      amount:   finalFils,
      currency: env.ABZER_CURRENCY,
      ...(couponId     && { couponId }),
      ...(discountFils && { discountAmount: discountFils }),
    })

    const user = await UserModel.findById(userId).select('name email').exec()
    const successUrl = `${env.CLIENT_URL}/courses/${slug}?checkout=success`
    const cancelUrl  = `${env.CLIENT_URL}/courses/${slug}?checkout=cancel`
    const failureUrl = `${env.CLIENT_URL}/courses/${slug}?checkout=cancel`

    const result = await this.abzerSvc.createOrder({
      amountAED:   finalFils / 100,
      orderId:     order.id,
      courseTitle: course.title,
      buyerEmail:  user?.email ?? '',
      buyerName:   user?.name  ?? '',
      buyerPhone:  (user as any)?.phone ?? '',
    })

    await patchAbzerOrderId(order.id, result.abzerRequestId)

    return { checkoutUrl: result.checkoutUrl, abzerOrderId: result.abzerRequestId }
  }

  /* ─── Abzer webhook fulfillment (idempotent) ─────────── */
  /* orderId = the invoiceNumber from the webhook payload, which Abzer sets to our referenceNumber */
  async fulfillAbzerFromWebhook(orderId: string, receiptId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId)
    if (!order) {
      logger.warn({ orderId }, 'Abzer webhook: no matching order')
      return
    }
    if (order.status === 'paid') {
      logger.info({ orderId: order.id }, 'Abzer webhook: already fulfilled')
      return
    }

    await this.orderRepo.fulfillAbzer(order.id, receiptId)

    if (order.couponId) {
      void this.couponSvc.redeem(order.couponId.toString()).catch(err =>
        logger.warn({ err }, 'Failed to increment coupon usage'),
      )
    }

    await this._createEnrollment(order.userId.toString(), order.courseId.toString())
    await this._autoApproveViaPayment(order.userId.toString(), order.courseId.toString())
    void this._sendPostPaymentNotifications(order.userId.toString(), order.courseId.toString(), order.id)
    logger.info({ orderId, receiptId }, 'Abzer: order fulfilled via webhook')
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
    } else if (order.gateway === 'tabby' || order.gateway === 'abzer') {
      /* Tabby and Abzer refunds must be processed manually via their dashboards
         until API-based refund endpoints are confirmed with the providers. */
      throw new OrderError(
        'MANUAL_REFUND_REQUIRED',
        `${order.gateway === 'tabby' ? 'Tabby' : 'Abzer'} refunds must be processed via the gateway dashboard.`,
        422,
      )
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

  /* Auto-approve a viewer/rejected user when they successfully pay for a course.
     Sets enrollmentStatus → 'approved', assigns the course's program category,
     and marks approval as a paid self-enrollment so admins can see it in the UI. */
  private async _autoApproveViaPayment(userId: string, courseId: string): Promise<void> {
    const user = await UserModel.findById(userId)
      .select('enrollmentStatus categories category').lean()
    if (!user || (user as any).enrollmentStatus === 'approved') return

    const course = await CourseModel.findById(courseId).select('program').lean()
    const newCat  = (course as any)?.program as string | undefined

    const existingCats: string[] = (user as any).categories
      ?? ((user as any).category ? [(user as any).category] : [])
    const mergedCats = newCat
      ? [...new Set([...existingCats, newCat])]
      : existingCats

    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        enrollmentStatus: 'approved',
        approvedByEmail:  'payment@system',
        approvedByName:   'Paid Enrollment',
        approvedByRole:   'system',
        approvedAt:       new Date(),
        ...(mergedCats.length > 0 && { categories: mergedCats, category: mergedCats[0] }),
      },
      $unset: { rejectionReason: '', enrollmentCancellationReason: '' },
    })

    logger.info({ userId, courseId, category: newCat }, '✅ Viewer auto-approved via paid enrollment')
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

async function patchTabbyCheckoutId(orderId: string, tabbyCheckoutId: string, tabbyPaymentId: string): Promise<void> {
  const { OrderModel } = await import('@/models/schema.ts')
  await OrderModel.findByIdAndUpdate(orderId, { $set: { tabbyCheckoutId, tabbyPaymentId } }).exec()
}

async function patchAbzerOrderId(orderId: string, abzerOrderId: string): Promise<void> {
  const { OrderModel } = await import('@/models/schema.ts')
  await OrderModel.findByIdAndUpdate(orderId, { $set: { abzerOrderId } }).exec()
}
