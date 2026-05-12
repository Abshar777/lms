import { BaseRepository } from './base.repository.ts'
import { UserModel, RefreshTokenModel } from '@/models/schema.ts'
import type { IUser, IRefreshToken } from '@/models/schema.ts'

/* ─────────────────────────────────────────────────────
   UserRepository
───────────────────────────────────────────────────── */
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel)
  }

  /* ── Find by email (includes passwordHash for auth) */
  async findByEmail(email: string): Promise<IUser | null> {
    /* passwordHash has select:false — must opt-in explicitly */
    return UserModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec()
  }

  /* ── Find by OAuth provider ─────────────────────── */
  async findByProvider(provider: string, providerId: string): Promise<IUser | null> {
    return UserModel.findOne({ provider, providerId }).exec()
  }

  /* ── Create user (normalizes email) ─────────────── */
  async createUser(data: {
    name:         string
    email:        string
    passwordHash?: string
    role?:        IUser['role']
    provider?:    string
    providerId?:  string
    avatarUrl?:   string
  }): Promise<IUser> {
    return this.create({
      ...data,
      email:      data.email.toLowerCase().trim(),
      isVerified: false,
      isActive:   true,
    } as Partial<IUser>)
  }

  /* ── Stamp last login time ───────────────────────── */
  async touchLastLogin(id: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } }).exec()
  }

  /* ── Check email exists ─────────────────────────── */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email: email.toLowerCase().trim() })
  }
}

/* ─────────────────────────────────────────────────────
   RefreshTokenRepository
   Token rotation — each refresh issues a new token,
   revokes the old one. Reuse detection included.
───────────────────────────────────────────────────── */
export class RefreshTokenRepository extends BaseRepository<IRefreshToken> {
  constructor() {
    super(RefreshTokenModel)
  }

  /* ── Persist a new hashed token ─────────────────── */
  async saveToken(data: {
    userId:    string
    tokenHash: string
    expiresAt: Date
  }): Promise<IRefreshToken> {
    return this.create({
      userId:    data.userId,
      tokenHash: data.tokenHash,
      isRevoked: false,
      expiresAt: data.expiresAt,
    } as Partial<IRefreshToken>)
  }

  /* ── Find a valid (non-revoked, non-expired) token ─ */
  async findValid(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).exec()
  }

  /* ── Revoke a single token ─────────────────────── */
  async revokeToken(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash },
      { $set: { isRevoked: true } },
    ).exec()
  }

  /* ── Revoke all tokens for a user ───────────────── */
  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } },
    ).exec()
  }

  /* ── Delete expired tokens (maintenance) ────────── */
  async deleteExpired(): Promise<number> {
    return this.deleteMany({ expiresAt: { $lt: new Date() } })
  }
}
