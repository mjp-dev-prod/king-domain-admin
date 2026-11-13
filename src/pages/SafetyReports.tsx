import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Flag, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type SafetyReportDetail, type SafetyReportRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueTarget, waitLabel, waitTone } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

export function SafetyReports() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'safety')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'open' | 'handled'>('open')
  const [rows, setRows] = useState<SafetyReportRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const target = useQueueTarget('safety-report')

  useEffect(() => {
    let cancelled = false
    api
      .safetyReports(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.reports)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'safety-reports', request: 'list' } })
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
        title="Safety reports"
        description="Messages people reported. Read the message with the ones around it, then decide."
        actions={
          <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      <FilterTabs
        label="Status"
        value={status}
        onChange={(next) => {
          setRows(null)
          setStatus(next)
        }}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'handled', label: 'Handled' },
        ]}
      />

      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={Flag} title={status === 'open' ? 'Nothing reported' : 'Nothing handled yet'}>
          {status === 'open' ? 'Reports appear here as people send them.' : 'Handled reports show up here.'}
        </EmptyState>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link key={r.id} to={`/safety-reports/${r.id}`} className="block">
            <Card interactive className="gap-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{r.reason}</p>
                {r.liveContract && <StatusPill tone="bad">Job running</StatusPill>}
              </div>
              <p className="line-clamp-2 text-sm text-text-2">"{r.preview}"</p>
              {r.status === 'open' ? (
                <div>
                  <StatusPill tone={waitTone(r.createdAt, target)} icon={<Clock />}>
                    {waitLabel(r.createdAt)} waiting
                  </StatusPill>
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
  const [data, setData] = useState<SafetyReportDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'dismiss' | 'actioned' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .safetyReport(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'safety-reports', request: 'detail' } })
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

  async function run(action: 'dismiss' | 'actioned') {
    setBusy(action)
    try {
      await api.handleSafetyReport(id, { action, note: note.trim() || undefined })
      toast.success(action === 'dismiss' ? 'Dismissed' : 'Recorded')
      navigate('/safety-reports')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const back = (label: string) => (
    <Link to="/safety-reports" className="inline-flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {back('Back')}
        <ErrorState message="Couldn't open this report." onRetry={retry} />
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

  const { report, messages, liveContract } = data
  const open = report.status === 'open'

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {back('All reports')}

      <PageHeader title={report.reason} description={`Reported by ${report.reportedBy} · about ${report.reported}`} />

      {report.note && (
        <Card className="p-5">
          <p className="text-sm">"{report.note}"</p>
        </Card>
      )}

      {liveContract && (
        <Card tone="bad" className="flex-row gap-3 p-4 text-sm" role="alert">
          <AlertTriangle className="size-5 shrink-0 text-bad" />
          <p>These two have a job running together. Money may be at stake, so look at this first.</p>
        </Card>
      )}

      <Card className="gap-2 p-5">
        <p className="font-semibold">The conversation</p>
        {messages.map((m) => (
          <div key={m.id} className={cn('space-y-1 rounded-lg p-3 text-sm', m.flagged ? 'bg-bad-tint' : 'bg-secondary')}>
            <p className="flex flex-wrap items-center gap-2 text-xs text-text-2">
              <span>
                {m.from} · {new Date(m.at).toLocaleString()}
                {m.edited ? ' · edited' : ''}
              </span>
              {m.flagged && <StatusPill tone="bad">Flagged</StatusPill>}
            </p>
            <p>{m.kind === 'text' || m.kind === 'agreement' ? m.body : `[${m.kind}]`}</p>
            {m.edited && m.originalBody && <p className="text-xs text-text-2">Before the edit: "{m.originalBody}"</p>}
          </div>
        ))}
      </Card>

      {!open ? (
        <Card tone="ok" className="flex-row items-start gap-2 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
          <p>
            {report.status === 'dismissed' ? 'Dismissed.' : 'Action taken.'} {report.handledNote}
          </p>
        </Card>
      ) : (
        <Card className="gap-3 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="note">What you did or found (required if you took action)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => run('dismiss')} disabled={busy !== null}>
              {busy === 'dismiss' && <Loader2 className="animate-spin" />} Dismiss: nothing wrong
            </Button>
            <Button glow onClick={() => run('actioned')} disabled={note.trim().length < 10 || busy !== null}>
              {busy === 'actioned' && <Loader2 className="animate-spin" />} Action taken
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
