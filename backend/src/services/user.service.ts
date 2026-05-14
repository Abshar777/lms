import { Types } from 'mongoose'
import { UserRepository, RefreshTokenRepository } from '@/repositories/user.repository.ts'
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

  async listByRole(role: UserRole, params: { page: number; perPage: number; search?: string }) {
    return this.repo.listByRole(role, params)
  }

  /* Admin-only updates: role change, deactivate/activate, force-verify.
     Deactivation also revokes all refresh tokens for that user. */
  async adminUpdate(
    id: string,
    dto: { role?: UserRole; isActive?: boolean; isVerified?: boolean },
  ): Promise<IUser> {
    if (!Types.ObjectId.isValid(id)) {
      throw new UserError('INVALID_ID', 'Invalid user id', 400)
    }
    const update: Partial<IUser> = {}
    if (dto.role       !== undefined) update.role       = dto.role
    if (dto.isActive   !== undefined) update.isActive   = dto.isActive
    if (dto.isVerified !== undefined) update.isVerified = dto.isVerified

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
}
