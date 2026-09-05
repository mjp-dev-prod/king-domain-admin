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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Session lives in an httpOnly cookie on a different origin.
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Could not reach the server.', 0)
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(data?.error ?? 'Something went wrong.', response.status)
  }

  return data as T
}

export const api = {
  me: () => request<{ user: AdminUser }>('/admin/auth/me'),

  login: (email: string, password: string) =>
    request<{ user: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: true }>('/admin/auth/logout', { method: 'POST' }),

  checkInvite: (token: string) =>
    request<{ email: string; name: string | null }>(
      `/admin/auth/invite?token=${encodeURIComponent(token)}`,
    ),

  acceptInvite: (token: string, password: string, name?: string) =>
    request<{ user: AdminUser }>('/admin/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password, name }),
    }),

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
