import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export type AdminRole = 'owner' | 'admin'
export type AdminStatus = 'invited' | 'active' | 'revoked'
export type WaitlistRole = 'talent' | 'client'
export type AdminCapability = 'reviewer' | 'checker' | 'safety' | 'disputes' | 'finance' | 'support' | 'shareholder'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: AdminRole
  status: AdminStatus
  capabilities: AdminCapability[]
  reviewerSkills: string[]
  lastLoginAt: string | null
  createdAt: string
}

export type StartProofField = { key: string; label: string; kind: 'files' | 'image' | 'video' | 'text' | 'link'; min: number; max: number }
export type Skill = { key: string; label: string; category: string; open: boolean; startProof: StartProofField[] }
export type SkillCategory = { key: string; label: string }

export type QueueSummary = {
  key: string
  label: string
  path: string
  capability: AdminCapability
  targetMinutes: number
  defaultWhenLate: string
  open: number
  overdue: number
  oldestWaitingMinutes: number | null
  p50Minutes: number | null
  p90Minutes: number | null
  sample: number
}

export type AuditEvent = {
  id: string
  action: string
  subjectType: string
  subjectId: string
  reasonCode: string | null
  note: string | null
  details: unknown
  actorRole: string
  createdAt: string
  actor: { id: string; name: string | null; email: string }
}

export type IdentityStatus = 'pending' | 'verified' | 'notYet'
export type IdentityReason = { code: string; label: string }
export type IdentityCheck = {
  id: string
  document: 'ninSlip' | 'passport' | 'cac'
  claimedName: string
  claimedDateOfBirth: string | null
  status: IdentityStatus
  legalName: string | null
  reasonCode: string | null
  note: string | null
  createdAt: string
  reviewedAt: string | null
  user: { id: string; fullName: string; email: string; role: string; clientKind: string | null }
  documentUrl: string | null
  videoUrl: string | null
}

export type SkillFile = { id: string; role: 'output' | 'working' | 'draft' | 'walkthrough'; pieceId: string | null; name: string; contentType: string; sizeBytes: number; url: string | null }
export type SkillPiece = { id: string; title: string; brief: string; role: string; madeOn: string; liveLink: string; files: SkillFile[] }
export type SkillWork = {
  id: string
  skillKey: string
  skillLabel: string
  status: string
  pieces: SkillPiece[]
  walkthrough: SkillFile[]
  declaration: { ownWork: boolean; aiUsed: boolean; aiNote: string | null }
}
export type AuthenticityRow = { id: string; skillKey: string; skillLabel: string; submittedAt: string; repeatOfRejected: boolean; person: { name: string } }
export type AuthenticityDetail = {
  submission: SkillWork & {
    submittedAt: string
    repeatOfRejected: boolean
    person: { id: string; name: string; email: string; region: string | null; education: { kind: string; school: string | null; detail: string | null } | null }
  }
  earlier: { id: string; status: string; submittedAt: string; resultReasons: { kind?: string; note?: string } | null }[]
  nextPenaltyMonths: number
  checklist: { key: string; label: string }[]
}
export type ReviewRow = { id: string; skillKey: string; skillLabel: string; waitingSince: string; reviewsSoFar: number; pieces: number; thirdOpinion: boolean }
export type Rubric = { draft: boolean; scale: { score: number; label: string }[]; lines: { key: string; label: string; looksLike: string }[] }
export type ReviewDetail = {
  submission: SkillWork
  rubric: Rubric
  myReview: { scores: Record<string, number>; verdict: 'pass' | 'notYet'; comment: string } | null
  thirdOpinion: boolean
}

export type OnCallShift ={ id: string; startsAt: string; endsAt: string; admin: { id: string; name: string | null; email: string } }
export type OpsAlert = { id: string; title: string; slackSent: boolean; emailedTo: string[] }

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

export type ProofStatus = 'pending' | 'verified'

export type ProofItem = {
  id: string
  category: string
  title: string
  /** Short-lived (5 min) signed URL to the private file; re-fetch the item when it expires. */
  fileUrl: string | null
  fileName: string | null
  status: ProofStatus
  reviewedById: string | null
  reviewedAt: string | null
  createdAt: string
  talent: {
    id: string
    fullName: string
    email: string
    headline: string
    bio: string
    skillCategories: string[]
  } | null
}

export type ProofCounts = { pending: number; verified: number }

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

// Endpoints that never carry (or can't use) an access token, so a 401 there is a
// real answer, not an expired session. /admin/auth/me and change-password
// are authenticated and DO need the silent refresh: without it, reloading
// the dashboard after the 15-minute access token expired signed the admin
// out even though their refresh token was still valid.
const NO_REFRESH_PATHS = [
  '/admin/auth/login',
  '/admin/auth/refresh',
  '/admin/auth/logout',
  '/admin/auth/invite',
  '/admin/auth/forgot-password',
  '/admin/auth/reset-password',
]

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

  // A 401 on anything other than the endpoints above means the
  // access token expired (15min lifetime) — silently refresh once and
  // retry, rather than bouncing the admin to the login screen every 15
  // minutes. Concurrent requests share one in-flight refresh instead of
  // each independently hitting /auth/refresh.
  if (response.status === 401 && !isRetry && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
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

  proofItems: (status: ProofStatus) =>
    request<{ proofItems: ProofItem[] }>(`/admin/proof-items?status=${status}`),

  proofItem: (id: string) => request<{ proofItem: ProofItem }>(`/admin/proof-items/${id}`),

  proofCounts: () => request<ProofCounts>('/admin/proof-items/counts'),

  identityChecks: (status: IdentityStatus) =>
    request<{ checks: IdentityCheck[]; reasons: IdentityReason[] }>(`/admin/identity-checks?status=${status}`),

  identityCheck: (id: string) =>
    request<{ check: IdentityCheck; reasons: IdentityReason[] }>(`/admin/identity-checks/${id}`),

  identityCounts: () => request<Record<IdentityStatus, number>>('/admin/identity-checks/counts'),

  approveIdentity: (id: string, body: { legalName: string; dateOfBirth?: string }) =>
    request<{ ok: true }>(`/admin/identity-checks/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),

  identityNotYet: (id: string, body: { reasonCode: string; note?: string }) =>
    request<{ ok: true }>(`/admin/identity-checks/${id}/not-yet`, { method: 'POST', body: JSON.stringify(body) }),

  authenticityList: () => request<{ submissions: AuthenticityRow[] }>('/admin/authenticity'),

  authenticityDetail: (id: string) => request<AuthenticityDetail>(`/admin/authenticity/${id}`),

  authenticityPass: (id: string, body: { checklist: Record<string, boolean>; note?: string }) =>
    request<{ ok: true }>(`/admin/authenticity/${id}/pass`, { method: 'POST', body: JSON.stringify(body) }),

  authenticityAct: (id: string, action: 'stop' | 'penalize' | 'ban', note: string) =>
    request<{ ok: true; months?: number }>(`/admin/authenticity/${id}/${action}`, { method: 'POST', body: JSON.stringify({ note }) }),

  skillReviews: () => request<{ submissions: ReviewRow[] }>('/admin/skill-reviews'),

  skillReview: (id: string) => request<ReviewDetail>(`/admin/skill-reviews/${id}`),

  submitSkillReview: (id: string, body: { scores: Record<string, number>; verdict: 'pass' | 'notYet'; comment: string }) =>
    request<{ ok: true; state: 'waiting' | 'needThird' | 'decided'; outcome: 'verified' | 'notYet' | null }>(`/admin/skill-reviews/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),

  skills: () => request<{ categories: SkillCategory[]; skills: Skill[] }>('/skills'),

  inbox: () => request<{ queues: QueueSummary[] }>('/admin/inbox'),

  setQueueTarget: (key: string, body: { targetMinutes: number; defaultWhenLate: string }) =>
    request<{ target: { queueKey: string; targetMinutes: number; defaultWhenLate: string } }>(
      `/admin/inbox/targets/${encodeURIComponent(key)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    ),

  audit: (params: { action?: string; subjectId?: string; actorId?: string; before?: string; limit?: number } = {}) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
    return request<{ events: AuditEvent[]; nextBefore: string | null }>(`/admin/audit?${q}`)
  },

  onCall: (from?: string) =>
    request<{ shifts: OnCallShift[] }>(`/admin/on-call${from ? `?from=${encodeURIComponent(from)}` : ''}`),

  addOnCall: (body: { adminId: string; startsAt: string; endsAt: string }) =>
    request<{ shift: { id: string } }>('/admin/on-call', { method: 'POST', body: JSON.stringify(body) }),

  removeOnCall: (id: string) => request<{ ok: true }>(`/admin/on-call/${id}`, { method: 'DELETE' }),

  setCapabilities: (id: string, body: { capabilities: AdminCapability[]; reviewerSkills: string[] }) =>
    request<{ admin: AdminUser }>(`/admin/admins/${id}/capabilities`, { method: 'PATCH', body: JSON.stringify(body) }),

  testAlert: () => request<{ alert: OpsAlert }>('/admin/alerts/test', { method: 'POST' }),

  approveProof: (id: string) =>
    request<{ proofItem: ProofItem }>(`/admin/proof-items/${id}/approve`, { method: 'POST' }),

  rejectProof: (id: string, reason: string) =>
    request<{ ok: true }>(`/admin/proof-items/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
}

/** Fired after a review decision so the navigation badge refreshes its count. */
export const PROOF_COUNTS_CHANGED = 'kd:proof-counts-changed'
