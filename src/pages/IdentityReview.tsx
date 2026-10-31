import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, ApiError, type IdentityCheck, type IdentityReason, type IdentityStatus } from '@/lib/api'
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

const DOC_LABEL = { ninSlip: 'NIN slip', passport: 'Passport', cac: 'CAC certificate' } as const

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

export function IdentityReview() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'checker')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<IdentityStatus>('pending')
  const [checks, setChecks] = useState<IdentityCheck[] | null>(null)
  const [counts, setCounts] = useState<Record<IdentityStatus, number> | null>(null)
  const [failed, setFailed] = useState(false)

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .identityChecks(status)
      .then((r) => {
        if (cancelled) return
        setChecks(r.checks)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'identity-review', request: 'list' } })
        setFailed(true)
      })
    api.identityCounts().then((c) => !cancelled && setCounts(c)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status, attempt])

  const reload = useCallback(() => {
    setChecks(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Identity checks</h1>
          <p className="text-sm text-muted-foreground">Read the document, watch the video, type what the document shows.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>

      <FilterTabs
        label="Status"
        value={status}
        onChange={(next) => {
          setChecks(null)
          setStatus(next)
        }}
        options={[
          { value: 'pending', label: 'Waiting', count: counts?.pending ?? null },
          { value: 'verified', label: 'Verified', count: counts?.verified ?? null },
          { value: 'notYet', label: 'Not yet', count: counts?.notYet ?? null },
        ]}
      />

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the list.</p>
          <Button size="sm" onClick={reload}>Retry</Button>
        </Card>
      )}
      {!failed && checks === null && [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      {!failed && checks?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ShieldCheck className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'pending' ? 'Nothing waiting' : 'Nothing here yet'}</p>
          <p className="text-sm text-muted-foreground">{status === 'pending' ? 'New submissions appear here as people send them.' : 'Checked submissions show up here.'}</p>
        </Card>
      )}
      {checks?.map((c) => (
        <Link key={c.id} to={`/identity-checks/${c.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{c.claimedName}</p>
              <Badge variant="outline">{DOC_LABEL[c.document]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.user.role === 'client' ? 'Client' : 'Talent'} · {c.user.email}
              {c.status === 'pending' && <span> · {waiting(c.createdAt)}</span>}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [check, setCheck] = useState<IdentityCheck | null>(null)
  const [reasons, setReasons] = useState<IdentityReason[]>([])
  const [failed, setFailed] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [dob, setDob] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'approve' | 'notYet' | null>(null)

  useEffect(() => {
    api
      .identityCheck(id)
      .then((r) => {
        setCheck(r.check)
        setReasons(r.reasons)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'identity-review', request: 'detail' } })
        setFailed(true)
      })
  }, [id])

  async function run(kind: 'approve' | 'notYet') {
    setBusy(kind)
    try {
      if (kind === 'approve') await api.approveIdentity(id, { legalName: legalName.trim(), dateOfBirth: dob || undefined })
      else await api.identityNotYet(id, { reasonCode, note: note.trim() || undefined })
      toast.success(kind === 'approve' ? 'Verified' : 'Sent back with the reason')
      navigate('/identity-checks')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/identity-checks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this submission. It may have been removed.</Card>
      </div>
    )
  }
  if (!check) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const open = check.status === 'pending'
  const needsDob = check.document !== 'cac'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/identity-checks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All checks</Link>

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">{check.claimedName}</p>
          <Badge variant="outline">{DOC_LABEL[check.document]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {check.user.role === 'client' ? 'Client' : 'Talent'} · {check.user.email}
          {check.claimedDateOfBirth && <span> · says born {check.claimedDateOfBirth}</span>}
        </p>
      </Card>

      {check.documentUrl && <img src={check.documentUrl} alt="The submitted document" className="w-full rounded-xl border border-border" />}
      {check.videoUrl && <video src={check.videoUrl} controls playsInline className="w-full rounded-xl border border-border" />}

      {!open ? (
        <Card className="space-y-1 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">{check.status === 'verified' ? <><Check className="size-4" /> Verified as {check.legalName}</> : 'Sent back'}</p>
          {check.note && <p className="text-muted-foreground">{check.note}</p>}
        </Card>
      ) : (
        <>
          <Card className="space-y-3 p-4">
            <p className="font-medium">Verify</p>
            <p className="text-sm text-muted-foreground">Type what the document shows. Don't copy what they entered.</p>
            <div className="space-y-1">
              <Label htmlFor="legal">Name on the document</Label>
              <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            {needsDob && (
              <div className="space-y-1">
                <Label htmlFor="dob">Date of birth on the document (YYYY-MM-DD)</Label>
                <Input id="dob" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="2005-03-14" />
              </div>
            )}
            <Button onClick={() => run('approve')} disabled={!legalName.trim() || (needsDob && !dob) || busy !== null}>
              {busy === 'approve' && <Loader2 className="animate-spin" />} Verify
            </Button>
          </Card>

          <Card className="space-y-3 p-4">
            <p className="font-medium">Not yet</p>
            <div className="space-y-1">
              <Label htmlFor="why">Reason (they see this)</Label>
              <select id="why" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                <option value="">Choose a reason</option>
                {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="note">Note {reasonCode === 'other' ? '(required)' : '(optional)'}</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => run('notYet')} disabled={!reasonCode || (reasonCode === 'other' && note.trim().length < 10) || busy !== null}>
              {busy === 'notYet' && <Loader2 className="animate-spin" />} Send back
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}
