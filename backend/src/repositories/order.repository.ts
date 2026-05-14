import { OrderModel, type IOrder } from '@/models/schema.ts'

export class OrderRepository {

  async create(data: {
    userId:                  string
    courseId:                string
    stripeCheckoutSessionId: string
    amount:                  number
    currency:                string
    couponId?:               string
    discountAmount?:         number
  }): Promise<IOrder> {
    return OrderModel.create({
      ...data,
      status:         'pending',
      discountAmount: data.discountAmount ?? 0,
    })
  }

  async findBySessionId(sessionId: string): Promise<IOrder | null> {
    return OrderModel.findOne({ stripeCheckoutSessionId: sessionId }).exec()
  }

  async findById(id: string): Promise<IOrder | null> {
    return OrderModel.findById(id).exec()
  }

  async fulfill(id: string, paymentIntentId: string, invoiceUrl?: string): Promise<IOrder | null> {
    return OrderModel.findByIdAndUpdate(
      id,
      { $set: { status: 'paid', stripePaymentIntentId: paymentIntentId, ...(invoiceUrl && { stripeInvoiceUrl: invoiceUrl }) } },
      { new: true },
    ).exec()
  }

  async markRefunded(id: string): Promise<IOrder | null> {
    return OrderModel.findByIdAndUpdate(
      id,
      { $set: { status: 'refunded', refundedAt: new Date() } },
      { new: true },
    ).exec()
  }

  async listForUser(userId: string): Promise<IOrder[]> {
    return OrderModel
      .find({ userId })
      .populate('courseId', 'title slug thumbnailUrl')
      .sort({ createdAt: -1 })
      .exec()
  }

  /* Admin: paginated, all statuses */
  async listAll(page = 1, perPage = 20, status?: string): Promise<{ docs: IOrder[]; totalCount: number }> {
    const filter = status && status !== 'all' ? { status } : {}
    const [docs, totalCount] = await Promise.all([
      OrderModel
        .find(filter)
        .populate('userId',   'name email')
        .populate('courseId', 'title slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec(),
      OrderModel.countDocuments(filter).exec(),
    ])
    return { docs, totalCount }
  }

  /* Revenue time-series — paid orders only */
  async revenueTimeseries(days: number): Promise<{ date: string; amount: number }[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const rows = await OrderModel.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id:    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    /* Fill in zero-days so the chart always has `days` points */
    const byDate = new Map<string, number>(rows.map((r: any) => [r._id, r.amount]))
    const out: { date: string; amount: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      out.push({ date: key, amount: byDate.get(key) ?? 0 })
    }
    return out
  }

  /* Total revenue (cents) from paid orders */
  async totalRevenue(): Promise<number> {
    const result = await OrderModel.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    return result[0]?.total ?? 0
  }
}
