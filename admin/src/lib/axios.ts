import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

/**
 * Admin API client — calls the backend directly (no Next.js proxy needed for admin).
 */
export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Request interceptor ─────────────────────────── */
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('learnos_admin_token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

/* ── Response interceptor ───────────────────────── */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('learnos_admin_token')
      window.location.href = '/login'
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
