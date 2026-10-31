import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Flag, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type SafetyReportDetail, type SafetyReportRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Safety reports</h1>
          <p className="text-sm text-muted-foreground">Messages people reported. Read the message with the ones around it, then decide.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>

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

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the list.</p>
          <Button size="sm" onClick={reload}>Retry</Button>
        </Card>
      )}
      {!failed && rows === null && [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      {!failed && rows?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Flag className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'open' ? 'Nothing reported' : 'Nothing handled yet'}</p>
          <p className="text-sm text-muted-foreground">{status === 'open' ? 'Reports appear here as people send them.' : 'Handled reports show up here.'}</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/safety-reports/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.reason}</p>
              {r.liveContract && <Badge variant="destructive">Job running</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">"{r.preview}"</p>
            <p className="text-xs text-muted-foreground">{r.status === 'open' ? waiting(r.createdAt) : r.status}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<SafetyReportDetail | null>(null)
  const [failed, setFailed] = useState(false)
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
  }, [id])

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

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/safety-reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this report.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { report, messages, liveContract } = data
  const open = report.status === 'open'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/safety-reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All reports</Link>

      <Card className="space-y-1 p-4">
        <p className="font-display text-lg font-semibold">{report.reason}</p>
        <p className="text-sm text-muted-foreground">Reported by {report.reportedBy} · about {report.reported}</p>
        {report.note && <p className="text-sm">"{report.note}"</p>}
      </Card>

      {liveContract && (
        <Card className="flex gap-3 border-destructive/50 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p>These two have a job running together. Money may be at stake, so look at this first.</p>
        </Card>
      )}

      <Card className="space-y-2 p-4">
        <p className="font-medium">The conversation</p>
        {messages.map((m) => (
          <div key={m.id} className={cn('rounded-lg border p-3 text-sm', m.flagged ? 'border-destructive/60 bg-destructive/10' : 'border-border')}>
            <p className="text-xs text-muted-foreground">{m.from} · {new Date(m.at).toLocaleString()}{m.edited ? ' · edited' : ''}</p>
            <p>{m.kind === 'text' || m.kind === 'agreement' ? m.body : `[${m.kind}]`}</p>
            {m.edited && m.originalBody && <p className="text-xs text-muted-foreground">Before the edit: "{m.originalBody}"</p>}
          </div>
        ))}
      </Card>

      {!open ? (
        <Card className="p-4 text-sm">{report.status === 'dismissed' ? 'Dismissed.' : 'Action taken.'} {report.handledNote}</Card>
      ) : (
        <Card className="space-y-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="note">What you did or found (required if you took action)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => run('dismiss')} disabled={busy !== null}>
              {busy === 'dismiss' && <Loader2 className="animate-spin" />} Dismiss: nothing wrong
            </Button>
            <Button onClick={() => run('actioned')} disabled={note.trim().length < 10 || busy !== null}>
              {busy === 'actioned' && <Loader2 className="animate-spin" />} Action taken
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
