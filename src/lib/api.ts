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
/** A brief as the server words it: each answer under the question the form asked, old briefs included. */
export type BriefLine = { key: string; label: string; value: string }

export type SkillPiece = { id: string; title: string; brief: string; role: string; madeOn: string; liveLink: string; processLink?: string; files: SkillFile[] }
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

export type RiskFlag = { code: string; label: string; match: string }
export type PostReason = { code: string; label: string }
export type JobPostRow = { id: string; title: string; skillLabel: string; jobType: string; currency: string; budget: string; flags: RiskFlag[]; createdAt: string; client: { id: string; fullName: string; email: string } }
export type ClientRecord = { memberSince: string | null; identityVerified: boolean; clientKind: string | null; jobsPosted: number; jobsHired: number; jobsCompleted: number; paidOut: { currency: string; amount: number }[] }
export type JobPostDetail = {
  post: {
    id: string
    status: string
    title: string
    description: string
    skillLabel: string
    jobType: string
    currency: string
    budget: string
    deliveryDays: number | null
    visibility: string
    brief: Record<string, unknown> | null
    briefLines?: BriefLine[]
    screeningQuestions: string[]
    flags: RiskFlag[]
    createdAt: string
    client: { id: string; fullName: string; email: string }
  }
  clientRecord: ClientRecord
  reasons: PostReason[]
}

export type TalentFact = {
  id: string
  fullName: string
  headline: string | null
  verifiedSkills: { skillKey: string; label: string; verifiedAt: string | null }[]
  region: { country: string; state: string | null; city: string | null } | null
  education: { kind: string; school: string | null; detail: string | null } | null
  completedJobs: number
  newOnKingDomain: boolean
  lastActive: string
}
export type ShortlistRow = { id: string; status: string; skillLabel: string; client: string; clockStartedAt: string; sentAt: string | null; items: number; yes: number }
export type ShortlistDetail = {
  request: { id: string; status: string; skillKey: string; skillLabel: string; jobType: string; currency: string; budget: string; brief: Record<string, unknown>; briefLines?: BriefLine[]; note: string | null; clockStartedAt: string; sentAt: string | null; client: { id: string; fullName: string } }
  items: { id: string; reason: string; askedAt: string | null; available: boolean | null; talent: TalentFact }[]
  candidates: TalentFact[]
  limits: { min: number; max: number }
}

export type SafetyReportRow = { id: string; status: string; reason: string; createdAt: string; preview: string; liveContract: boolean }
export type SafetyReportDetail = {
  report: { id: string; status: string; reason: string; note: string | null; createdAt: string; handledNote: string | null; reportedBy: string; reported: string }
  messages: { id: string; from: string; kind: string; body: string; at: string; flagged: boolean; edited: boolean; originalBody: string | null }[]
  liveContract: boolean
}

export type StartProofRow = { contractId: string; jobTitle: string; skillKey: string | null; status: string; round: number; objection: { reasonCode: string; label: string; note: string; at: string } | null; budget: number; currency: string }
export type StartProofCaseField = { key: string; label: string; kind: string; min: number; max: number; items: { id: string; text: string | null; name: string | null; contentType: string | null; sizeBytes: number | null; url: string | null }[] }
export type StartProofDetail = {
  startProof: { contractId: string; status: string; round: number; submittedAt: string | null; objection: StartProofRow['objection']; upfrontAmount: number; currency: string; jobTitle: string; jobId: string }
  fields: StartProofCaseField[]
  checklist: { meetsFormat: boolean; missing: { key: string; label: string; problem: string }[] }
  parties: { client: { id: string; fullName: string; email: string }; talent: { id: string; fullName: string; email: string } | null }
}

export type DisputeRow = { id: string; jobTitle: string; budget: number; currency: string; problem: string; filedByRole: string; status: string; escalatedAt: string | null; rulingDueAt: string | null; awaitingApproval: boolean; outcome: { outcome: string; talentPercent: number } | null }
export type DisputePerson = { id: string; name: string; legalName: string | null; email: string; address: string | null; identityVerified: boolean; history: { filed: number; lost: number; lostAsFiler: number; flagged: boolean } | null } | null
export type DisputeCase = {
  dispute: { id: string; status: string; problem: string; problemLabel: string; rule: string | null; note: string; filedByRole: string; openedAt: string; escalatedAt: string | null; escalationReason: string | null; rulingDueAt: string | null; resolvedAt: string | null; resolution: { by: string; kind?: string; talentPercent?: number } | null }
  ruling: { outcome: string; talentPercent: number; reasons: string; talentAmount: number; clientRefund: number; status: string; decidedById: string; approvedById: string | null } | null
  money: { held: number; currency: string; upfrontPaid: number; price: number; fee: number; secondPersonAbove: number; needsSecondPerson: boolean; settlement: Record<string, unknown> | null }
  job: { id: string; title: string; description: string; skill: string | null; brief: Record<string, unknown> | null; briefLines?: BriefLine[]; deliveryDays: number | null; type: string }
  contract: { id: string; status: string; fundedAt: string | null; deliverByAt: string | null; changeRounds: number; extensionsUsed: number }
  parties: { client: DisputePerson; talent: DisputePerson }
  proposals: { id: string; by: string; kind: string; description: string; note: string; status: string; createdAt: string; answerDueAt: string }[]
  startProof: { status: string | null; objection: { label: string; note: string } | null; items: { field: string; text: string | null; name: string | null; contentType: string | null; url: string | null }[] }
  deliveries: { version: number; note: string | null; url: string | null; fileUrl: string | null; at: string }[]
  drafts: { note: string; at: string; files: { name: string; contentType: string; url: string | null }[] }[]
  changeRequests: { round: number; reason: string; at: string; resubmittedAt: string | null }[]
  extensions: { days: number; reason: string; status: string; at: string }[]
  conversation: { from: string; kind: string; body: string; at: string; attachment: string | null }[]
  timeline: { type: string; at: string }[]
}
export type ChargebackRow = { id: string; status: string; amount: number; dueAt: string | null; receivedAt: string; hasContract: boolean; resolution: string | null }
export type ChargebackCase = {
  chargeback: { id: string; status: string; amount: number; dueAt: string | null; receivedAt: string; reference: string | null; bin: string | null; last4: string | null; resolution: string | null; responseNote: string | null; clientRemovedAt: string | null }
  receipt: { lines: string[]; ready: boolean; missing: string[] }
  job: { id: string; title: string; status: string; paidOut: boolean } | null
  client: { name: string; email: string; identityVerified: boolean } | null
  talentPaid: boolean
}

export type ReviewReportRow = { id: string; status: string; reason: string; createdAt: string; direction: string; preview: string }
export type ReviewReportDetail = {
  report: { id: string; status: string; reason: string; reasonCode: string; note: string; handledNote: string | null; createdAt: string; reportedBy: string }
  review: { id: string; direction: string; answers: Record<string, string | boolean>; comment: string; reply: string | null; removedAt: string | null; removedReason: string | null; by: string; about: string }
  job: { title: string; skill: string; description: string } | null
  conversation: { fromAuthor: boolean; kind: string; body: string; at: string }[]
  reasons: { code: string; label: string }[]
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

  identityChecks: (status: IdentityStatus) =>
    request<{ checks: IdentityCheck[]; reasons: IdentityReason[] }>(`/admin/identity-checks?status=${status}`),

  identityCheck: (id: string) =>
    request<{ check: IdentityCheck; reasons: IdentityReason[] }>(`/admin/identity-checks/${id}`),

  identityCounts: () => request<Record<IdentityStatus, number>>('/admin/identity-checks/counts'),

  approveIdentity: (id: string, body: { legalName: string; dateOfBirth?: string }) =>
    request<{ ok: true }>(`/admin/identity-checks/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),

  identityNotYet: (id: string, body: { reasonCode: string; note?: string }) =>
    request<{ ok: true }>(`/admin/identity-checks/${id}/not-yet`, { method: 'POST', body: JSON.stringify(body) }),

  safetyReports: (status: 'open' | 'handled') => request<{ reports: SafetyReportRow[] }>(`/admin/safety-reports?status=${status}`),

  safetyReport: (id: string) => request<SafetyReportDetail>(`/admin/safety-reports/${id}`),

  handleSafetyReport: (id: string, body: { action: 'dismiss' | 'actioned'; note?: string }) =>
    request<{ ok: true }>(`/admin/safety-reports/${id}/handle`, { method: 'POST', body: JSON.stringify(body) }),

  startProofs: (status: 'open' | 'handled') => request<{ startProofs: StartProofRow[] }>(`/admin/start-proofs?status=${status}`),

  startProof: (contractId: string) => request<StartProofDetail>(`/admin/start-proofs/${contractId}`),

  resolveStartProof: (contractId: string, body: { decision: 'uphold' | 'dismiss'; note: string }) =>
    request<{ ok: true; status: string }>(`/admin/start-proofs/${contractId}/resolve`, { method: 'POST', body: JSON.stringify(body) }),

  disputes: (status: 'open' | 'handled') => request<{ disputes: DisputeRow[] }>(`/admin/disputes?status=${status}`),
  dispute: (id: string) => request<DisputeCase>(`/admin/disputes/${id}`),
  ruleDispute: (id: string, body: { outcome: 'release' | 'refund' | 'split'; talentPercent?: number; reasons: string }) =>
    request<{ ok: true; awaitingApproval: boolean }>(`/admin/disputes/${id}/rule`, { method: 'POST', body: JSON.stringify(body) }),
  approveRuling: (id: string) => request<{ ok: true }>(`/admin/disputes/${id}/approve`, { method: 'POST' }),
  sendBackRuling: (id: string, note: string) => request<{ ok: true }>(`/admin/disputes/${id}/send-back`, { method: 'POST', body: JSON.stringify({ note }) }),
  retryRuling: (id: string) => request<{ ok: true }>(`/admin/disputes/${id}/retry`, { method: 'POST' }),
  chargebacks: (status: 'open' | 'handled') => request<{ chargebacks: ChargebackRow[] }>(`/admin/chargebacks?status=${status}`),
  chargeback: (id: string) => request<ChargebackCase>(`/admin/chargebacks/${id}`),
  contestChargeback: (id: string, note: string) => request<{ ok: true }>(`/admin/chargebacks/${id}/respond`, { method: 'POST', body: JSON.stringify({ note }) }),
  acceptChargeback: (id: string, note: string) => request<{ ok: true }>(`/admin/chargebacks/${id}/accept`, { method: 'POST', body: JSON.stringify({ note }) }),

  reviewReports: (status: 'open' | 'handled') => request<{ reports: ReviewReportRow[] }>(`/admin/review-reports?status=${status}`),
  reviewReport: (id: string) => request<ReviewReportDetail>(`/admin/review-reports/${id}`),
  handleReviewReport: (id: string, body: { decision: 'remove' | 'keep'; reasonCode?: string; note: string }) =>
    request<{ ok: true }>(`/admin/review-reports/${id}/handle`, { method: 'POST', body: JSON.stringify(body) }),

  jobPosts: () => request<{ posts: JobPostRow[]; reasons: PostReason[] }>('/admin/job-posts'),

  jobPost: (id: string) => request<JobPostDetail>(`/admin/job-posts/${id}`),

  approveJobPost: (id: string) => request<{ ok: true }>(`/admin/job-posts/${id}/approve`, { method: 'POST' }),

  rejectJobPost: (id: string, body: { reasonCode: string; note?: string }) =>
    request<{ ok: true }>(`/admin/job-posts/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),

  shortlists: (status: 'waiting' | 'sent') => request<{ requests: ShortlistRow[] }>(`/admin/shortlists?status=${status}`),

  shortlist: (id: string) => request<ShortlistDetail>(`/admin/shortlists/${id}`),

  shortlistAsk: (id: string, body: { talentId: string; reason: string }) =>
    request<{ ok: true }>(`/admin/shortlists/${id}/items`, { method: 'POST', body: JSON.stringify(body) }),

  shortlistRemove: (id: string, itemId: string) => request<{ ok: true }>(`/admin/shortlists/${id}/items/${itemId}`, { method: 'DELETE' }),

  shortlistSend: (id: string) => request<{ ok: true }>(`/admin/shortlists/${id}/send`, { method: 'POST' }),

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

}
