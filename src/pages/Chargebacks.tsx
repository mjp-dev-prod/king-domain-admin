import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { api, ApiError, type ChargebackCase, type ChargebackRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

const money = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '')

function dueIn(iso: string | null): { text: string; late: boolean; soon: boolean } {
  if (!iso) return { text: 'no deadline given', late: false, soon: false }
  const ms = new Date(iso).getTime() - Date.now()
  const h = Math.floor(Math.abs(ms) / 36e5)
  const m = Math.floor((Math.abs(ms) % 36e5) / 6e4)
  const text = `${h} h ${m} min`
  return ms < 0 ? { text: `${text} past the deadline`, late: true, soon: false } : { text: `${text} left`, late: false, soon: ms < 4 * 36e5 }
}

export function Chargebacks() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'finance')) return <Navigate to="/" replace />
  return id ? <Case id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'open' | 'handled'>('open')
  const [rows, setRows] = useState<ChargebackRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .chargebacks(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.chargebacks)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'chargebacks', request: 'list' } })
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
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Chargebacks</h1>
          <p className="text-sm text-muted-foreground">A client's bank is reversing a card payment. Paystack allows 16 weekday hours to answer; after that it is accepted for us and cannot be undone.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>
      <FilterTabs label="Status" value={status} onChange={(v) => { setRows(null); setStatus(v) }} options={[{ value: 'open', label: 'Waiting for us' }, { value: 'handled', label: 'Answered' }]} />

      {failed && <Card className="flex items-center justify-between gap-3 p-4"><p className="text-sm">Couldn't load the list.</p><Button size="sm" onClick={reload}>Retry</Button></Card>}
      {!failed && rows === null && [0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      {!failed && rows?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <CreditCard className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'open' ? 'No chargebacks waiting' : 'Nothing answered yet'}</p>
          <p className="text-sm text-muted-foreground">{status === 'open' ? 'They appear here the moment Paystack tells us, and the team is alerted at once.' : 'Answered ones show up here.'}</p>
        </Card>
      )}
      {rows && rows.length > 0 && (
        <Card className="divide-y overflow-hidden p-0">
          {rows.map((r) => {
            const due = status === 'open' ? dueIn(r.dueAt) : null
            return (
              <Link key={r.id} to={`/chargebacks/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-secondary/40">
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">{money(r.amount)}</p>
                  <p className="text-sm text-muted-foreground">Received {when(r.receivedAt)}{r.hasContract ? '' : ' · no matching job found'}</p>
                </div>
                {due && <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums', due.late || due.soon ? 'font-medium text-destructive' : 'text-muted-foreground')}><Clock className="size-3" />{due.text}</span>}
                {!due && <Badge variant={r.status === 'lost' ? 'destructive' : 'secondary'}>{r.status}</Badge>}
              </Link>
            )
          })}
        </Card>
      )}
    </div>
  )
}

function Case({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<ChargebackCase | null>(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'contest' | 'accept' | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .chargeback(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'chargebacks', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, version])

  async function run(kind: 'contest' | 'accept') {
    setBusy(kind)
    try {
      if (kind === 'contest') await api.contestChargeback(id, note.trim())
      else await api.acceptChargeback(id, note.trim())
      toast.success(kind === 'contest' ? 'Sent to Paystack with the receipt' : 'Accepted')
      navigate('/chargebacks')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
      setVersion((v) => v + 1)
    } finally {
      setBusy(null)
    }
  }

  if (failed) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Link to="/chargebacks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link><Card className="p-4 text-sm">Couldn't open this chargeback.</Card></div>
  if (!data) return <div className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></div>

  const { chargeback: c, receipt } = data
  const open = c.status === 'open'
  const due = dueIn(c.dueAt)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <Link to="/chargebacks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All chargebacks</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tabular-nums">{money(c.amount)}</h1>
          <Badge variant={c.status === 'lost' ? 'destructive' : 'secondary'}>{c.status}</Badge>
          {open && <span className={cn('inline-flex items-center gap-1 text-sm tabular-nums', due.late || due.soon ? 'font-medium text-destructive' : 'text-muted-foreground')}><Clock className="size-4" />{due.text}</span>}
        </div>
        <p className="text-sm text-muted-foreground">{data.job ? `${data.job.title} · ${data.job.status}${data.job.paidOut ? ' · talent paid out' : ''}` : 'No job matches this payment reference.'}{data.client ? ` · ${data.client.name}` : ''}</p>
        {c.clientRemovedAt && <p className="text-sm text-destructive">The client was removed on {when(c.clientRemovedAt)}. The talent keeps what they earned.</p>}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">The receipt Paystack will see</p>
            {receipt.ready ? <Badge variant="secondary"><CheckCircle2 />Complete</Badge> : <Badge variant="destructive"><XCircle />Incomplete</Badge>}
          </div>
          {!receipt.ready && <p className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm"><AlertTriangle className="size-4 shrink-0 text-destructive" />Paystack needs {receipt.missing.join(', ')}. Without it the answer is likely to fail.</p>}
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed">{receipt.lines.join('\n')}</pre>
          <p className="text-xs text-muted-foreground">This is sent to Paystack as a PDF, with the client's name, email and address, and a description of the service. Messages and emails alone are not accepted as evidence.</p>
        </Card>

        <aside className="lg:sticky lg:top-4">
          {open ? (
            <Card className="space-y-3 p-4">
              <p className="font-medium">Your answer</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="A line for the bank (optional to contest, required to accept)" className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              <Button className="w-full" disabled={!receipt.ready || busy !== null} onClick={() => run('contest')}>{busy === 'contest' && <Loader2 className="animate-spin" />}Contest it with this receipt</Button>
              <Button className="w-full" variant="secondary" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('accept')}>{busy === 'accept' && <Loader2 className="animate-spin" />}Accept it (the amount is taken)</Button>
              <p className="text-xs text-muted-foreground">Accepting cannot be undone. If the talent was paid for approved work, King Domain absorbs the loss and the client is removed.</p>
            </Card>
          ) : (
            <Card className="space-y-1 p-4 text-sm">
              <p className="font-medium">{c.status === 'responded' ? 'Answered, waiting for the bank' : c.status === 'won' ? 'Won' : 'Lost'}</p>
              {c.responseNote && <p className="text-muted-foreground">"{c.responseNote}"</p>}
              {c.resolution && <p className="text-muted-foreground">Paystack: {c.resolution}</p>}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
