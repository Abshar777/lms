import type { Request } from 'express'

/* ─────────────────────────────────────────────────────
   Express augmentation — req.user populated by auth middleware
───────────────────────────────────────────────────── */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

/* ─────────────────────────────────────────────────────
   Domain enums
───────────────────────────────────────────────────── */
export type UserRole = 'student' | 'instructor' | 'admin'

export type EnrollmentStatus = 'active' | 'completed' | 'dropped'

export type CourseStatus = 'draft' | 'published' | 'archived'

export type LessonType = 'video' | 'article' | 'quiz'

/* ─────────────────────────────────────────────────────
   API Response shape
───────────────────────────────────────────────────── */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
  meta?: PaginationMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginationMeta {
  total_count: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/* ─────────────────────────────────────────────────────
   Pagination query params
───────────────────────────────────────────────────── */
export interface PaginationParams {
  page: number
  per_page: number
  offset: number
}

/* ─────────────────────────────────────────────────────
   JWT payloads
───────────────────────────────────────────────────── */
export interface AccessTokenPayload {
  sub: string       // user id
  email: string
  role: UserRole
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
}

/* ─────────────────────────────────────────────────────
   Auth DTOs
───────────────────────────────────────────────────── */
export interface RegisterDto {
  name: string
  email: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}
