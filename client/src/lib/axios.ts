import axios from 'axios'

/**
 * Main API client.
 * Base URL: /api/v1  (proxied to backend via next.config.ts rewrites)
 * Auth: httpOnly cookies set by the backend — `withCredentials: true`
 * makes the browser attach them automatically.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ─── Response interceptor ───────────────────────── */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname
      // Avoid redirect loops on the auth pages themselves
      if (path !== '/login' && path !== '/register') {
        window.location.href = `/login?from=${encodeURIComponent(path)}`
      }
    }
    return Promise.reject(err)
  },
)

/* ─── Typed helper — unwraps { success, data } envelope ── */
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
