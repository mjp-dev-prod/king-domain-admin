import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, RefreshCw, UserSearch } from 'lucide-react'
import { api, ApiError, type ShortlistDetail, type ShortlistRow, type TalentFact } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h on the clock`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} on the clock`
}

const money = (currency: string, amount: string | number) => `${currency === 'USD' ? '$' : '₦'}${Number(amount).toLocaleString()}`

export function Shortlists() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'support')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [status, setStatus] = useState<'waiting' | 'sent'>('waiting')
  const [rows, setRows] = useState<ShortlistRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .shortlists(status)
      .then((r) => {
        if (cancelled) return
        setRows(r.requests)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'shortlists', request: 'list' } })
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
          <h1 className="font-display text-2xl font-semibold">Shortlists</h1>
          <p className="text-sm text-muted-foreground">"Find someone for me". Ask 3 to 5 verified talents first, then send only those who said yes.</p>
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
          { value: 'waiting', label: 'Waiting' },
          { value: 'sent', label: 'Sent' },
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
          <UserSearch className="size-6 text-muted-foreground" />
          <p className="font-medium">{status === 'waiting' ? 'No requests waiting' : 'Nothing sent yet'}</p>
          <p className="text-sm text-muted-foreground">Clients' "find someone for me" requests appear here.</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/shortlists/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.client}</p>
              <Badge variant="outline">{r.skillLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {r.status === 'sent' ? 'Sent' : waiting(r.clockStartedAt)} · {r.items} asked · {r.yes} said yes
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function TalentLine({ t }: { t: TalentFact }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium">
        {t.fullName} {t.newOnKingDomain && <Badge variant="outline" className="ml-1">New on King Domain</Badge>}
      </p>
      <p className="text-sm text-muted-foreground">
        {t.verifiedSkills.map((s) => s.label).join(', ')} · {t.completedJobs} completed · active {t.lastActive.replace('_', ' ')}
        {t.region ? ` · ${[t.region.city, t.region.state, t.region.country].filter(Boolean).join(', ')}` : ''}
      </p>
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const [data, setData] = useState<ShortlistDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [lines, setLines] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .shortlist(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'shortlists', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const refresh = () => setAttempt((n) => n + 1)

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try {
      await fn()
      toast.success(done)
      refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/shortlists" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this request.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { request: r, items, candidates, limits } = data
  const open = r.status === 'requested' || r.status === 'building'
  const yes = items.filter((i) => i.available === true).length
  const canSend = open && yes >= limits.min && yes <= limits.max

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/shortlists" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All requests</Link>

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">{r.client.fullName}</p>
          <Badge variant="outline">{r.skillLabel} · {money(r.currency, r.budget)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{waiting(r.clockStartedAt)}</p>
        {r.note && <p className="text-sm">{r.note}</p>}
        <div className="space-y-0.5 text-sm">
          {Object.entries(r.brief).map(([k, v]) => (
            <p key={k}><span className="text-muted-foreground">{k}: </span>{String(v)}</p>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-medium">The list ({yes} of {limits.min} to {limits.max} have said yes)</p>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nobody asked yet. Pick from the candidates below.</p>}
        {items.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
            <div className="space-y-1">
              <TalentLine t={i.talent} />
              <p className="text-sm">{i.reason}</p>
              <p className="text-xs text-muted-foreground">
                {i.available === true ? 'Said yes' : i.available === false ? 'Said no' : 'Waiting for their answer'}
              </p>
            </div>
            {open && (
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => act(`rm-${i.id}`, () => api.shortlistRemove(r.id, i.id), 'Removed')}>Remove</Button>
            )}
          </div>
        ))}
        {open && (
          <Button onClick={() => act('send', () => api.shortlistSend(r.id), 'Sent to the client')} disabled={!canSend || busy !== null}>
            {busy === 'send' && <Loader2 className="animate-spin" />} Send the shortlist
          </Button>
        )}
        {open && !canSend && <p className="text-xs text-muted-foreground">Only talents who said yes are sent, and only {limits.min} to {limits.max} of them.</p>}
      </Card>

      {open && (
        <Card className="space-y-3 p-4">
          <p className="font-medium">Candidates</p>
          <p className="text-sm text-muted-foreground">Verified in this skill, recently active first. Include a verified newcomer where one fits. Each is asked before the client sees them.</p>
          {candidates.length === 0 && <p className="text-sm">No more verified talents in this skill.</p>}
          {candidates.map((c) => (
            <div key={c.id} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <TalentLine t={c} />
              <div className="flex gap-2">
                <Input value={lines[c.id] ?? ''} placeholder="One line on why they fit" onChange={(e) => setLines((cur) => ({ ...cur, [c.id]: e.target.value }))} />
                <Button
                  variant="secondary"
                  disabled={(lines[c.id] ?? '').trim().length < 10 || busy !== null}
                  onClick={() => act(`ask-${c.id}`, () => api.shortlistAsk(r.id, { talentId: c.id, reason: (lines[c.id] ?? '').trim() }), 'Asked')}
                >
                  {busy === `ask-${c.id}` && <Loader2 className="animate-spin" />} Ask
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
