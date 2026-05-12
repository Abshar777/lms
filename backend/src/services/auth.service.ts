import { createHash } from 'crypto'
import { UserRepository, RefreshTokenRepository } from '@/repositories/user.repository.ts'
import { hashPassword, comparePassword } from '@/utils/hash.ts'
import { generateTokenPair, verifyRefreshToken } from '@/utils/jwt.ts'
import { logger } from '@/utils/logger.ts'
import type { RegisterDto, LoginDto, TokenPair } from '@/types/index.ts'
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
  private readonly userRepo  = new UserRepository()
  private readonly tokenRepo = new RefreshTokenRepository()

  /* ── Register ────────────────────────────────────── */
  async register(dto: RegisterDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    /* 1. Ensure email is unique */
    const exists = await this.userRepo.emailExists(dto.email)
    if (exists) {
      throw new AuthError('EMAIL_TAKEN', 'An account with this email already exists.', 409)
    }

    /* 2. Hash password */
    const passwordHash = await hashPassword(dto.password)

    /* 3. Create user */
    const user = await this.userRepo.createUser({
      name:         dto.name.trim(),
      email:        dto.email,
      passwordHash,
      role:         'student',
    })

    /* 4. Issue tokens */
    const tokens = await this.#issueTokens(user.id, user.email, user.role)

    logger.info({ userId: user.id }, 'User registered')
    return { user: toSafeUser(user), tokens }
  }

  /* ── Login ───────────────────────────────────────── */
  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    /* 1. Find user (includes passwordHash via select:+passwordHash) */
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user || !user.isActive) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    /* 2. Block OAuth-only accounts from password login */
    if (!user.passwordHash) {
      throw new AuthError(
        'OAUTH_ACCOUNT',
        'This account uses social login. Please sign in with Google.',
        400,
      )
    }

    /* 3. Verify password */
    const valid = await comparePassword(dto.password, user.passwordHash)
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    /* 4. Update last login (fire-and-forget) */
    void this.userRepo.touchLastLogin(user.id)

    /* 5. Issue tokens */
    const tokens = await this.#issueTokens(user.id, user.email, user.role)

    logger.info({ userId: user.id }, 'User logged in')
    return { user: toSafeUser(user), tokens }
  }

  /* ── Refresh ─────────────────────────────────────── */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    /* 1. Verify JWT */
    let payload
    try {
      payload = await verifyRefreshToken(rawRefreshToken)
    } catch {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401)
    }

    /* 2. Verify token exists in DB and is not revoked */
    const tokenHash = this.#hashToken(rawRefreshToken)
    const stored    = await this.tokenRepo.findValid(tokenHash)

    if (!stored) {
      /* Possible reuse attack — nuke all sessions for this user */
      await this.tokenRepo.revokeAllForUser(payload.sub!)
      logger.warn({ userId: payload.sub }, 'Refresh token reuse detected — all sessions revoked')
      throw new AuthError('TOKEN_REUSE', 'Security alert: session invalidated.', 401)
    }

    /* 3. Rotate — revoke old token */
    await this.tokenRepo.revokeToken(tokenHash)

    /* 4. Load fresh user */
    const user = await this.userRepo.findById(payload.sub!)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found or deactivated.', 401)
    }

    /* 5. Issue new pair */
    const tokens = await this.#issueTokens(user.id, user.email, user.role)
    logger.debug({ userId: user.id }, 'Tokens rotated')
    return tokens
  }

  /* ── Logout ──────────────────────────────────────── */
  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokenRepo.revokeToken(this.#hashToken(rawRefreshToken))
  }

  /* ── Logout all devices ──────────────────────────── */
  async logoutAll(userId: string): Promise<void> {
    await this.tokenRepo.revokeAllForUser(userId)
    logger.info({ userId }, 'All sessions revoked')
  }

  /* ── Get authenticated user ──────────────────────── */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId)
    if (!user || !user.isActive) {
      throw new AuthError('USER_NOT_FOUND', 'Account not found.', 404)
    }
    return toSafeUser(user)
  }

  /* ── Issue + persist token pair ──────────────────── */
  async #issueTokens(
    userId: string,
    email: string,
    role: 'student' | 'instructor' | 'admin',
  ): Promise<TokenPair> {
    const pair = await generateTokenPair({ id: userId, email, role })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await this.tokenRepo.saveToken({
      userId,
      tokenHash: this.#hashToken(pair.refresh_token),
      expiresAt,
    })

    return pair
  }

  /* ── SHA-256 hash a token string ─────────────────── */
  #hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
