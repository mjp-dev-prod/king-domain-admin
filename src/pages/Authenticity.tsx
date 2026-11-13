import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCw, ScanSearch } from 'lucide-react'
import { api, ApiError, type AuthenticityDetail, type AuthenticityRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueList } from '@/lib/useQueueList'
import { useQueueTarget, waitLabel, waitTone } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillWorkViewer } from '@/components/SkillWorkViewer'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { MasterDetail } from '@/components/kd/MasterDetail'
import { PageHeader } from '@/components/kd/PageHeader'
import { QueueRow } from '@/components/kd/QueueRow'
import { StatusPill } from '@/components/kd/StatusPill'
import { Sentry } from '@/lib/sentry'

/** Authenticity checks: is this really their work? Only then does it go to the reviewers. List left, the open one right. */
export function Authenticity() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queue = useQueueList<AuthenticityRow>(() => api.authenticityList().then((r) => r.submissions), 'authenticity')
  const target = useQueueTarget('authenticity')
  const loading = queue.rows === null && !queue.failed

  if (!can(user, 'checker')) return <Navigate to="/" replace />

  /** After a decision: take the row off the list and open the next one, so a reviewer can clear the queue in a row. */
  function handled(doneId: string) {
    const rows = queue.rows ?? []
    const at = rows.findIndex((r) => r.id === doneId)
    const next = rows[at + 1] ?? rows[at - 1]
    queue.remove(doneId)
    navigate(next && next.id !== doneId ? `/authenticity/${next.id}` : '/authenticity')
  }

  const list = (
    <div className="space-y-4">
      <PageHeader
        title="Authenticity checks"
        description="Is this really their work? Only then does it go to the reviewers."
        actions={
          <Button variant="ghost" size="icon" onClick={queue.reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      {queue.failed && <ErrorState message="Couldn't load the list." onRetry={queue.reload} />}
      {!queue.failed && loading && <LoadingList />}
      {!queue.failed && !loading && queue.rows?.length === 0 && (
        <EmptyState icon={ScanSearch} title="Nothing waiting">
          New submissions appear here as talent send them, and you are emailed when one arrives.
        </EmptyState>
      )}
      {!queue.failed && !loading && queue.rows && queue.rows.length > 0 && (
        <>
          <p className="label">{queue.rows.length} waiting</p>
          <div className="space-y-2">
            {queue.rows.map((r) => (
              <QueueRow
                key={r.id}
                to={`/authenticity/${r.id}`}
                selected={r.id === id}
                name={r.person.name}
                skill={r.skillLabel}
                since={r.submittedAt}
                targetMinutes={target}
                preview={r.preview}
                fallbackIcon={ScanSearch}
                flags={
                  r.repeatOfRejected && (
                    <StatusPill tone="bad" icon={<AlertTriangle />}>
                      Same files as rejected work
                    </StatusPill>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <MasterDetail
      hasSelection={!!id}
      list={list}
      detail={id ? <Detail key={id} id={id} onHandled={handled} /> : null}
      empty={
        <div className="grid h-full min-h-80 place-items-center">
          <EmptyState icon={ScanSearch} title="Pick a submission">
            Choose one on the left to look at the work, tick the checks, and pass it on or send it back.
          </EmptyState>
        </div>
      }
    />
  )
}

type Action = 'pass' | 'stop' | 'penalize' | 'ban'

function Detail({ id, onHandled }: { id: string; onHandled: (id: string) => void }) {
  const [data, setData] = useState<AuthenticityDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<'penalize' | 'ban' | null>(null)
  const target = useQueueTarget('authenticity')

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
  }, [id, attempt])

  async function run(action: Action) {
    setBusy(action)
    try {
      if (action === 'pass') await api.authenticityPass(id, { checklist: ticked, note: note.trim() || undefined })
      else await api.authenticityAct(id, action, note.trim())
      toast.success({ pass: 'Passed on to the reviewers', stop: 'Sent back with the reason', penalize: 'Penalty applied', ban: 'Banned from this skill' }[action])
      onHandled(id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
      setConfirm(null)
    } finally {
      setBusy(null)
    }
  }

  const back = (
    <Link to="/authenticity" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground lg:hidden">
      <ArrowLeft className="size-4" /> All checks
    </Link>
  )

  if (failed) {
    return (
      <div className="space-y-3">
        {back}
        <ErrorState
          message="Couldn't open this submission. It may have been removed."
          onRetry={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true">
        {back}
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  const s = data.submission
  const open = s.status === 'authenticity'
  const allTicked = data.checklist.every((c) => ticked[c.key])
  const noteOk = note.trim().length >= 10
  const tone = waitTone(s.submittedAt, target)

  return (
    <div className="space-y-4 pb-8">
      {back}

      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">{s.person.name}</h2>
          <div className="flex items-center gap-1.5">
            <StatusPill tone="plain">{s.skillLabel}</StatusPill>
            <StatusPill tone={tone} icon={<Clock />}>
              {waitLabel(s.submittedAt)}
            </StatusPill>
          </div>
        </div>
        <p className="text-sm text-text-2">
          {s.person.email}
          {s.person.region && <span> · {s.person.region}</span>}
          {s.person.education && (
            <span>
              {' '}
              · {s.person.education.kind}
              {s.person.education.school ? `, ${s.person.education.school}` : ''}
              {s.person.education.detail ? ` (${s.person.education.detail})` : ''}
            </span>
          )}
        </p>
      </Card>

      {s.repeatOfRejected && (
        <Card tone="bad" className="flex-row gap-3 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-bad" />
          <p>
            Every finished file here is byte-for-byte one that was in an earlier Not yet attempt. If nothing was changed, use Penalise: the next penalty is{' '}
            <strong>{data.nextPenaltyMonths} months</strong> out of this skill.
          </p>
        </Card>
      )}

      {data.earlier.length > 0 && (
        <Card className="gap-1 p-4 text-sm">
          <p className="font-semibold">Earlier attempts in this skill</p>
          {data.earlier.map((e) => (
            <p key={e.id} className="text-text-2">
              {new Date(e.submittedAt).toLocaleDateString()} · {e.status}
              {e.resultReasons?.note && <span> · {e.resultReasons.note}</span>}
            </p>
          ))}
        </Card>
      )}

      <SkillWorkViewer work={s} />

      {!open ? (
        <Card tone="ok" className="flex-row items-center gap-2 p-4 text-sm font-medium">
          <CheckCircle2 className="size-4 text-ok" /> This one has already been handled.
        </Card>
      ) : (
        <>
          <Card className="gap-3 p-5">
            <h3 className="text-base font-extrabold">Pass it on</h3>
            {data.checklist.map((c) => (
              <label key={c.key} className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-[var(--kd-violet)]" checked={ticked[c.key] === true} onChange={(e) => setTicked((t) => ({ ...t, [c.key]: e.target.checked }))} />
                {c.label}
              </label>
            ))}
            {/* The one main action on the screen: the only glow. */}
            <Button glow onClick={() => run('pass')} disabled={!allTicked || busy !== null} className="self-start">
              {busy === 'pass' && <Loader2 className="animate-spin" />} Pass to reviewers
            </Button>
          </Card>

          <Card className="gap-3 p-5">
            <h3 className="text-base font-extrabold">Doesn't pass</h3>
            <div className="space-y-1.5">
              <Label htmlFor="note">What you found (the person sees this)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              <p className="text-xs text-text-3">At least 10 characters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => run('stop')} disabled={!noteOk || busy !== null}>
                {busy === 'stop' && <Loader2 className="animate-spin" />} Send back, no penalty
              </Button>
              {s.repeatOfRejected && (
                <Button variant="secondary" onClick={() => setConfirm('penalize')} disabled={busy !== null}>
                  Penalise {data.nextPenaltyMonths} months
                </Button>
              )}
              <Button variant="destructive" onClick={() => setConfirm('ban')} disabled={!noteOk || busy !== null}>
                Ban from this skill
              </Button>
            </div>
            {confirm && (
              <Card tone="bad" className="gap-2 p-4 text-sm">
                <p>
                  {confirm === 'ban'
                    ? `This bans ${s.person.name} from ${s.skillLabel} permanently and cannot be undone from here.`
                    : `This stops ${s.person.name} submitting in ${s.skillLabel} for ${data.nextPenaltyMonths} months.`}
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => run(confirm)} disabled={busy !== null}>
                    {busy === confirm && <Loader2 className="animate-spin" />} Yes, do it
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={busy !== null}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
