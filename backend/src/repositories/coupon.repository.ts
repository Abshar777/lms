import { Types } from 'mongoose'
import { CouponModel, type ICoupon } from '@/models/schema.ts'

export class CouponRepository {

  async findByCode(code: string): Promise<ICoupon | null> {
    return CouponModel.findOne({ code: code.toUpperCase().trim() }).exec()
  }

  async findById(id: string): Promise<ICoupon | null> {
    return CouponModel.findById(id).exec()
  }

  async listAll(page = 1, perPage = 50, organizationId?: string): Promise<{ docs: ICoupon[]; totalCount: number }> {
    const filter: Record<string, unknown> = {}
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      filter['organizationId'] = new Types.ObjectId(organizationId)
    }
    const [docs, totalCount] = await Promise.all([
      CouponModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).exec(),
      CouponModel.countDocuments(filter).exec(),
    ])
    return { docs, totalCount }
  }

  async create(data: {
    code:            string
    discountType:    'percent' | 'fixed'
    discountValue:   number
    maxUses?:        number
    expiresAt?:      Date
    isActive?:       boolean
    appliesTo?:      string[]
    organizationId?: string
  }): Promise<ICoupon> {
    const payload: Record<string, unknown> = {
      ...data,
      code:      data.code.toUpperCase().trim(),
      usedCount: 0,
    }
    if (data.organizationId && Types.ObjectId.isValid(data.organizationId)) {
      payload['organizationId'] = new Types.ObjectId(data.organizationId)
    }
    return CouponModel.create(payload)
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
