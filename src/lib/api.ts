import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export type AdminRole = 'owner' | 'admin'
export type AdminStatus = 'invited' | 'active' | 'revoked'
export type WaitlistRole = 'talent' | 'client'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: AdminRole
  status: AdminStatus
  lastLoginAt: string | null
  createdAt: string
}

export type WaitlistEntry = {
  id: string
  email: string
  role: WaitlistRole
  categories: string[]
  note: string | null
  joinedAt: string
}

export type DecisionStatus = 'open' | 'closed'
export type Stance = 'agree' | 'disagree' | 'need_discussion'

export type DecisionAdmin = { id: string; name: string | null; email: string }

export type DecisionStanceEntry = { user: DecisionAdmin; stance: Stance; updatedAt: string }
export type DecisionCommentEntry = {
  id: string
  body: string
  user: DecisionAdmin
  createdAt: string
}

export type DecisionSummary = {
  id: string
  title: string
  description: string
  milestoneRef: string | null
  status: DecisionStatus
  createdBy: DecisionAdmin
  createdAt: string
  closedAt: string | null
  closedBy: DecisionAdmin | null
  stanceCounts: Record<Stance, number>
  stances: DecisionStanceEntry[]
}

export type Decision = DecisionSummary & { comments: DecisionCommentEntry[] }

export type Stats = {
  total: number
  talent: number
  client: number
  withNote: number
  categories: { category: string; total: number; talent: number; client: number }[]
  daily: { date: string; count: number }[]
}

export type AppReleaseStatus = 'draft' | 'published'

export type AppReleaseChangelog = {
  highlights: string[]
  improvements: string[]
  fixes: string[]
}

export type AppRelease = {
  id: string
  version: string
  apkUrl: string | null
  changelog: AppReleaseChangelog | null
  status: AppReleaseStatus
  isLatest: boolean
  forceUpdate: boolean
  forceUpdateRequested: boolean
  minVersion: string
  createdAt: string
  publishedAt: string | null
  forceUpdateActivatedAt: string | null
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Auth moved off a cross-site session cookie — Safari/iOS's ITP was
// rejecting it in production (Render proxies through Cloudflare, which
// interfered with the exact SameSite=None; Secure attributes Safari
// requires), while every other browser tolerated the same cookie fine.
// The access token now travels as `Authorization: Bearer <token>` instead,
// which has no cross-site cookie policy to run afoul of.
let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError('Not signed in.', 401)

  const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    throw new ApiError('Session expired. Please sign in again.', 401)
  }

  const data = (await res.json()) as { accessToken: string }
  setTokens({ accessToken: data.accessToken })
  return data.accessToken
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const accessToken = getAccessToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Could not reach the server.', 0)
  }

  // A 401 on anything other than the auth endpoints themselves means the
  // access token expired (15min lifetime) — silently refresh once and
  // retry, rather than bouncing the admin to the login screen every 15
  // minutes. Concurrent requests share one in-flight refresh instead of
  // each independently hitting /auth/refresh.
  if (response.status === 401 && !isRetry && !path.startsWith('/admin/auth/')) {
    try {
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      await refreshing
      return request<T>(path, init, true)
    } catch {
      // Fall through to the normal error handling below with the original
      // 401 — refreshAccessToken already cleared tokens if it failed.
    }
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(data?.error ?? 'Something went wrong.', response.status)
  }

  return data as T
}

type AuthResponse = { user: AdminUser; accessToken: string; refreshToken: string; expiresIn: number }

export const api = {
  me: () => request<{ user: AdminUser }>('/admin/auth/me'),

  login: async (email: string, password: string) => {
    const result = await request<AuthResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setTokens(result)
    return result
  },

  logout: async () => {
    const refreshToken = getRefreshToken()
    await request<{ ok: true }>('/admin/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
    clearTokens()
  },

  checkInvite: (token: string) =>
    request<{ email: string; name: string | null }>(
      `/admin/auth/invite?token=${encodeURIComponent(token)}`,
    ),

  acceptInvite: async (token: string, password: string, name?: string) => {
    const result = await request<AuthResponse>('/admin/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password, name }),
    })
    setTokens(result)
    return result
  },

  forgotPassword: (email: string) =>
    request<{ ok: true; message: string }>('/admin/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  checkResetToken: (token: string) =>
    request<{ email: string }>(
      `/admin/auth/reset-password?token=${encodeURIComponent(token)}`,
    ),

  resetPassword: (token: string, password: string) =>
    request<{ ok: true }>('/admin/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  stats: () => request<Stats>('/admin/waitlist/stats'),

  notes: () =>
    request<{ notes: { id: string; note: string; role: WaitlistRole; joinedAt: string }[] }>(
      '/admin/waitlist/notes',
    ),

  entries: (params: { page?: number; search?: string; role?: string; category?: string }) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.search) query.set('search', params.search)
    if (params.role) query.set('role', params.role)
    if (params.category) query.set('category', params.category)
    return request<{
      entries: WaitlistEntry[]
      page: number
      pageSize: number
      total: number
      pages: number
    }>(`/admin/waitlist/entries?${query}`)
  },

  exportUrl: (params: { search?: string; role?: string; category?: string }) => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.role) query.set('role', params.role)
    if (params.category) query.set('category', params.category)
    return `${API_BASE}/admin/waitlist/export.csv?${query}`
  },

  admins: () => request<{ admins: AdminUser[] }>('/admin/admins'),

  invite: (email: string, name: string, role: AdminRole) =>
    request<{ admin: AdminUser; inviteUrl: string; expiresInHours: number }>(
      '/admin/admins/invite',
      { method: 'POST', body: JSON.stringify({ email, name, role }) },
    ),

  revoke: (id: string) =>
    request<{ ok: true }>(`/admin/admins/${id}/revoke`, { method: 'POST' }),

  decisions: (params: { page?: number; status?: string; milestoneRef?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.status) query.set('status', params.status)
    if (params.milestoneRef) query.set('milestoneRef', params.milestoneRef)
    return request<{
      decisions: DecisionSummary[]
      page: number
      pageSize: number
      total: number
      pages: number
    }>(`/admin/decisions?${query}`)
  },

  decision: (id: string) => request<{ decision: Decision }>(`/admin/decisions/${id}`),

  createDecision: (title: string, description: string, milestoneRef?: string) =>
    request<{ decision: Decision }>('/admin/decisions', {
      method: 'POST',
      body: JSON.stringify({ title, description, milestoneRef: milestoneRef || undefined }),
    }),

  castStance: (id: string, stance: Stance) =>
    request<{ decision: Decision }>(`/admin/decisions/${id}/stance`, {
      method: 'POST',
      body: JSON.stringify({ stance }),
    }),

  addComment: (id: string, body: string) =>
    request<{ decision: Decision }>(`/admin/decisions/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  closeDecision: (id: string) =>
    request<{ decision: Decision }>(`/admin/decisions/${id}/close`, { method: 'POST' }),

  reopenDecision: (id: string) =>
    request<{ decision: Decision }>(`/admin/decisions/${id}/reopen`, { method: 'POST' }),

  appReleases: () => request<{ releases: AppRelease[] }>('/admin/app-releases'),

  createAppRelease: (params: {
    version: string
    changelog: AppReleaseChangelog
    forceUpdate: boolean
    minVersion?: string
  }) =>
    request<{ release: AppRelease }>('/admin/app-releases', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  publishAppRelease: (id: string) =>
    request<{ release: AppRelease }>(`/admin/app-releases/${id}/publish`, { method: 'POST' }),

  activateForceUpdate: (id: string) =>
    request<{ release: AppRelease }>(`/admin/app-releases/${id}/activate-force-update`, {
      method: 'POST',
    }),

  deactivateForceUpdate: (id: string) =>
    request<{ release: AppRelease }>(`/admin/app-releases/${id}/deactivate-force-update`, {
      method: 'POST',
    }),

  deleteAppRelease: (id: string) =>
    request<{ ok: true }>(`/admin/app-releases/${id}`, { method: 'DELETE' }),
}
