import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, FileCheck2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { api, ApiError, type StartProofDetail, type StartProofRow } from '@/lib/api'
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

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Start proof objections</h1>
          <p className="text-sm text-muted-foreground">A client raised a point about a start proof. Check it against the format the skill asks for. Quality is never a reason.</p>
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
          { value: 'handled', label: 'Ruled on' },
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
          <FileCheck2 className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'open' ? 'No objections waiting' : 'Nothing ruled on yet'}</p>
          <p className="text-sm text-muted-foreground">{status === 'open' ? 'When a client objects to a start proof it shows up here, and the talent waits on you for the first 20%.' : 'Rulings show up here.'}</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.contractId} to={`/start-proofs/${r.contractId}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.jobTitle}</p>
              {r.round > 0 && <Badge variant="secondary">Round {r.round + 1}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{r.objection?.label ?? r.status}</p>
            <p className="text-xs text-muted-foreground">{r.status === 'objected' && r.objection ? waiting(r.objection.at) : r.status}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<StartProofDetail | null>(null)
  const [failed, setFailed] = useState(false)
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
  }, [id])

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

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/start-proofs" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this start proof.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { startProof, fields, checklist, parties } = data
  const open = startProof.status === 'objected'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/start-proofs" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All objections</Link>

      <Card className="space-y-1 p-4">
        <p className="font-display text-lg font-semibold">{startProof.jobTitle}</p>
        <p className="text-sm text-muted-foreground">
          Client {parties.client.fullName} · Talent {parties.talent?.fullName ?? 'unknown'} · 20% is {startProof.currency} {startProof.upfrontAmount.toLocaleString()}
        </p>
        {startProof.objection && (
          <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="font-medium">{startProof.objection.label}</p>
            <p>"{startProof.objection.note}"</p>
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <p className="font-medium">Does it meet the format?</p>
        {checklist.meetsFormat ? (
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-green-500" /> Every required part is there, in the right number.</p>
        ) : (
          checklist.missing.map((m) => (
            <p key={m.key} className="flex items-center gap-2 text-sm"><XCircle className="size-4 text-destructive" /> {m.problem}</p>
          ))
        )}
      </Card>

      {fields.map((f) => (
        <Card key={f.key} className="space-y-2 p-4">
          <p className="font-medium">{f.label} <span className="text-xs text-muted-foreground">(needs {f.min === f.max ? f.min : `${f.min} to ${f.max}`})</span></p>
          {f.items.length === 0 && <p className="text-sm text-muted-foreground">Nothing was added.</p>}
          {f.items.map((i) => (
            <div key={i.id} className="rounded-lg border p-3 text-sm">
              {i.text ? (
                f.kind === 'link' ? <a href={i.text} target="_blank" rel="noreferrer noopener" className="break-all underline">{i.text}</a> : <p className="whitespace-pre-wrap">{i.text}</p>
              ) : i.url && i.contentType?.startsWith('image/') ? (
                <img src={i.url} alt={i.name ?? ''} className="max-h-72 rounded-md" />
              ) : i.url && i.contentType?.startsWith('video/') ? (
                <video src={i.url} controls className="max-h-72 rounded-md" />
              ) : i.url ? (
                <a href={i.url} target="_blank" rel="noreferrer noopener" className="underline">{i.name}</a>
              ) : (
                <p className="text-muted-foreground">{i.name} (no link, storage is not available here)</p>
              )}
            </div>
          ))}
        </Card>
      ))}

      {!open ? (
        <Card className="p-4 text-sm">Already ruled on: now {startProof.status}.</Card>
      ) : (
        <Card className="space-y-3 p-4">
          <div className="space-y-1">
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
