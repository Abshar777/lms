import { CouponRepository } from '@/repositories/coupon.repository.ts'
import type { ICoupon } from '@/models/schema.ts'

export class CouponError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'CouponError'
  }
}

export class CouponService {
  private readonly repo = new CouponRepository()

  /* ─── Validate coupon for a course ──────────────────
     Returns the coupon if valid, throws CouponError if not.
     Does NOT increment usedCount — call redeem() after payment. */
  async validate(code: string, courseId: string): Promise<ICoupon> {
    const coupon = await this.repo.findByCode(code)
    if (!coupon) throw new CouponError('COUPON_NOT_FOUND', 'Coupon not found or invalid', 404)
    if (!coupon.isActive) throw new CouponError('COUPON_INACTIVE', 'This coupon is no longer active', 400)
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new CouponError('COUPON_EXPIRED', 'This coupon has expired', 400)
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      throw new CouponError('COUPON_EXHAUSTED', 'This coupon has reached its usage limit', 400)
    }
    if (coupon.appliesTo.length > 0) {
      const applies = coupon.appliesTo.some(id => id.toString() === courseId)
      if (!applies) throw new CouponError('COUPON_NOT_APPLICABLE', 'This coupon does not apply to this course', 400)
    }
    return coupon
  }

  /* Returns discounted price in cents */
  applyDiscount(originalCents: number, coupon: ICoupon): { finalCents: number; discountCents: number } {
    let discountCents: number
    if (coupon.discountType === 'percent') {
      discountCents = Math.round(originalCents * (coupon.discountValue / 100))
    } else {
      // fixed: discountValue is in USD dollars
      discountCents = Math.round(coupon.discountValue * 100)
    }
    discountCents = Math.min(discountCents, originalCents)
    return {
      finalCents:    originalCents - discountCents,
      discountCents,
    }
  }

  async redeem(couponId: string): Promise<void> {
    await this.repo.incrementUsage(couponId)
  }

  /* ─── Admin CRUD ────────────────────────────────── */
  async create(data: {
    code:          string
    discountType:  'percent' | 'fixed'
    discountValue: number
    maxUses?:      number
    expiresAt?:    string   // ISO string
    appliesTo?:    string[]
  }): Promise<ICoupon> {
    // Check duplicate code
    const existing = await this.repo.findByCode(data.code)
    if (existing) throw new CouponError('COUPON_CODE_EXISTS', `Coupon code "${data.code}" already exists`, 409)

    if (data.discountType === 'percent' && (data.discountValue < 1 || data.discountValue > 100)) {
      throw new CouponError('INVALID_DISCOUNT', 'Percent discount must be 1–100', 400)
    }
    if (data.discountType === 'fixed' && data.discountValue <= 0) {
      throw new CouponError('INVALID_DISCOUNT', 'Fixed discount must be > 0', 400)
    }

    return this.repo.create({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    })
  }

  async list(page = 1, perPage = 50) {
    return this.repo.listAll(page, perPage)
  }

  async update(id: string, patch: {
    discountType?:  'percent' | 'fixed'
    discountValue?: number
    maxUses?:       number
    expiresAt?:     string | null
    isActive?:      boolean
    appliesTo?:     string[]
  }): Promise<ICoupon> {
    const update: Record<string, unknown> = { ...patch }
    if ('expiresAt' in patch) {
      update['expiresAt'] = patch.expiresAt ? new Date(patch.expiresAt) : null
    }
    const updated = await this.repo.update(id, update as any)
    if (!updated) throw new CouponError('COUPON_NOT_FOUND', 'Coupon not found', 404)
    return updated
  }

  async remove(id: string): Promise<void> {
    await this.repo.deleteById(id)
  }
}
