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
// On 401: attempt silent token refresh once, then retry.
// Only redirect to /login if refresh itself fails.
let isRefreshing  = false
let refreshQueue: Array<(ok: boolean) => void> = []

function drainQueue(ok: boolean) {
  refreshQueue.forEach(fn => fn(ok))
  refreshQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    // Only intercept 401s that haven't already been retried
    if (err.response?.status !== 401 || original?._retry) {
      return Promise.reject(err)
    }

    if (typeof window === 'undefined') return Promise.reject(err)

    // Skip auth pages to avoid loops
    const path = window.location.pathname
    if (path === '/login' || path === '/register') return Promise.reject(err)

    original._retry = true

    if (isRefreshing) {
      // Queue this request until the in-flight refresh resolves
      return new Promise((resolve, reject) => {
        refreshQueue.push(ok => ok ? resolve(api(original)) : reject(err))
      })
    }

    isRefreshing = true
    try {
      await axios.post('/api/v1/auth/refresh', null, { withCredentials: true })
      isRefreshing = false
      drainQueue(true)
      return api(original)
    } catch {
      isRefreshing = false
      drainQueue(false)
      window.location.href = `/login?from=${encodeURIComponent(path)}`
      return Promise.reject(err)
    }
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
