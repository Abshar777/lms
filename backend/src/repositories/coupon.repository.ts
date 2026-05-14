import { CouponModel, type ICoupon } from '@/models/schema.ts'

export class CouponRepository {

  async findByCode(code: string): Promise<ICoupon | null> {
    return CouponModel.findOne({ code: code.toUpperCase().trim() }).exec()
  }

  async findById(id: string): Promise<ICoupon | null> {
    return CouponModel.findById(id).exec()
  }

  async listAll(page = 1, perPage = 50): Promise<{ docs: ICoupon[]; totalCount: number }> {
    const [docs, totalCount] = await Promise.all([
      CouponModel.find().sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).exec(),
      CouponModel.countDocuments().exec(),
    ])
    return { docs, totalCount }
  }

  async create(data: {
    code:          string
    discountType:  'percent' | 'fixed'
    discountValue: number
    maxUses?:      number
    expiresAt?:    Date
    isActive?:     boolean
    appliesTo?:    string[]
  }): Promise<ICoupon> {
    return CouponModel.create({
      ...data,
      code:     data.code.toUpperCase().trim(),
      usedCount: 0,
    })
  }

  async update(id: string, patch: Partial<Pick<ICoupon,
    'discountType' | 'discountValue' | 'maxUses' | 'expiresAt' | 'isActive' | 'appliesTo'
  >>): Promise<ICoupon | null> {
    return CouponModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).exec()
  }

  async incrementUsage(id: string): Promise<void> {
    await CouponModel.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }).exec()
  }

  async deleteById(id: string): Promise<void> {
    await CouponModel.findByIdAndDelete(id).exec()
  }
}
