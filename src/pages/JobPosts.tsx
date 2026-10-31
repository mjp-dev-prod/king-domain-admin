import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, FileText, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type JobPostDetail, type JobPostRow, type PostReason } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Sentry } from '@/lib/sentry'

const TYPE_LABEL: Record<string, string> = { oneDelivery: 'One delivery', milestones: 'Milestones', monthly: 'Monthly', hourly: 'Hourly' }

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

const money = (currency: string, amount: string | number) => `${currency === 'USD' ? '$' : '₦'}${Number(amount).toLocaleString()}`

export function JobPosts() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'safety')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [rows, setRows] = useState<JobPostRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .jobPosts()
      .then((r) => {
        if (cancelled) return
        setRows(r.posts)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'job-posts', request: 'list' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setRows(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Job posts</h1>
          <p className="text-sm text-muted-foreground">A new client's first post, or one that asks for money outside the app, waits here until a person reads it.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the list.</p>
          <Button size="sm" onClick={reload}>Retry</Button>
        </Card>
      )}
      {!failed && rows === null && [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      {!failed && rows?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <FileText className="size-6 text-muted-foreground" />
          <p className="font-medium">Nothing waiting</p>
          <p className="text-sm text-muted-foreground">New posts that need a look appear here.</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/job-posts/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.title}</p>
              <Badge variant="outline">{money(r.currency, r.budget)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {r.client.fullName} · {r.skillLabel} · {TYPE_LABEL[r.jobType] ?? r.jobType} · {waiting(r.createdAt)}
              {r.flags.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-3" /> {r.flags.length} flagged</span>
              )}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<JobPostDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [reasons, setReasons] = useState<PostReason[]>([])
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .jobPost(id)
      .then((r) => {
        if (cancelled) return
        setData(r)
        setReasons(r.reasons)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'job-posts', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function run(kind: 'approve' | 'reject') {
    setBusy(kind)
    try {
      if (kind === 'approve') await api.approveJobPost(id)
      else await api.rejectJobPost(id, { reasonCode, note: note.trim() || undefined })
      toast.success(kind === 'approve' ? 'Live' : 'Sent back with the reason')
      navigate('/job-posts')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/job-posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this post. It may have been removed.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { post, clientRecord: rec } = data
  const open = post.status === 'screening'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/job-posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All posts</Link>

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">{post.title}</p>
          <Badge variant="outline">{money(post.currency, post.budget)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{post.skillLabel} · {TYPE_LABEL[post.jobType] ?? post.jobType} · {post.visibility === 'invite' ? 'Invite only' : 'Public'}{post.deliveryDays ? ` · ${post.deliveryDays} days` : ''}</p>
        <p className="text-sm">{post.description}</p>
      </Card>

      {post.flags.length > 0 && (
        <Card className="flex gap-3 border-destructive/50 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium">The detector flagged:</p>
            {post.flags.map((f) => (
              <p key={f.code}>{f.label}: <span className="font-mono">"{f.match}"</span></p>
            ))}
            <p className="text-muted-foreground">It only flags. You decide.</p>
          </div>
        </Card>
      )}

      <Card className="space-y-2 p-4 text-sm">
        <p className="font-medium">The brief</p>
        {Object.entries(post.brief ?? {}).map(([k, v]) => (
          <p key={k}><span className="text-muted-foreground">{k}: </span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
        ))}
        {post.screeningQuestions.length > 0 && (
          <>
            <p className="pt-2 font-medium">Screening questions</p>
            {post.screeningQuestions.map((q) => <p key={q}>{q}</p>)}
          </>
        )}
      </Card>

      <Card className="space-y-1 p-4 text-sm">
        <p className="font-medium">The client</p>
        <p>{post.client.fullName} · {post.client.email}</p>
        <p className="text-muted-foreground">
          {rec.identityVerified ? 'Identity verified' : 'Identity NOT verified'}
          {rec.memberSince ? ` · member since ${new Date(rec.memberSince).toLocaleDateString()}` : ''} · {rec.jobsPosted} posted · {rec.jobsHired} hired · {rec.jobsCompleted} completed
        </p>
      </Card>

      {!open ? (
        <Card className="p-4 text-sm">This one has already been handled.</Card>
      ) : (
        <>
          <Card className="space-y-3 p-4">
            <p className="font-medium">Put it live</p>
            <Button onClick={() => run('approve')} disabled={busy !== null}>
              {busy === 'approve' && <Loader2 className="animate-spin" />} Approve
            </Button>
          </Card>
          <Card className="space-y-3 p-4">
            <p className="font-medium">Send it back</p>
            <div className="space-y-1">
              <Label htmlFor="why">Reason (the client sees this)</Label>
              <select id="why" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                <option value="">Choose a reason</option>
                {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="note">Note {reasonCode === 'other' ? '(required)' : '(optional)'}</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => run('reject')} disabled={!reasonCode || (reasonCode === 'other' && note.trim().length < 10) || busy !== null}>
              {busy === 'reject' && <Loader2 className="animate-spin" />} Send back
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}
