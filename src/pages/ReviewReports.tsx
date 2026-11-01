import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MessageSquareWarning, RefreshCw } from 'lucide-react'
import { api, ApiError, type ReviewReportDetail, type ReviewReportRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reported reviews</h1>
          <p className="text-sm text-muted-foreground">A review comes down only for threats or abuse, personal information, not being about the work, or being used as leverage. Disagreeing with an honest review is what the reply is for.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>
      <FilterTabs label="Status" value={status} onChange={(v) => { setRows(null); setStatus(v) }} options={[{ value: 'open', label: 'Open' }, { value: 'handled', label: 'Handled' }]} />
      {failed && <Card className="flex items-center justify-between gap-3 p-4"><p className="text-sm">Couldn't load the list.</p><Button size="sm" onClick={reload}>Retry</Button></Card>}
      {!failed && rows === null && [0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      {!failed && rows?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <MessageSquareWarning className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'open' ? 'No reviews reported' : 'Nothing handled yet'}</p>
          <p className="text-sm text-muted-foreground">Reports appear here as people send them.</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/review-reports/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.reason}</p>
              <Badge variant="outline">{r.direction === 'client_to_talent' ? 'Client about talent' : 'Talent about client'}</Badge>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">"{r.preview || 'No comment'}"</p>
            <p className="text-xs text-muted-foreground">{r.status === 'open' ? when(r.createdAt) : r.status}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<ReviewReportDetail | null>(null)
  const [failed, setFailed] = useState(false)
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
  }, [id])

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

  if (failed) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Link to="/review-reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link><Card className="p-4 text-sm">Couldn't open this report.</Card></div>
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { report, review, job, conversation, reasons } = data
  const open = report.status === 'open'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <Link to="/review-reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All reports</Link>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold">Reported for: {report.reason}</p>
              {review.removedAt && <Badge variant="destructive">Already removed</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">Reported by {report.reportedBy}{report.note ? `: "${report.note}"` : ''}</p>
            {job && <p className="text-sm text-muted-foreground">{job.skill} · {job.title}</p>}
          </Card>
          <Card className="space-y-3 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">The review, by {review.by} about {review.about}</p>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(review.answers).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{typeof v === 'boolean' ? (v ? 'yes' : 'no') : v}</dd></div>
              ))}
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm">{review.comment || 'No comment.'}</p>
            {review.reply && <p className="text-sm"><span className="text-muted-foreground">Their reply:</span> {review.reply}</p>}
          </Card>
          <Card className="space-y-2 p-4">
            <p className="font-medium">Their conversation (latest 20 messages)</p>
            <p className="text-xs text-muted-foreground">Look for leverage: a good review promised for extra work, or a bad one threatened unless something is refunded.</p>
            {conversation.length === 0 && <p className="text-sm text-muted-foreground">They never wrote to each other in the app.</p>}
            {conversation.map((m, i) => (
              <div key={i} className={cn('max-w-[85%] rounded-xl border p-3 text-sm', m.fromAuthor ? 'ml-auto bg-secondary/40' : 'mr-auto')}>
                <p className="text-xs text-muted-foreground">{m.fromAuthor ? 'The reviewer' : 'The other person'} · {when(m.at)}</p>
                <p className="whitespace-pre-wrap">{m.kind === 'text' || m.kind === 'agreement' ? m.body : `[${m.kind}]`}</p>
              </div>
            ))}
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4">
          {!open ? (
            <Card className="p-4 text-sm">{report.status === 'removed' ? 'Removed.' : 'Kept.'} {report.handledNote}</Card>
          ) : (
            <Card className="space-y-3 p-4">
              <p className="font-medium">Your decision</p>
              <div className="space-y-1">
                <label htmlFor="reason" className="text-sm">If removing, which rule it broke</label>
                <select id="reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full rounded-md border bg-transparent p-2 text-sm">
                  {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="note" className="text-sm">What you found (required)</label>
                <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              </div>
              <Button className="w-full" variant="secondary" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('keep')}>{busy === 'keep' && <Loader2 className="animate-spin" />}It's an honest review: keep it</Button>
              <Button className="w-full" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('remove')}>{busy === 'remove' && <Loader2 className="animate-spin" />}It broke the rule: remove it</Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
