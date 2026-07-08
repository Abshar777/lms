import { createHash, randomBytes } from 'crypto'
import { UserRepository, RefreshTokenRepository, AuthTokenRepository } from '@/repositories/user.repository.ts'
import { hashPassword, comparePassword } from '@/utils/hash.ts'
import { generateTokenPair, verifyRefreshToken } from '@/utils/jwt.ts'
import { logger } from '@/utils/logger.ts'
import { sendPasswordReset, sendVerifyEmail } from '@/services/email.service.ts'
import { env } from '@/config/env.ts'
import type { RegisterDto, LoginDto, TokenPair, UserRole } from '@/types/index.ts'
import type { SafeUser } from '@/models/types.ts'
import { toSafeUser } from '@/models/types.ts'

/* ─── Domain error class ────────────────────────────
   Thrown by service, caught by controller → next(err)
   → mapped to HTTP response by errorMiddleware
───────────────────────────────────────────────────── */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/* ─────────────────────────────────────────────────────
   AuthService
   ─────────────────────────────────────────────────────
   No db param — Mongoose models are module singletons.
   Repositories are instantiated once as class fields.
───────────────────────────────────────────────────── */
export class AuthService {
  private readonly userRepo      = new UserRepository()
  private readonly tokenRepo     = new RefreshTokenRepository()
  private readonly authTokenRepo = new AuthTokenRepository()

  /* ── Register ────────────────────────────────────── */
  async register(
    dto: RegisterDto,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    /* 1. Ensure email is unique */
    const exists = await this.userRepo.emailExists(dto.email)
    if (exists) {
      throw new AuthError('EMAIL_TAKEN', 'An account with this email already exists.', 409)
    }

    /* 2. Hash password */
    const passwordHash = await hashPassword(dto.password)

    /* 3. Create user with pending enrollment status */
    const user = await this.userRepo.createUser({
      name:                   dto.name.trim(),
      email:                  dto.email,
      passwordHash,
      role:                   'student',
      enrollmentStatus:       'pending',
      categories:             [],
      enrollmentApplication:  dto.enrollmentApplication,
    })

    /* 4. Issue tokens (student gets tokens but stays pending) */
    const tokens = await this.#issueTokens(user.id, user.email, user.role, meta)

    /* 5. Notify all admins of the new signup request */
    void this.#notifyAllAdmins(user.name, user.email).catch(err =>
      logger.warn({ err, userId: user.id }, 'admin notification failed'),
    )

    /* 6. Fire-and-forget verification email */
    void this.#sendVerificationEmail(user.id, user.email, user.name).catch(err =>
      logger.warn({ err, userId: user.id }, 'verification email failed'),
    )

    logger.info({ userId: user.id }, 'User registered')
    return { user: toSafeUser(user), tokens }
  }

  /* ── Login ───────────────────────────────────────── */
  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    /* 1. Find user (includes passwordHash via select:+passwordHash) */
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user || !user.isActive) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    /* 2. Account-level lockout */
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new AuthError(
        'ACCOUNT_LOCKED',
        `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        423,
      )
    }

    /* 3. Block OAuth-only accounts from password login */
    if (!user.passwordHash) {
      throw new AuthError(
        'OAUTH_ACCOUNT',
        'This account uses social login. Please sign in with Google.',
        400,
      )
    }

    /* 4. Verify password */
    const valid = await comparePassword(dto.password, user.passwordHash)
    if (!valid) {
      const { lockedUntil } = await this.userRepo.incrementFailedLogin(user.id)
      if (lockedUntil) {
        throw new AuthError(
          'ACCOUNT_LOCKED',
          'Too many failed attempts. Account locked for 15 minutes.',
          423,
        )
      }
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    /* 5. Successful login — reset counter + stamp time */
    void this.userRepo.touchLastLogin(user.id)

    /* 6. Issue tokens */
    const tokens = await this.#issueTokens(user.id, user.email, user.role, meta)

    logger.info({ userId: user.id }, 'User logged in')
    return { user: toSafeUser(user), tokens }
  }

  /* ── Refresh ─────────────────────────────────────── */
  async refresh(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    /* 1. Verify JWT */
    let payload
    try {
      payload = await verifyRefreshToken(rawRefreshToken)
    } catch {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401)
    }

    /* 2. Look up the token in DB and reason about its state.
       - Not found at all              → invalid / unknown token, 401
       - Found, revoked by 'rotation'  → reuse attack signal, nuke everything
       - Found, revoked any other way  → device was kicked legitimately, 401
       - Found, not revoked            → all good, rotate */
    const tokenHash = this.#hashToken(rawRefreshToken)
    const stored    = await this.tokenRepo.findByHash(tokenHash)

    if (!stored) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401)
    }
    if (stored.isRevoked) {
      if (stored.revokedReason === 'rotation') {
        await this.tokenRepo.revokeAllForUser(payload.sub!, 'security')
        logger.warn({ userId: payload.sub }, 'Refresh token reuse detected — all sessions revoked')
        throw new AuthError('TOKEN_REUSE', 'Security alert: session invalidated.', 401)
      }
      /* User-revoked / logged-out / security-revoked — just reject this device. */
      throw new AuthError('INVALID_REFRESH_TOKEN', 'This session has been signed out.', 401)
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401)
    }

    /* 3. Rotate — revoke old token with reason 'rotation' so a replay
       triggers reuse detection. */
    await this.tokenRepo.revokeToken(tokenHash, 'rotation')

    /* 4. Load fresh user */
    const user = await this.userRepo.findById(payload.sub!)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found or deactivated.', 401)
    }

    /* 5. Issue new pair */
    const tokens = await this.#issueTokens(user.id, user.email, user.role, meta)
    logger.debug({ userId: user.id }, 'Tokens rotated')
    return tokens
  }

  /* ── Logout ──────────────────────────────────────── */
  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokenRepo.revokeToken(this.#hashToken(rawRefreshToken), 'logout')
  }

  /* ── Logout all devices ──────────────────────────── */
  async logoutAll(userId: string): Promise<void> {
    await this.tokenRepo.revokeAllForUser(userId, 'logout')
    logger.info({ userId }, 'All sessions revoked')
  }

  /* ── List active sessions for the current user ─────
       Marks the session matching the supplied refresh token
       as `isCurrent: true` so the UI can label it. */
  async listSessions(userId: string, currentRefreshToken?: string) {
    const sessions = await this.tokenRepo.listActiveForUser(userId)
    const currentHash = currentRefreshToken ? this.#hashToken(currentRefreshToken) : null
    return sessions.map(s => ({
      id:         s.id,
      userAgent:  s.userAgent,
      ip:         s.ip,
      lastUsedAt: s.lastUsedAt,
      createdAt:  s.createdAt,
      expiresAt:  s.expiresAt,
      isCurrent:  currentHash !== null && s.tokenHash === currentHash,
    }))
  }

  /* ── Deactivate account (soft) ───────────────────────
       Sets isActive=false and revokes every session. The
       user record stays so an admin can reactivate. */
  async deactivateAccount(userId: string, currentPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    /* Re-auth: even logged in, require the current password */
    await this.#verifyCurrentPassword(userId, currentPassword)

    await this.userRepo.updateById(userId, { isActive: false })
    await this.tokenRepo.revokeAllForUser(userId, 'security')
    logger.info({ userId }, 'account deactivated')
  }

  /* ── Hard-delete account (GDPR) ───────────────────────
       Removes the user document, refresh tokens, auth
       tokens, and best-effort cascades to user-owned
       data. Enrollment + lesson progress are kept but
       repointed (orphaned) for analytics integrity —
       PII has been removed. */
  async deleteAccount(userId: string, currentPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    await this.#verifyCurrentPassword(userId, currentPassword)

    /* Cascade the user-attached personal records first.
       We import lazily here to avoid a circular import at module load. */
    const { ReviewModel, EnrollmentModel, LessonProgressModel, AuthTokenModel } =
      await import('@/models/schema.ts')
    await Promise.all([
      this.tokenRepo.revokeAllForUser(userId, 'security'),
      AuthTokenModel.deleteMany({ userId }).exec(),
      ReviewModel.deleteMany({ userId }).exec(),
      EnrollmentModel.deleteMany({ userId }).exec(),
      LessonProgressModel.deleteMany({ userId }).exec(),
    ])
    await this.userRepo.hardDelete(userId)
    logger.info({ userId }, 'account hard-deleted')
  }

  /* Internal: verify the supplied current password matches.
     Used as a re-auth gate before destructive actions. */
  async #verifyCurrentPassword(userId: string, password: string): Promise<void> {
    /* findById doesn't return passwordHash (select:false); pull via email. */
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    const withHash = await this.userRepo.findByEmail(user.email)
    if (!withHash || !withHash.passwordHash) {
      throw new AuthError('PASSWORD_REQUIRED', 'Password confirmation is required.', 400)
    }
    const ok = await comparePassword(password, withHash.passwordHash)
    if (!ok) throw new AuthError('INVALID_PASSWORD', 'Password did not match.', 401)
  }

  /* ── Revoke a specific session (user action) ─────── */
  async revokeSession(userId: string, sessionId: string, currentRefreshToken?: string): Promise<{ revokedCurrent: boolean }> {
    if (!/^[a-fA-F0-9]{24}$/.test(sessionId)) {
      throw new AuthError('INVALID_SESSION_ID', 'Invalid session id', 400)
    }
    const session = await this.tokenRepo.findOwn(sessionId, userId)
    if (!session) {
      throw new AuthError('SESSION_NOT_FOUND', 'Session not found.', 404)
    }
    await this.tokenRepo.revokeById(sessionId, 'user')
    const currentHash = currentRefreshToken ? this.#hashToken(currentRefreshToken) : null
    const revokedCurrent = currentHash !== null && session.tokenHash === currentHash
    logger.info({ userId, sessionId, revokedCurrent }, 'session revoked by user')
    return { revokedCurrent }
  }

  /* ── Get authenticated user ──────────────────────── */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    return toSafeUser(user)
  }

  /* ── Update own profile (whitelisted fields) ─────── */
  async updateMe(
    userId: string,
    input: Partial<{
      name:       string
      headline:   string
      bio:        string
      avatarUrl:  string
      websiteUrl: string
    }>,
  ): Promise<SafeUser> {
    const data: Record<string, unknown> = {}
    if (input.name       !== undefined) data['name']       = input.name.trim()
    if (input.headline   !== undefined) data['headline']   = input.headline
    if (input.bio        !== undefined) data['bio']        = input.bio
    if (input.avatarUrl  !== undefined) data['avatarUrl']  = input.avatarUrl
    if (input.websiteUrl !== undefined) data['websiteUrl'] = input.websiteUrl

    const updated = await this.userRepo.updateById(userId, data)
    if (!updated) throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    return toSafeUser(updated)
  }

  /* ── Update enrollment document URLs after upload ── */
  async updateEnrollmentDocs(
    userId: string,
    input: { passportUrl?: string; idDocUrl?: string; photoUrl?: string },
  ): Promise<SafeUser> {
    const { UserModel } = await import('@/models/schema.ts')
    const update: Record<string, unknown> = {}
    if (input.passportUrl !== undefined) update['enrollmentApplication.passportUrl'] = input.passportUrl
    if (input.idDocUrl    !== undefined) update['enrollmentApplication.idDocUrl']    = input.idDocUrl
    if (input.photoUrl    !== undefined) update['enrollmentApplication.photoUrl']    = input.photoUrl
    const updated = await UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true }).exec()
    if (!updated) throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    return toSafeUser(updated)
  }

  /* ── Change password (authenticated) ────────────── */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    /* Must opt-in to passwordHash (select: false on schema) */
    const { UserModel } = await import('@/models/schema.ts')
    const user = await UserModel.findById(userId).select('+passwordHash').exec()
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    if (!user.passwordHash) {
      throw new AuthError(
        'OAUTH_ACCOUNT',
        'This account uses social login. Use forgot-password to set a password.',
        400,
      )
    }
    const valid = await comparePassword(currentPassword, user.passwordHash)
    if (!valid) {
      throw new AuthError('WRONG_PASSWORD', 'Current password is incorrect.', 401)
    }
    const newHash = await hashPassword(newPassword)
    await this.userRepo.updatePasswordHash(userId, newHash)
    logger.info({ userId }, 'password changed')
  }

  /* ── Forgot password ────────────────────────────── */
  async forgotPassword(email: string): Promise<void> {
    /* Always succeed visibly (don't leak account existence).
       Only do work when an active account is found. */
    const user = await this.userRepo.findOne({ email: email.toLowerCase().trim() })
    if (!user || !user.isActive) {
      logger.debug({ email }, 'forgot-password: no active account, silently skipping')
      return
    }
    const { raw } = await this.#issueAuthToken(user.id, 'reset-password', 60 * 60 * 1000)
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${raw}`
    await sendPasswordReset(user.email, user.name, resetUrl)
    logger.info({ userId: user.id }, 'password-reset email sent')
  }

  /* ── Reset password (token-based) ────────────────── */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.#hashToken(rawToken)
    const claimed   = await this.authTokenRepo.claim(tokenHash, 'reset-password')
    if (!claimed) {
      throw new AuthError('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.', 400)
    }
    const passwordHash = await hashPassword(newPassword)
    await this.userRepo.updatePasswordHash(claimed.userId.toString(), passwordHash)
    /* Revoke all live sessions for safety. */
    await this.tokenRepo.revokeAllForUser(claimed.userId.toString(), 'security')
    logger.info({ userId: claimed.userId }, 'password reset')
  }

  /* ── Verify email ────────────────────────────────── */
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.#hashToken(rawToken)
    const claimed   = await this.authTokenRepo.claim(tokenHash, 'verify-email')
    if (!claimed) {
      throw new AuthError('INVALID_VERIFY_TOKEN', 'This verification link is invalid or has expired.', 400)
    }
    await this.userRepo.setVerified(claimed.userId.toString())
    logger.info({ userId: claimed.userId }, 'email verified')
  }

  /* ── Resend verification email ───────────────────── */
  async resendVerification(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    if (user.isVerified) {
      throw new AuthError('ALREADY_VERIFIED', 'This account is already verified.', 400)
    }
    await this.#sendVerificationEmail(user.id, user.email, user.name)
  }

  /* ── Issue + persist token pair ──────────────────── */
  async #issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    const pair = await generateTokenPair({ id: userId, email, role })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await this.tokenRepo.saveToken({
      userId,
      tokenHash: this.#hashToken(pair.refresh_token),
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 500),
      ip:        meta?.ip,
    })

    return pair
  }

  /* ── SHA-256 hash a token string ─────────────────── */
  #hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /* ── Generate a one-time auth token (reset / verify) ─
       Returns the raw token for emailing AND persists
       only the hash to the DB. */
  async #issueAuthToken(
    userId: string,
    purpose: 'reset-password' | 'verify-email',
    ttlMs: number,
  ): Promise<{ raw: string }> {
    /* Invalidate any outstanding tokens for this purpose so the most
       recent email is always the only working link. */
    await this.authTokenRepo.invalidateForUser(userId, purpose)

    const raw       = randomBytes(32).toString('hex')
    const tokenHash = this.#hashToken(raw)
    const expiresAt = new Date(Date.now() + ttlMs)
    await this.authTokenRepo.create_({ userId, tokenHash, purpose, expiresAt })
    return { raw }
  }

  /* ── Send a verification email for a user ────────── */
  async #sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
    const { raw } = await this.#issueAuthToken(userId, 'verify-email', 24 * 60 * 60 * 1000)
    const url = `${env.CLIENT_URL}/verify-email?token=${raw}`
    await sendVerifyEmail(email, name, url)
  }

  /* ── Notify all admins of a new student signup ────── */
  async #notifyAllAdmins(studentName: string, studentEmail: string): Promise<void> {
    const { UserModel } = await import('@/models/schema.ts')
    const admins = await UserModel.find({
      role: { $in: ['super_admin', 'admin', '4x_admin', 'digital_marketing_admin', 'ai_admin'] },
      isActive: true,
    }).select('name email').lean()
    await Promise.allSettled(
      admins.map(a =>
        sendVerifyEmail(
          a['email'] as string,
          a['name'] as string,
          `${env.CLIENT_URL}/admin/enrollment-requests`,
        ).catch(() => undefined),
      ),
    )
    logger.info({ studentEmail, adminCount: admins.length }, 'Admin enrollment notifications sent')
  }
}
