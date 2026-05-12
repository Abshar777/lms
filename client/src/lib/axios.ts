import axios from 'axios'

/**
 * Main API client.
 * Base URL: /api/v1  (proxied to backend via next.config.ts rewrites)
 * Credentials: 'include' so session cookies are sent automatically.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Request interceptor ─────────────────────────── */
api.interceptors.request.use(config => {
  // Attach Bearer token if stored (for when we wire NextAuth JWT)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('learnos_access_token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

/* ── Response interceptor ───────────────────────── */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Clear auth state and send to login
      document.cookie = 'learnos_auth=; path=/; max-age=0'
      localStorage.removeItem('learnos_access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

/* ── Typed helper — unwraps { success, data } envelope ── */
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
