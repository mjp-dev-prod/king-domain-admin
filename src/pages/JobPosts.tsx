import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type JobPostDetail, type JobPostRow, type PostReason } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueList } from '@/lib/useQueueList'
import { useQueueTarget } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/forms/NativeSelect'
import { Money } from '@/components/kd/Money'
import { PageHeader } from '@/components/kd/PageHeader'
import { QueueRow } from '@/components/kd/QueueRow'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Sentry } from '@/lib/sentry'

const TYPE_LABEL: Record<string, string> = { oneDelivery: 'One delivery', milestones: 'Milestones', monthly: 'Monthly', hourly: 'Hourly' }

export function JobPosts() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'safety')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const queue = useQueueList<JobPostRow>(() => api.jobPosts().then((r) => r.posts), 'job-posts')
  const target = useQueueTarget('job-post')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title="Job posts"
        description="A new client's first post, or one that asks for money outside the app, waits here until a person reads it."
        actions={
          <Button variant="ghost" size="icon" onClick={queue.reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      {queue.failed && <ErrorState message="Couldn't load the list." onRetry={queue.reload} />}
      {!queue.failed && queue.rows === null && <LoadingList rows={3} />}
      {!queue.failed && queue.rows?.length === 0 && (
        <EmptyState icon={FileText} title="Nothing waiting">
          New posts that need a look appear here.
        </EmptyState>
      )}
      <div className="space-y-2">
        {queue.rows?.map((r) => (
          <QueueRow
            key={r.id}
            to={`/job-posts/${r.id}`}
            name={r.title}
            skill={r.skillLabel}
            since={r.createdAt}
            targetMinutes={target}
            fallbackIcon={FileText}
            flags={
              <>
                <Money amount={r.budget} currency={r.currency} className="text-sm" />
                <StatusPill>{TYPE_LABEL[r.jobType] ?? r.jobType}</StatusPill>
                <span className="text-xs text-text-2">{r.client.fullName}</span>
                {r.flags.length > 0 && (
                  <StatusPill tone="bad" icon={<AlertTriangle />}>
                    {r.flags.length} flagged
                  </StatusPill>
                )}
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<JobPostDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
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
  }, [id, attempt])

  const retry = useCallback(() => {
    setData(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

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

  const back = (label: string) => (
    <Link to="/job-posts" className="inline-flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {back('Back')}
        <ErrorState message="Couldn't open this post. It may have been removed." onRetry={retry} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const { post, clientRecord: rec } = data
  const open = post.status === 'screening'

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {back('All posts')}

      <PageHeader
        title={post.title}
        description={
          <>
            {post.skillLabel} · {TYPE_LABEL[post.jobType] ?? post.jobType} · {post.visibility === 'invite' ? 'Invite only' : 'Public'}
            {post.deliveryDays ? ` · ${post.deliveryDays} days` : ''}
          </>
        }
        actions={<Money amount={post.budget} currency={post.currency} className="text-xl" />}
      />

      <Card className="p-5">
        <p className="text-sm whitespace-pre-wrap">{post.description}</p>
      </Card>

      {post.flags.length > 0 && (
        <Card tone="bad" className="flex-row gap-3 p-4 text-sm" role="alert">
          <AlertTriangle className="size-5 shrink-0 text-bad" />
          <div className="space-y-1">
            <p className="font-semibold text-bad">The detector flagged:</p>
            {post.flags.map((f) => (
              <p key={f.code}>
                {f.label}: <span className="font-mono">"{f.match}"</span>
              </p>
            ))}
            <p className="text-text-2">It only flags. You decide.</p>
          </div>
        </Card>
      )}

      <Card className="gap-2 p-5 text-sm">
        <p className="font-semibold">The brief</p>
        {post.briefLines
          ? post.briefLines.map((l) => (
              <p key={l.key}>
                <span className="text-text-2">{l.label}: </span>
                {l.value}
              </p>
            ))
          : Object.entries(post.brief ?? {}).map(([k, v]) => (
              <p key={k}>
                <span className="text-text-2">{k}: </span>
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </p>
            ))}
        {post.screeningQuestions.length > 0 && (
          <>
            <p className="pt-2 font-semibold">Screening questions</p>
            {post.screeningQuestions.map((q) => (
              <p key={q}>{q}</p>
            ))}
          </>
        )}
      </Card>

      <Card className="gap-2 p-5 text-sm">
        <p className="font-semibold">The client</p>
        <p>
          {post.client.fullName} · {post.client.email}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {rec.identityVerified ? <StatusPill tone="ok">Identity verified</StatusPill> : <StatusPill tone="warn">Identity NOT verified</StatusPill>}
          <span className="text-text-2">
            {rec.memberSince ? `member since ${new Date(rec.memberSince).toLocaleDateString()} · ` : ''}
            {rec.jobsPosted} posted · {rec.jobsHired} hired · {rec.jobsCompleted} completed
          </span>
        </div>
      </Card>

      {!open ? (
        <Card tone="ok" className="flex-row items-center gap-2 p-4 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-ok" />
          This one has already been handled.
        </Card>
      ) : (
        <>
          <Card className="gap-3 p-5">
            <p className="font-semibold">Put it live</p>
            <Button glow className="w-fit" onClick={() => run('approve')} disabled={busy !== null}>
              {busy === 'approve' && <Loader2 className="animate-spin" />} Approve
            </Button>
          </Card>
          <Card className="gap-3 p-5">
            <p className="font-semibold">Send it back</p>
            <div className="space-y-1.5">
              <Label htmlFor="why">Reason (the client sees this)</Label>
              <NativeSelect id="why" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                <option value="">Choose a reason</option>
                {reasons.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note {reasonCode === 'other' ? '(required)' : '(optional)'}</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button
              variant="secondary"
              className="w-fit"
              onClick={() => run('reject')}
              disabled={!reasonCode || (reasonCode === 'other' && note.trim().length < 10) || busy !== null}
            >
              {busy === 'reject' && <Loader2 className="animate-spin" />} Send back
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}
