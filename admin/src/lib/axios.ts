import axios from 'axios'
import { getSession } from 'next-auth/react'

/**
 * Resolve the API base URL from env. Forgiving:
 *   - Strips stray surrounding quotes (common .env mis-quoting).
 *   - Strips trailing slashes.
 *   - Appends /api/v1 if the user only gave a host.
 *   - Falls back to http://localhost:4000/api/v1.
 */
function resolveBase(raw: string | undefined): string {
  const fallback = 'http://localhost:4000/api/v1'
  if (!raw) return fallback
  let v = raw.trim().replace(/^["']/, '').replace(/["']$/, '').replace(/\/+$/, '')
  if (!v) return fallback
  if (!v.includes('/api/')) v = `${v}/api/v1`
  return v
}

const BASE = resolveBase(process.env.NEXT_PUBLIC_API_URL)

/**
 * Admin API client — calls the backend directly with the backend
 * access_token stored inside the NextAuth session JWT.
 * Auth: Authorization: Bearer <backendToken>
 */
export const api = axios.create({
  baseURL:         BASE,
  withCredentials: false,   // not using backend cookies — using Bearer token
  timeout:         15_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Request interceptor — inject backend token from NextAuth session ── */
api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.user?.backendToken) {
    config.headers['Authorization'] = `Bearer ${session.user.backendToken}`
  }
  return config
})

/* ── Response interceptor — 401 → sign out ─────────────────────────── */
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if (window.location.pathname !== '/login') {
        const { signOut } = await import('next-auth/react')
        await signOut({ redirect: true, callbackUrl: '/login' })
      }
    }
    return Promise.reject(err)
  },
)

/* ── Typed helpers ──────────────────────────────── */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<{ success: true; data: T }>(url, { params })
  return res.data.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<{ success: true; data: T }>(url, body)
  return res.data.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<{ success: true; data: T }>(url, body)
  return res.data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete<{ success: true; data: T }>(url)
  return res.data.data
}
