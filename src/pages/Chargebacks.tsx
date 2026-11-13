import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { api, ApiError, type ChargebackCase, type ChargebackRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Money } from '@/components/kd/Money'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'

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
      <PageHeader
        title="Chargebacks"
        description="A client's bank is reversing a card payment. Paystack allows 16 weekday hours to answer; after that it is accepted for us and cannot be undone."
        actions={<Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>}
      />
      <FilterTabs label="Status" value={status} onChange={(v) => { setRows(null); setStatus(v) }} options={[{ value: 'open', label: 'Waiting for us' }, { value: 'handled', label: 'Answered' }]} />

      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={CreditCard} title={status === 'open' ? 'No chargebacks waiting' : 'Nothing answered yet'}>
          {status === 'open' ? 'They appear here the moment Paystack tells us, and the team is alerted at once.' : 'Answered ones show up here.'}
        </EmptyState>
      )}
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const due = status === 'open' ? dueIn(r.dueAt) : null
            return (
              <Link key={r.id} to={`/chargebacks/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-card p-4 transition-[transform,background-color] duration-200 hover:bg-surface-2 active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <p className="text-lg"><Money amount={r.amount} /></p>
                  <p className="text-sm text-text-2">Received {when(r.receivedAt)}{r.hasContract ? '' : ' · no matching job found'}</p>
                </div>
                {due && <StatusPill tone={due.late ? 'bad' : due.soon ? 'warn' : 'plain'} icon={<Clock />}>{due.text}</StatusPill>}
                {!due && <StatusPill tone={r.status === 'lost' ? 'bad' : r.status === 'won' ? 'ok' : 'plain'}>{r.status}</StatusPill>}
              </Link>
            )
          })}
        </div>
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

  if (failed) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Link to="/chargebacks" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link><ErrorState message="Couldn't open this chargeback." onRetry={() => { setFailed(false); setVersion((v) => v + 1) }} /></div>
  if (!data) return <div className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></div>

  const { chargeback: c, receipt } = data
  const open = c.status === 'open'
  const due = dueIn(c.dueAt)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <Link to="/chargebacks" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground"><ArrowLeft className="size-4" /> All chargebacks</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold"><Money amount={c.amount} className="font-extrabold" /></h1>
          <StatusPill tone={c.status === 'lost' ? 'bad' : c.status === 'won' ? 'ok' : 'plain'}>{c.status}</StatusPill>
          {open && <StatusPill tone={due.late ? 'bad' : due.soon ? 'warn' : 'plain'} icon={<Clock />}>{due.text}</StatusPill>}
        </div>
        <p className="text-sm text-text-2">{data.job ? `${data.job.title} · ${data.job.status}${data.job.paidOut ? ' · talent paid out' : ''}` : 'No job matches this payment reference.'}{data.client ? ` · ${data.client.name}` : ''}</p>
        {c.clientRemovedAt && <p className="text-sm text-bad">The client was removed on {when(c.clientRemovedAt)}. The talent keeps what they earned.</p>}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold">The receipt Paystack will see</h2>
            {receipt.ready ? <StatusPill tone="ok" icon={<CheckCircle2 />}>Complete</StatusPill> : <StatusPill tone="bad" icon={<XCircle />}>Incomplete</StatusPill>}
          </div>
          {!receipt.ready && <p className="flex gap-2 rounded-lg bg-bad-tint p-3 text-sm"><AlertTriangle className="size-4 shrink-0 text-bad" />Paystack needs {receipt.missing.join(', ')}. Without it the answer is likely to fail.</p>}
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs leading-relaxed">{receipt.lines.join('\n')}</pre>
          <p className="text-xs text-text-3">This is sent to Paystack as a PDF, with the client's name, email and address, and a description of the service. Messages and emails alone are not accepted as evidence.</p>
        </Card>

        <aside className="lg:sticky lg:top-4">
          {open ? (
            <Card className="gap-3 p-5">
              <h2 className="text-base font-extrabold">Your answer</h2>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="A line for the bank (optional to contest, required to accept)" />
              <Button glow className="w-full" disabled={!receipt.ready || busy !== null} onClick={() => run('contest')}>{busy === 'contest' && <Loader2 className="animate-spin" />}Contest it with this receipt</Button>
              <Button className="w-full" variant="secondary" disabled={note.trim().length < 10 || busy !== null} onClick={() => run('accept')}>{busy === 'accept' && <Loader2 className="animate-spin" />}Accept it (the amount is taken)</Button>
              <p className="text-xs text-text-3">Accepting cannot be undone. If the talent was paid for approved work, King Domain absorbs the loss and the client is removed.</p>
            </Card>
          ) : (
            <Card tone={c.status === 'won' ? 'ok' : c.status === 'lost' ? 'bad' : 'warn'} className="gap-1 p-4 text-sm">
              <p className="font-semibold">{c.status === 'responded' ? 'Answered, waiting for the bank' : c.status === 'won' ? 'Won' : 'Lost'}</p>
              {c.responseNote && <p className="text-text-2">"{c.responseNote}"</p>}
              {c.resolution && <p className="text-text-2">Paystack: {c.resolution}</p>}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
