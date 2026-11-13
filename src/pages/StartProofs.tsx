import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock, FileCheck2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { api, ApiError, type StartProofDetail, type StartProofRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueTarget, waitLabel, waitTone } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { Money } from '@/components/kd/Money'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Sentry } from '@/lib/sentry'

export function StartProofs() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'disputes')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'open' | 'handled'>('open')
  const [rows, setRows] = useState<StartProofRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const target = useQueueTarget('start-proof')

  useEffect(() => {
    let cancelled = false
    api
      .startProofs(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.startProofs)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'start-proofs', request: 'list' } })
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
        title="Start proof objections"
        description="A client raised a point about a start proof. Check it against the format the skill asks for. Quality is never a reason."
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
          { value: 'handled', label: 'Ruled on' },
        ]}
      />

      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={FileCheck2} title={status === 'open' ? 'No objections waiting' : 'Nothing ruled on yet'}>
          {status === 'open' ? 'When a client objects to a start proof it shows up here, and the talent waits on you for the first 20%.' : 'Rulings show up here.'}
        </EmptyState>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link key={r.contractId} to={`/start-proofs/${r.contractId}`} className="block">
            <Card interactive className="gap-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{r.jobTitle}</p>
                {r.round > 0 && <StatusPill>Round {r.round + 1}</StatusPill>}
              </div>
              <p className="text-sm text-text-2">{r.objection?.label ?? r.status}</p>
              {r.status === 'objected' && r.objection ? (
                <div>
                  <StatusPill tone={waitTone(r.objection.at, target)} icon={<Clock />}>
                    {waitLabel(r.objection.at)} waiting
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
  const [data, setData] = useState<StartProofDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'uphold' | 'dismiss' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .startProof(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'start-proofs', request: 'detail' } })
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

  async function run(decision: 'uphold' | 'dismiss') {
    setBusy(decision)
    try {
      await api.resolveStartProof(id, { decision, note: note.trim() })
      toast.success(decision === 'uphold' ? 'Sent back to the talent' : 'Dismissed: the 20% was paid')
      navigate('/start-proofs')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const back = (label: string) => (
    <Link to="/start-proofs" className="inline-flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {back('Back')}
        <ErrorState message="Couldn't open this start proof." onRetry={retry} />
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

  const { startProof, fields, checklist, parties } = data
  const open = startProof.status === 'objected'

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {back('All objections')}

      <PageHeader
        title={startProof.jobTitle}
        description={
          <>
            Client {parties.client.fullName} · Talent {parties.talent?.fullName ?? 'unknown'} · 20% is{' '}
            <Money amount={startProof.upfrontAmount} currency={startProof.currency} />
          </>
        }
      />

      {startProof.objection && (
        <Card tone="warn" className="gap-1 p-4 text-sm">
          <p className="font-semibold">{startProof.objection.label}</p>
          <p>"{startProof.objection.note}"</p>
        </Card>
      )}

      <Card className="gap-2 p-5">
        <p className="font-semibold">Does it meet the format?</p>
        {checklist.meetsFormat ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-ok" /> Every required part is there, in the right number.
          </p>
        ) : (
          checklist.missing.map((m) => (
            <p key={m.key} className="flex items-center gap-2 text-sm">
              <XCircle className="size-4 text-bad" /> {m.problem}
            </p>
          ))
        )}
      </Card>

      {fields.map((f) => (
        <Card key={f.key} className="gap-2 p-5">
          <p className="font-semibold">
            {f.label} <span className="text-xs font-normal text-text-2">(needs {f.min === f.max ? f.min : `${f.min} to ${f.max}`})</span>
          </p>
          {f.items.length === 0 && <p className="text-sm text-text-2">Nothing was added.</p>}
          {f.items.map((i) => (
            <div key={i.id} className="rounded-lg bg-secondary p-3 text-sm">
              {i.text ? (
                f.kind === 'link' ? (
                  <a href={i.text} target="_blank" rel="noreferrer noopener" className="break-all text-violet-text underline">
                    {i.text}
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap">{i.text}</p>
                )
              ) : i.url && i.contentType?.startsWith('image/') ? (
                <img src={i.url} alt={i.name ?? ''} className="max-h-72 rounded-md" />
              ) : i.url && i.contentType?.startsWith('video/') ? (
                <video src={i.url} controls className="max-h-72 rounded-md" />
              ) : i.url ? (
                <a href={i.url} target="_blank" rel="noreferrer noopener" className="text-violet-text underline">
                  {i.name}
                </a>
              ) : (
                <p className="text-text-2">{i.name} (no link, storage is not available here)</p>
              )}
            </div>
          ))}
        </Card>
      ))}

      {!open ? (
        <Card tone="ok" className="flex-row items-center gap-2 p-4 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-ok" />
          Already ruled on: now {startProof.status}.
        </Card>
      ) : (
        <Card className="gap-3 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="note">What you checked (required)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => run('dismiss')} disabled={note.trim().length < 10 || busy !== null}>
              {busy === 'dismiss' && <Loader2 className="animate-spin" />} Meets the format: pay the 20%
            </Button>
            <Button onClick={() => run('uphold')} disabled={note.trim().length < 10 || busy !== null}>
              {busy === 'uphold' && <Loader2 className="animate-spin" />} Objection stands: send back
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
