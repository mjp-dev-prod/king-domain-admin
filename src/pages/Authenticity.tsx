import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw, ScanSearch } from 'lucide-react'
import { api, ApiError, type AuthenticityDetail, type AuthenticityRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillWorkViewer } from '@/components/SkillWorkViewer'
import { Sentry } from '@/lib/sentry'

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

export function Authenticity() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'checker')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [rows, setRows] = useState<AuthenticityRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .authenticityList()
      .then((r) => {
        if (cancelled) return
        setRows(r.submissions)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'authenticity', request: 'list' } })
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
          <h1 className="font-display text-2xl font-semibold">Authenticity checks</h1>
          <p className="text-sm text-muted-foreground">Is this really their work? Only then does it go to the reviewers.</p>
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
          <ScanSearch className="size-6 text-muted-foreground" />
          <p className="font-medium">Nothing waiting</p>
          <p className="text-sm text-muted-foreground">New submissions appear here as talent send them.</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/authenticity/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.person.name}</p>
              <Badge variant="outline">{r.skillLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {waiting(r.submittedAt)}
              {r.repeatOfRejected && <span className="ml-2 inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-3" /> Same files as rejected work</span>}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

type Action = 'pass' | 'stop' | 'penalize' | 'ban'

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<AuthenticityDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<'penalize' | 'ban' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .authenticityDetail(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'authenticity', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function run(action: Action) {
    setBusy(action)
    try {
      if (action === 'pass') await api.authenticityPass(id, { checklist: ticked, note: note.trim() || undefined })
      else await api.authenticityAct(id, action, note.trim())
      toast.success({ pass: 'Passed on to the reviewers', stop: 'Sent back with the reason', penalize: 'Penalty applied', ban: 'Banned from this skill' }[action])
      navigate('/authenticity')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
      setConfirm(null)
    } finally {
      setBusy(null)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/authenticity" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this submission. It may have been removed.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const s = data.submission
  const open = s.status === 'authenticity'
  const allTicked = data.checklist.every((c) => ticked[c.key])
  const noteOk = note.trim().length >= 10

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/authenticity" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All checks</Link>

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">{s.person.name}</p>
          <Badge variant="outline">{s.skillLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {s.person.email}
          {s.person.region && <span> · {s.person.region}</span>}
          {s.person.education && <span> · {s.person.education.kind}{s.person.education.school ? `, ${s.person.education.school}` : ''}{s.person.education.detail ? ` (${s.person.education.detail})` : ''}</span>}
        </p>
      </Card>

      {s.repeatOfRejected && (
        <Card className="flex gap-3 border-destructive/50 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p>Every finished file here is byte-for-byte one that was in an earlier Not yet attempt. If nothing was changed, use Penalise: the next penalty is <strong>{data.nextPenaltyMonths} months</strong> out of this skill.</p>
        </Card>
      )}

      {data.earlier.length > 0 && (
        <Card className="space-y-1 p-4 text-sm">
          <p className="font-medium">Earlier attempts in this skill</p>
          {data.earlier.map((e) => (
            <p key={e.id} className="text-muted-foreground">
              {new Date(e.submittedAt).toLocaleDateString()} · {e.status}
              {e.resultReasons?.note && <span> · {e.resultReasons.note}</span>}
            </p>
          ))}
        </Card>
      )}

      <SkillWorkViewer work={s} />

      {!open ? (
        <Card className="p-4 text-sm">This one has already been handled.</Card>
      ) : (
        <>
          <Card className="space-y-3 p-4">
            <p className="font-medium">Pass it on</p>
            {data.checklist.map((c) => (
              <label key={c.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={ticked[c.key] === true} onChange={(e) => setTicked((t) => ({ ...t, [c.key]: e.target.checked }))} />
                {c.label}
              </label>
            ))}
            <Button onClick={() => run('pass')} disabled={!allTicked || busy !== null}>
              {busy === 'pass' && <Loader2 className="animate-spin" />} Pass to reviewers
            </Button>
          </Card>

          <Card className="space-y-3 p-4">
            <p className="font-medium">Doesn't pass</p>
            <div className="space-y-1">
              <Label htmlFor="note">What you found (the person sees this)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => run('stop')} disabled={!noteOk || busy !== null}>
                {busy === 'stop' && <Loader2 className="animate-spin" />} Send back, no penalty
              </Button>
              {s.repeatOfRejected && (
                <Button variant="secondary" onClick={() => setConfirm('penalize')} disabled={busy !== null}>Penalise {data.nextPenaltyMonths} months</Button>
              )}
              <Button variant="destructive" onClick={() => setConfirm('ban')} disabled={!noteOk || busy !== null}>Ban from this skill</Button>
            </div>
            {confirm && (
              <div className="space-y-2 rounded-lg border border-destructive/50 p-3 text-sm">
                <p>
                  {confirm === 'ban'
                    ? `This bans ${s.person.name} from ${s.skillLabel} permanently and cannot be undone from here.`
                    : `This stops ${s.person.name} submitting in ${s.skillLabel} for ${data.nextPenaltyMonths} months.`}
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => run(confirm)} disabled={busy !== null}>
                    {busy === confirm && <Loader2 className="animate-spin" />} Yes, do it
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={busy !== null}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
