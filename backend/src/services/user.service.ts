import { Types } from 'mongoose'
import { UserRepository, RefreshTokenRepository } from '@/repositories/user.repository.ts'
import { hashPassword } from '@/utils/hash.ts'
import type { UserRole } from '@/types/index.ts'
import type { IUser } from '@/models/schema.ts'

export class UserError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'UserError'
  }
}

export class UserService {
  private readonly repo         = new UserRepository()
  private readonly refreshRepo  = new RefreshTokenRepository()

  async listByRole(role: UserRole | undefined, params: { page: number; perPage: number; search?: string; category?: string; status?: 'active' | 'inactive'; excludeStudents?: boolean; enrollmentStatus?: 'pending' | 'approved' | 'rejected' | 'cancelled' }) {
    return this.repo.listByRole(role, params)
  }

  async adminDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new UserError('INVALID_ID', 'Invalid user id', 400)
    const deleted = await this.repo.hardDelete(id)
    if (!deleted) throw new UserError('USER_NOT_FOUND', 'User not found.', 404)
    await this.refreshRepo.revokeAllForUser(id, 'security')
  }

  /* Admin-only updates: role change, deactivate/activate, force-verify.
     Deactivation also revokes all refresh tokens for that user. */
  async adminUpdate(
    id: string,
    dto: { role?: UserRole; isActive?: boolean; isVerified?: boolean; name?: string; email?: string; category?: '4x-trading' | 'digital-marketing' | 'ai' | null },
  ): Promise<IUser> {
    if (!Types.ObjectId.isValid(id)) {
      throw new UserError('INVALID_ID', 'Invalid user id', 400)
    }
    const update: Partial<IUser> = {}
    if (dto.role       !== undefined) update.role       = dto.role
    if (dto.isActive   !== undefined) update.isActive   = dto.isActive
    if (dto.isVerified !== undefined) update.isVerified = dto.isVerified
    if (dto.name       !== undefined) update.name       = dto.name.trim()
    if (dto.category !== undefined) {
      update.category = dto.category ?? undefined
      // Keep categories array in sync with single category field
      if (dto.category) update.categories = [dto.category] as any
      else update.categories = [] as any
    }
    if (dto.email      !== undefined) {
      /* Check for duplicate email, excluding the current user */
      const existing = await this.repo.findByEmail(dto.email)
      if (existing && String(existing._id) !== id) {
        throw new UserError('EMAIL_TAKEN', 'An account with this email already exists.', 409)
      }
      update.email = dto.email.toLowerCase().trim()
    }

    if (Object.keys(update).length === 0) {
      throw new UserError('NO_CHANGES', 'No fields to update', 400)
    }

    const updated = await this.repo.updateById(id, update)
    if (!updated) throw new UserError('USER_NOT_FOUND', 'User not found.', 404)

    /* On deactivation, force the user to log out everywhere. */
    if (dto.isActive === false) {
      await this.refreshRepo.revokeAllForUser(id, 'security')
    }
    return updated
  }

  /* Admin creates a new user (instructor / admin) directly. */
  async findById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return null
    return this.repo.findById(id)
  }

  async adminCreateUser(dto: {
    name:      string
    email:     string
    password:  string
    role:      UserRole
    bio?:      string
    headline?: string
    category?: '4x-trading' | 'digital-marketing' | 'ai'
  }): Promise<IUser> {
    const exists = await this.repo.emailExists(dto.email)
    if (exists) {
      throw new UserError('EMAIL_TAKEN', 'An account with this email already exists.', 409)
    }
    const passwordHash = await hashPassword(dto.password)
    const user = await this.repo.createUser({
      name:         dto.name.trim(),
      email:        dto.email,
      passwordHash,
      role:         dto.role,
      category:     dto.category,
    })
    /* Patch bio / headline if provided */
    if (dto.bio || dto.headline) {
      const patch: Partial<IUser> = {}
      if (dto.bio)      patch.bio      = dto.bio
      if (dto.headline) patch.headline = dto.headline
      await this.repo.updateById(user.id, patch)
      Object.assign(user, patch)
    }
    return user
  }
}
