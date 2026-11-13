import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Clock, Loader2, MapPin, RefreshCw, Scale, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api, ApiError, type DisputeCase, type DisputePerson, type DisputeRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/components/kd/Money'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

const money = (n: number, currency = 'NGN') => <Money amount={n} currency={currency} />
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '')

function dueIn(iso: string | null): { text: string; late: boolean } {
  if (!iso) return { text: '', late: false }
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 36e5)
  const text = h >= 48 ? `${Math.floor(h / 24)} days` : `${h} h`
  return ms < 0 ? { text: `${text} overdue`, late: true } : { text: `${text} left`, late: false }
}

export function Disputes() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'disputes')) return <Navigate to="/" replace />
  return id ? <Case id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'open' | 'handled'>('open')
  const [rows, setRows] = useState<DisputeRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .disputes(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.disputes)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'disputes', request: 'list' } })
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
        title="Disputes"
        description="Cases the two sides could not settle. A free ruling with written reasons is promised within 5 days, and it is final."
        actions={<Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>}
      />
      <FilterTabs label="Status" value={status} onChange={(v) => { setRows(null); setStatus(v) }} options={[{ value: 'open', label: 'Waiting for a ruling' }, { value: 'handled', label: 'Ruled on' }]} />

      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={Scale} title={status === 'open' ? 'No cases waiting' : 'Nothing ruled on yet'}>
          {status === 'open' ? 'When a dispute is escalated, or silence escalates it, it shows up here with a 5-day clock.' : 'Rulings show up here.'}
        </EmptyState>
      )}
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const due = status === 'open' ? dueIn(r.rulingDueAt) : null
            return (
              <Link key={r.id} to={`/disputes/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-card p-4 transition-[transform,background-color] duration-200 hover:bg-surface-2 active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.jobTitle}</p>
                  <p className="truncate text-sm text-text-2">{r.problem} · filed by {r.filedByRole}</p>
                </div>
                <span className="text-sm">{money(r.budget, r.currency)}</span>
                {r.awaitingApproval && <StatusPill tone="warn">Needs a second person</StatusPill>}
                {due && <StatusPill tone={due.late ? 'bad' : 'plain'} icon={<Clock />}>{due.text}</StatusPill>}
                {r.outcome && <StatusPill tone="ok">{r.outcome.outcome === 'split' ? `${r.outcome.talentPercent}% to the talent` : r.outcome.outcome === 'release' ? 'Released' : 'Refunded'}</StatusPill>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Party({ role, p }: { role: string; p: DisputePerson }) {
  if (!p) return <Card className="p-4 text-sm text-text-2">{role}: not on record</Card>
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label">{role}</p>
        {p.identityVerified ? <Badge variant="plain"><ShieldCheck />ID checked</Badge> : <Badge variant="plain">ID not checked</Badge>}
      </div>
      <div>
        <p className="font-medium">{p.legalName ?? p.name}</p>
        <p className="break-all text-sm text-text-2">{p.email}</p>
      </div>
      <p className="flex items-start gap-1.5 text-sm"><MapPin className="mt-0.5 size-3.5 shrink-0 text-text-2" />{p.address ?? <span className="text-text-2">No address given yet</span>}</p>
      {p.history && (
        <p className={cn('text-xs', p.history.flagged ? 'font-medium text-bad' : 'text-text-2')}>
          {p.history.flagged && <ShieldAlert className="mr-1 inline size-3.5" />}
          Filed {p.history.filed} dispute{p.history.filed === 1 ? '' : 's'}, lost {p.history.lost}
          {p.history.flagged ? ` (${p.history.lostAsFiler} as the one who filed: a repeat losing filer)` : ''}
        </p>
      )}
    </Card>
  )
}

function Case({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<DisputeCase | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .dispute(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'disputes', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, version])

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/disputes" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this case.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>

  const { dispute, money: m } = data
  const due = dueIn(dispute.rulingDueAt)
  const reload = () => setVersion((v) => v + 1)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <Link to="/disputes" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground"><ArrowLeft className="size-4" /> All disputes</Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{data.job.title}</h1>
          {dispute.status === 'escalated' && <span className={cn('inline-flex items-center gap-1 text-sm tabular-nums', due.late ? 'font-medium text-bad' : 'text-text-2')}><Clock className="size-4" />Ruling {due.text}</span>}
          {dispute.status === 'resolved' && <Badge variant="plain">Ruled {when(dispute.resolvedAt)}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="plain">{dispute.problemLabel}</Badge>
          <Badge variant="plain">Held {money(m.held, m.currency)}</Badge>
          {m.upfrontPaid > 0 && <Badge variant="plain">{money(m.upfrontPaid, m.currency)} already paid for the start proof</Badge>}
          <Badge variant="plain">{data.contract.changeRounds} change round{data.contract.changeRounds === 1 ? '' : 's'}</Badge>
          {dispute.escalationReason && <Badge variant="plain">Escalated: {dispute.escalationReason}</Badge>}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Tabs defaultValue="case" className="min-w-0">
          <TabsList className="flex-wrap">
            <TabsTrigger value="case">The case</TabsTrigger>
            <TabsTrigger value="conversation">Conversation ({data.conversation.length})</TabsTrigger>
            <TabsTrigger value="work">The work</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="case" className="space-y-4">
            <Card className="space-y-2 p-4">
              <p className="label">What was said was wrong ({dispute.filedByRole})</p>
              <p className="text-sm">{dispute.note || 'Opened by the system.'}</p>
              {dispute.rule && <p className="rounded-lg bg-surface-2 p-3 text-sm text-text-2">The rule the two people were shown: {dispute.rule}</p>}
            </Card>
            <Card className="space-y-2 p-4">
              <p className="label">The brief (what the work is judged against)</p>
              <p className="whitespace-pre-wrap text-sm">{data.job.description}</p>
              {data.job.briefLines && data.job.briefLines.length > 0 ? (
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  {data.job.briefLines.map((l) => (
                    <div key={l.key}><dt className="text-xs text-text-2">{l.label}</dt><dd>{l.value}</dd></div>
                  ))}
                </dl>
              ) : data.job.brief && (
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  {Object.entries(data.job.brief).map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-text-2">{k}</dt><dd>{typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v)}</dd></div>
                  ))}
                </dl>
              )}
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Party role="Client" p={data.parties.client} />
              <Party role="Talent" p={data.parties.talent} />
            </div>
            <Card className="space-y-2 p-4">
              <p className="label">Ways out they tried</p>
              {data.proposals.length === 0 && <p className="text-sm text-text-2">Nobody offered a way out.</p>}
              {data.proposals.map((p) => (
                <p key={p.id} className="text-sm"><span className="font-medium">{p.by}</span> offered {p.description}. <span className="text-text-2">{p.status}{p.note ? `: "${p.note}"` : ''}</span></p>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="conversation" className="space-y-2">
            {data.conversation.length === 0 && <Card className="p-4 text-sm text-text-2">They never wrote to each other in the app.</Card>}
            {data.conversation.map((c, i) => (
              <div key={i} className={cn('max-w-[85%] rounded-xl p-3 text-sm', c.from === 'Client' ? 'mr-auto bg-surface-2' : 'ml-auto bg-brand-tint')}>
                <p className="text-xs text-text-2">{c.from} · {when(c.at)}</p>
                <p className="whitespace-pre-wrap">{c.kind === 'text' || c.kind === 'agreement' ? c.body : `[${c.kind}${c.attachment ? `: ${c.attachment}` : ''}]`}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="work" className="space-y-4">
            <Card className="space-y-2 p-4">
              <p className="font-medium">Start proof{data.startProof.status ? ` (${data.startProof.status})` : ' (none)'}</p>
              {data.startProof.objection && <p className="text-sm text-bad">Objection: {data.startProof.objection.label}. "{data.startProof.objection.note}"</p>}
              {data.startProof.items.map((i, k) => (
                <p key={k} className="text-sm">{i.text ? i.text : i.url ? <a className="underline" href={i.url} target="_blank" rel="noreferrer noopener">{i.name}</a> : i.name}</p>
              ))}
            </Card>
            <Card className="space-y-2 p-4">
              <p className="font-medium">Deliveries ({data.deliveries.length})</p>
              {data.deliveries.length === 0 && <p className="text-sm text-text-2">Nothing was delivered.</p>}
              {data.deliveries.map((d) => (
                <div key={d.version} className="rounded-lg bg-surface-2 p-3 text-sm">
                  <p className="text-xs text-text-2">Version {d.version} · {when(d.at)}</p>
                  {d.note && <p className="whitespace-pre-wrap">{d.note}</p>}
                  <div className="flex flex-wrap gap-3">
                    {d.url && <a className="underline" href={d.url} target="_blank" rel="noreferrer noopener">Link</a>}
                    {d.fileUrl && <a className="underline" href={d.fileUrl} target="_blank" rel="noreferrer noopener">File</a>}
                  </div>
                </div>
              ))}
            </Card>
            <Card className="space-y-2 p-4">
              <p className="font-medium">Changes asked for ({data.changeRequests.length})</p>
              {data.changeRequests.map((c) => (
                <p key={c.round} className="text-sm"><span className="text-text-2">Round {c.round}, {when(c.at)}{c.resubmittedAt ? `, resubmitted ${when(c.resubmittedAt)}` : ', not resubmitted'}:</span> {c.reason}</p>
              ))}
              {data.extensions.map((e, i) => <p key={i} className="text-sm text-text-2">Extension: {e.days} day{e.days === 1 ? '' : 's'} ({e.status}): {e.reason}</p>)}
            </Card>
            {data.drafts.length > 0 && (
              <Card className="space-y-2 p-4">
                <p className="font-medium">Drafts shared along the way ({data.drafts.length})</p>
                {data.drafts.map((d, i) => (
                  <p key={i} className="text-sm"><span className="text-text-2">{when(d.at)}:</span> {d.note || 'No note'} · {d.files.map((f) => (f.url ? <a key={f.name} className="mr-2 underline" href={f.url} target="_blank" rel="noreferrer noopener">{f.name}</a> : <span key={f.name} className="mr-2">{f.name}</span>))}</p>
                ))}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="space-y-1 p-4">
              {data.timeline.map((e, i) => <p key={i} className="flex justify-between gap-3 text-sm"><span>{e.type}</span><span className="text-text-2">{when(e.at)}</span></p>)}
            </Card>
          </TabsContent>
        </Tabs>

        <aside className="lg:sticky lg:top-4"><RulingPanel data={data} onChanged={reload} onDone={() => navigate('/disputes')} /></aside>
      </div>
    </div>
  )
}

function RulingPanel({ data, onChanged, onDone }: { data: DisputeCase; onChanged: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const { dispute, money: m, ruling } = data
  const [outcome, setOutcome] = useState<'release' | 'refund' | 'split'>('split')
  const [pct, setPct] = useState(50)
  const [reasons, setReasons] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const talentPct = outcome === 'release' ? 100 : outcome === 'refund' ? 0 : pct
  const split = useMemo(() => {
    const talent = Math.round(((m.held * talentPct) / 100) * 100) / 100
    return { talent, client: Math.round((m.held - talent) * 100) / 100 }
  }, [m.held, talentPct])

  async function run(label: string, fn: () => Promise<unknown>, success: string, thenDone = false) {
    setBusy(label)
    try {
      await fn()
      toast.success(success)
      if (thenDone) onDone()
      else onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (dispute.status === 'resolved' && ruling) {
    return (
      <Card className="space-y-2 p-4">
        <p className="font-medium">The ruling</p>
        <p className="text-sm">{ruling.outcome === 'split' ? `${ruling.talentPercent}% to the talent` : ruling.outcome === 'release' ? 'Released to the talent' : 'Refunded to the client'}: {money(ruling.talentAmount, m.currency)} to the talent, {money(ruling.clientRefund, m.currency)} back to the client.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm">{ruling.reasons}</p>
      </Card>
    )
  }
  if (dispute.status === 'resolved') {
    return <Card className="p-4 text-sm">The two sides agreed a way out{dispute.resolution?.kind ? ` (${dispute.resolution.kind.replace('_', ' ')})` : ''}.</Card>
  }
  if (dispute.status === 'open') {
    return (
      <Card className="space-y-2 p-4 text-sm">
        <p className="font-medium">Still with the two sides</p>
        <p className="text-text-2">They can agree a way out for up to 48 hours per offer, or either can ask the team to decide. It shows here once it is escalated.</p>
      </Card>
    )
  }

  if (ruling?.status === 'pending_approval') {
    const mine = ruling.decidedById === user?.id
    return (
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-warn" />Waiting for a second person</p>
        <p className="text-sm">{ruling.outcome === 'split' ? `${ruling.talentPercent}% to the talent` : ruling.outcome === 'release' ? 'Release to the talent' : 'Refund to the client'}: {money(ruling.talentAmount, m.currency)} to the talent, {money(ruling.clientRefund, m.currency)} back. It moves more than {money(m.secondPersonAbove, m.currency)}, so someone other than the person who ruled has to approve it.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm">{ruling.reasons}</p>
        {mine ? (
          <p className="text-sm text-text-2">You wrote this ruling, so another person has to approve it.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null} onClick={() => run('approve', () => api.approveRuling(dispute.id), 'Approved: the money is moving', true)}>
              {busy === 'approve' && <Loader2 className="animate-spin" />}Approve and send the money
            </Button>
            <Button variant="secondary" disabled={busy !== null} onClick={() => run('back', () => api.sendBackRuling(dispute.id, 'Sent back for another look'), 'Sent back')}>
              {busy === 'back' && <Loader2 className="animate-spin" />}Send back
            </Button>
          </div>
        )}
      </Card>
    )
  }

  if (ruling?.status === 'final') {
    return (
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-bad" />The money didn't move</p>
        <p className="text-sm">The ruling stands, but sending the money failed. Try again; it resumes where it stopped and never pays twice.</p>
        <Button disabled={busy !== null} onClick={() => run('retry', () => api.retryRuling(dispute.id), 'Done', true)}>{busy === 'retry' && <Loader2 className="animate-spin" />}Try the money again</Button>
      </Card>
    )
  }

  const reasonsOk = reasons.trim().length >= 80
  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="font-medium">Your ruling</p>
        <p className="text-sm text-text-2">Free for both sides, final, and shown to both with your reasons.</p>
      </div>
      <div role="tablist" aria-label="Outcome" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1 text-sm">
        {([['release', 'Release'], ['split', 'Split'], ['refund', 'Refund']] as const).map(([v, label]) => (
          <button key={v} role="tab" aria-selected={outcome === v} onClick={() => setOutcome(v)} className={cn('rounded-md px-2 py-2 font-semibold transition-[background-color,color] duration-200', outcome === v ? 'bg-card shadow-(--kd-shadow)' : 'text-text-2 hover:text-foreground')}>{label}</button>
        ))}
      </div>
      {outcome === 'split' && (
        <div className="space-y-1">
          <label htmlFor="pct" className="flex justify-between text-sm"><span>Talent's share</span><span className="tabular-nums font-medium">{pct}%</span></label>
          <input id="pct" type="range" min={1} max={99} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-text-2">To the talent</p><p className="font-medium tabular-nums">{money(split.talent, m.currency)}</p></div>
        <div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-text-2">Back to the client</p><p className="font-medium tabular-nums">{money(split.client, m.currency)}</p></div>
      </div>
      <p className="text-xs text-text-2">Of {money(m.held, m.currency)} held. The {money(m.fee, m.currency)} service fee is never refunded.</p>
      {m.needsSecondPerson && <p className="flex gap-2 rounded-lg bg-warn-tint p-3 text-sm"><AlertTriangle className="size-4 shrink-0 text-warn" />This is above {money(m.secondPersonAbove, m.currency)}, so a second person will have to approve it before any money moves.</p>}
      <div className="space-y-1">
        <label htmlFor="reasons" className="text-sm">Reasons, for both people to read</label>
        <Textarea id="reasons" value={reasons} onChange={(e) => setReasons(e.target.value)} rows={6} placeholder="What the brief asked for, what the evidence shows, and why this share." />
        <p className={cn('text-right text-xs tabular-nums', reasonsOk ? 'text-text-2' : 'text-bad')}>{reasons.trim().length} / 80 at least</p>
      </div>
      <Button glow className="w-full" disabled={!reasonsOk || busy !== null} onClick={() => run('rule', () => api.ruleDispute(dispute.id, { outcome, talentPercent: outcome === 'split' ? pct : undefined, reasons: reasons.trim() }), m.needsSecondPerson ? 'Sent for a second person to approve' : 'Ruled: the money is moving', true)}>
        {busy === 'rule' && <Loader2 className="animate-spin" />}{m.needsSecondPerson ? 'Send for approval' : 'Rule and send the money'}
      </Button>
    </Card>
  )
}
