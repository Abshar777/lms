import axios from 'axios'

/**
 * Admin API client.
 * Base URL: /api/v1  — proxied to the backend via next.config.ts rewrites.
 * This keeps all requests same-origin so httpOnly cookies work without any
 * CORS or SameSite friction.
 */
export const api = axios.create({
  baseURL:         '/api/v1',
  withCredentials: true,
  timeout:         15_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Response interceptor — 401 → redirect to login ─── */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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
