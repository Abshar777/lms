import type { Request, Response, NextFunction } from 'express'
import { AuthService } from '@/services/auth.service.ts'
import { sendSuccess } from '@/utils/response.ts'

/* ─────────────────────────────────────────────────────
   AuthController
   ─────────────────────────────────────────────────────
   Thin HTTP layer — no business logic here.
   Delegates everything to AuthService.
   Errors propagate to errorMiddleware via next(err).
───────────────────────────────────────────────────── */
export class AuthController {
  private readonly service = new AuthService()

  /* ── POST /auth/register ────────────────────────── */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, tokens } = await this.service.register(req.body)
      sendSuccess(res, { user, tokens }, 'Account created successfully', 201)
    } catch (err) {
      next(err)
    }
  }

  /* ── POST /auth/login ───────────────────────────── */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, tokens } = await this.service.login(req.body)
      sendSuccess(res, { user, tokens }, 'Signed in successfully')
    } catch (err) {
      next(err)
    }
  }

  /* ── POST /auth/refresh ─────────────────────────── */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken =
        req.body?.refresh_token ??
        req.headers['x-refresh-token'] as string

      if (!rawToken) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_REFRESH_TOKEN', message: 'refresh_token is required' },
        })
        return
      }

      const tokens = await this.service.refresh(rawToken)
      sendSuccess(res, { tokens }, 'Tokens refreshed')
    } catch (err) {
      next(err)
    }
  }

  /* ── POST /auth/logout ──────────────────────────── */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.body?.refresh_token
      if (rawToken) await this.service.logout(rawToken)
      sendSuccess(res, null, 'Signed out successfully')
    } catch (err) {
      next(err)
    }
  }

  /* ── POST /auth/logout-all ──────────────────────── */
  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.logoutAll(req.user!.id)
      sendSuccess(res, null, 'All sessions revoked')
    } catch (err) {
      next(err)
    }
  }

  /* ── GET /auth/me ───────────────────────────────── */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getMe(req.user!.id)
      sendSuccess(res, { user })
    } catch (err) {
      next(err)
    }
  }
}
