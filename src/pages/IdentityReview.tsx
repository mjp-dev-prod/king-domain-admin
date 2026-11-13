import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, ApiError, type IdentityCheck, type IdentityReason, type IdentityStatus } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueList } from '@/lib/useQueueList'
import { useQueueTarget } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { MasterDetail } from '@/components/kd/MasterDetail'
import { PageHeader } from '@/components/kd/PageHeader'
import { QueueRow } from '@/components/kd/QueueRow'
import { StatusPill } from '@/components/kd/StatusPill'
import { Sentry } from '@/lib/sentry'

const DOC_LABEL = { ninSlip: 'NIN slip', passport: 'Passport', cac: 'CAC certificate' } as const

/**
 * Identity checks: read the document, watch the video, type what the document shows. Rows never show the document
 * (private IDs are not shown in a list); only the open item does.
 */
export function IdentityReview() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<IdentityStatus>('pending')
  const [counts, setCounts] = useState<Record<IdentityStatus, number> | null>(null)
  const queue = useQueueList<IdentityCheck>(() => api.identityChecks(status).then((r) => r.checks), `identity-${status}`)
  const target = useQueueTarget('identity')

  useEffect(() => {
    let cancelled = false
    api.identityCounts().then((c) => !cancelled && setCounts(c)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status, queue.rows?.length])

  if (!can(user, 'checker')) return <Navigate to="/" replace />

  /** After a decision: take the row off the list and open the next one. */
  function handled(doneId: string) {
    const rows = queue.rows ?? []
    const at = rows.findIndex((r) => r.id === doneId)
    const next = rows[at + 1] ?? rows[at - 1]
    queue.remove(doneId)
    navigate(next && next.id !== doneId ? `/identity-checks/${next.id}` : '/identity-checks')
  }

  const loading = queue.rows === null && !queue.failed

  const list = (
    <div className="space-y-4">
      <PageHeader
        title="Identity checks"
        description="Read the document, watch the video, type what the document shows."
        actions={
          <Button variant="ghost" size="icon" onClick={queue.reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      <FilterTabs
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'pending', label: 'Waiting', count: counts?.pending ?? null },
          { value: 'verified', label: 'Verified', count: counts?.verified ?? null },
          { value: 'notYet', label: 'Not yet', count: counts?.notYet ?? null },
        ]}
      />
      {queue.failed && <ErrorState message="Couldn't load the list." onRetry={queue.reload} />}
      {!queue.failed && loading && <LoadingList />}
      {!queue.failed && !loading && queue.rows?.length === 0 && (
        <EmptyState icon={ShieldCheck} title={status === 'pending' ? 'Nothing waiting' : 'Nothing here yet'}>
          {status === 'pending' ? 'New submissions appear here as people send them.' : 'Checked submissions show up here.'}
        </EmptyState>
      )}
      {!queue.failed && !loading && queue.rows && queue.rows.length > 0 && (
        <div className="space-y-2">
          {queue.rows.map((c) => (
            <QueueRow
              key={c.id}
              to={`/identity-checks/${c.id}`}
              selected={c.id === id}
              name={c.claimedName}
              skill={DOC_LABEL[c.document]}
              since={c.status === 'pending' ? c.createdAt : undefined}
              targetMinutes={target}
              showPreview={false}
              flags={
                <>
                  <StatusPill tone="plain">{c.user.role === 'client' ? 'Client' : 'Talent'}</StatusPill>
                  {c.status === 'verified' && <StatusPill tone="ok">Verified</StatusPill>}
                  {c.status === 'notYet' && <StatusPill tone="warn">Sent back</StatusPill>}
                </>
              }
            />
          ))}
        </div>
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
          <EmptyState icon={ShieldCheck} title="Pick a check">
            Choose one on the left, compare the document with what the person entered, then verify or send it back with a reason.
          </EmptyState>
        </div>
      }
    />
  )
}

function Detail({ id, onHandled }: { id: string; onHandled: (id: string) => void }) {
  const [check, setCheck] = useState<IdentityCheck | null>(null)
  const [reasons, setReasons] = useState<IdentityReason[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [legalName, setLegalName] = useState('')
  const [dob, setDob] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'approve' | 'notYet' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .identityCheck(id)
      .then((r) => {
        if (cancelled) return
        setCheck(r.check)
        setReasons(r.reasons)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'identity-review', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  async function run(kind: 'approve' | 'notYet') {
    setBusy(kind)
    try {
      if (kind === 'approve') await api.approveIdentity(id, { legalName: legalName.trim(), dateOfBirth: dob || undefined })
      else await api.identityNotYet(id, { reasonCode, note: note.trim() || undefined })
      toast.success(kind === 'approve' ? 'Verified' : 'Sent back with the reason')
      onHandled(id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const back = (
    <Link to="/identity-checks" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground lg:hidden">
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
  if (!check) {
    return (
      <div className="space-y-3" aria-busy="true">
        {back}
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const open = check.status === 'pending'
  const needsDob = check.document !== 'cac'

  return (
    <div className="space-y-4 pb-8">
      {back}

      <Card className="gap-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">{check.claimedName}</h2>
          <StatusPill tone="plain">{DOC_LABEL[check.document]}</StatusPill>
        </div>
        <p className="text-sm text-text-2">
          {check.user.role === 'client' ? 'Client' : 'Talent'} · {check.user.email}
          {check.claimedDateOfBirth && <span> · says born {check.claimedDateOfBirth}</span>}
        </p>
      </Card>

      {check.documentUrl && <img src={check.documentUrl} alt="The submitted document" className="w-full rounded-xl bg-card" />}
      {check.videoUrl && <video src={check.videoUrl} controls playsInline className="w-full rounded-xl bg-card" />}

      {!open ? (
        <Card tone={check.status === 'verified' ? 'ok' : 'warn'} className="gap-1 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            {check.status === 'verified' ? (
              <>
                <CheckCircle2 className="size-4 text-ok" /> Verified as {check.legalName}
              </>
            ) : (
              'Sent back'
            )}
          </p>
          {check.note && <p className="text-text-2">{check.note}</p>}
        </Card>
      ) : (
        <>
          <Card className="gap-3 p-5">
            <h3 className="text-base font-extrabold">Verify</h3>
            <p className="text-sm text-text-2">Type what the document shows. Don't copy what they entered.</p>
            <div className="space-y-1.5">
              <Label htmlFor="legal">Name on the document</Label>
              <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            {needsDob && (
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth on the document (YYYY-MM-DD)</Label>
                <Input id="dob" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="2005-03-14" />
              </div>
            )}
            <div>
              {/* The one main action on the screen: the only glow. */}
              <Button glow onClick={() => run('approve')} disabled={!legalName.trim() || (needsDob && !dob) || busy !== null}>
                {busy === 'approve' && <Loader2 className="animate-spin" />} Verify
              </Button>
            </div>
          </Card>

          <Card className="gap-3 p-5">
            <h3 className="text-base font-extrabold">Not yet</h3>
            <div className="space-y-1.5">
              <Label htmlFor="why">Reason (they see this)</Label>
              <select
                id="why"
                className="h-10 w-full rounded-md border border-input bg-secondary px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:h-9 sm:text-sm"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                <option value="">Choose a reason</option>
                {reasons.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note {reasonCode === 'other' ? '(required)' : '(optional)'}</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <Button variant="secondary" onClick={() => run('notYet')} disabled={!reasonCode || (reasonCode === 'other' && note.trim().length < 10) || busy !== null}>
                {busy === 'notYet' && <Loader2 className="animate-spin" />} Send back
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
