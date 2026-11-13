import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock, Loader2, MessageSquareWarning, RefreshCw } from 'lucide-react'
import { api, ApiError, type ReviewReportDetail, type ReviewReportRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueTarget, waitLabel, waitTone } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { NativeSelect } from '@/components/forms/NativeSelect'
import { Textarea } from '@/components/forms/Textarea'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })

export function ReviewReports() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'safety')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'open' | 'handled'>('open')
  const [rows, setRows] = useState<ReviewReportRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const target = useQueueTarget('review-report')

  useEffect(() => {
    let cancelled = false
    api
      .reviewReports(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.reports)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'review-reports', request: 'list' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [status, attempt])

  const reload = useCallback(() => {
    setRows(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title="Reported reviews"
        description="A review comes down only for threats or abuse, personal information, not being about the work, or being used as leverage. Disagreeing with an honest review is what the reply is for."
        actions={
          <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      <FilterTabs
        label="Status"
        value={status}
        onChange={(v) => {
          setRows(null)
          setStatus(v)
        }}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'handled', label: 'Handled' },
        ]}
      />
      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={MessageSquareWarning} title={status === 'open' ? 'No reviews reported' : 'Nothing handled yet'}>
          Reports appear here as people send them.
        </EmptyState>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link key={r.id} to={`/review-reports/${r.id}`} className="block">
            <Card interactive className="gap-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{r.reason}</p>
                <StatusPill>{r.direction === 'client_to_talent' ? 'Client about talent' : 'Talent about client'}</StatusPill>
              </div>
              <p className="line-clamp-2 text-sm text-text-2">"{r.preview || 'No comment'}"</p>
              {r.status === 'open' ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                  <StatusPill tone={waitTone(r.createdAt, target)} icon={<Clock />}>
                    {waitLabel(r.createdAt)} waiting
                  </StatusPill>
                  <span>{when(r.createdAt)}</span>
                </div>
              ) : (
                <p className="text-xs text-text-2 capitalize">{r.status}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<ReviewReportDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'remove' | 'keep' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .reviewReport(id)
      .then((r) => {
        if (cancelled) return
        setData(r)
        setReasonCode(r.report.reasonCode)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'review-reports', request: 'detail' } })
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

  async function run(decision: 'remove' | 'keep') {
    setBusy(decision)
    try {
      await api.handleReviewReport(id, { decision, reasonCode: decision === 'remove' ? reasonCode : undefined, note: note.trim() })
      toast.success(decision === 'remove' ? 'Removed' : 'Kept')
      navigate('/review-reports')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const back = (label: string) => (
    <Link to="/review-reports" className="inline-flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3">
        {back('Back')}
        <ErrorState message="Couldn't open this report." onRetry={retry} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const { report, review, job, conversation, reasons } = data
  const open = report.status === 'open'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {back('All reports')}
      <PageHeader
        title={`Reported for: ${report.reason}`}
        description={
          <>
            Reported by {report.reportedBy}
            {report.note ? `: "${report.note}"` : ''}
            {job ? ` · ${job.skill} · ${job.title}` : ''}
          </>
        }
        actions={review.removedAt ? <StatusPill tone="bad">Already removed</StatusPill> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card className="gap-3 p-5">
            <Eyebrow>
              The review, by {review.by} about {review.about}
            </Eyebrow>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(review.answers).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-text-2">{k}</dt>
                  <dd>{typeof v === 'boolean' ? (v ? 'yes' : 'no') : v}</dd>
                </div>
              ))}
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-secondary p-3 text-sm">{review.comment || 'No comment.'}</p>
            {review.reply && (
              <p className="text-sm">
                <span className="text-text-2">Their reply:</span> {review.reply}
              </p>
            )}
          </Card>
          <Card className="gap-2 p-5">
            <p className="font-semibold">Their conversation (latest 20 messages)</p>
            <p className="text-xs text-text-2">Look for leverage: a good review promised for extra work, or a bad one threatened unless something is refunded.</p>
            {conversation.length === 0 && <p className="text-sm text-text-2">They never wrote to each other in the app.</p>}
            {conversation.map((m, i) => (
              <div key={i} className={cn('max-w-[85%] rounded-xl p-3 text-sm', m.fromAuthor ? 'ml-auto bg-surface-3' : 'mr-auto bg-secondary')}>
                <p className="text-xs text-text-2">
                  {m.fromAuthor ? 'The reviewer' : 'The other person'} · {when(m.at)}
                </p>
                <p className="whitespace-pre-wrap">{m.kind === 'text' || m.kind === 'agreement' ? m.body : `[${m.kind}]`}</p>
              </div>
            ))}
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4">
          {!open ? (
            <Card tone="ok" className="flex-row items-start gap-2 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
              <p>
                {report.status === 'removed' ? 'Removed.' : 'Kept.'} {report.handledNote}
              </p>
            </Card>
          ) : (
            <Card className="gap-3 p-5">
              <p className="font-semibold">Your decision</p>
              <div className="space-y-1.5">
                <Label htmlFor="reason">If removing, which rule it broke</Label>
                <NativeSelect id="reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                  {reasons.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">What you found (required)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
              </div>
              <Button className="w-full" variant="secondary" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('keep')}>
                {busy === 'keep' && <Loader2 className="animate-spin" />}It's an honest review: keep it
              </Button>
              <Button className="w-full" variant="destructive" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('remove')}>
                {busy === 'remove' && <Loader2 className="animate-spin" />}It broke the rule: remove it
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
