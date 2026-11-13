import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Clock, Loader2, RefreshCw, UserSearch } from 'lucide-react'
import { api, ApiError, type ShortlistDetail, type ShortlistRow, type TalentFact } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueTarget, waitLabel, waitTone } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterTabs } from '@/components/FilterTabs'
import { Money } from '@/components/kd/Money'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { Sentry } from '@/lib/sentry'

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
  const target = useQueueTarget('shortlist')

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
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title="Shortlists"
        description={'"Find someone for me". Ask 3 to 5 verified talents first, then send only those who said yes.'}
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
          { value: 'waiting', label: 'Waiting' },
          { value: 'sent', label: 'Sent' },
        ]}
      />

      {failed && <ErrorState message="Couldn't load the list." onRetry={reload} />}
      {!failed && rows === null && <LoadingList rows={3} />}
      {!failed && rows?.length === 0 && (
        <EmptyState icon={UserSearch} title={status === 'waiting' ? 'No requests waiting' : 'Nothing sent yet'}>
          Clients' "find someone for me" requests appear here.
        </EmptyState>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link key={r.id} to={`/shortlists/${r.id}`} className="block">
            <Card interactive className="gap-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{r.client}</p>
                <StatusPill>{r.skillLabel}</StatusPill>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-2">
                {r.status === 'sent' ? (
                  <StatusPill tone="ok">Sent</StatusPill>
                ) : (
                  <StatusPill tone={waitTone(r.clockStartedAt, target)} icon={<Clock />}>
                    {waitLabel(r.clockStartedAt)} on the clock
                  </StatusPill>
                )}
                <span>
                  {r.items} asked · {r.yes} said yes
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TalentLine({ t }: { t: TalentFact }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium">
        {t.fullName}{' '}
        {t.newOnKingDomain && (
          <StatusPill tone="brand">New on King Domain</StatusPill>
        )}
      </p>
      <p className="text-sm text-text-2">
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
  const retry = () => {
    setData(null)
    setFailed(false)
    refresh()
  }

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

  const back = (label: string) => (
    <Link to="/shortlists" className="inline-flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  )

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {back('Back')}
        <ErrorState message="Couldn't open this request." onRetry={retry} />
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

  const { request: r, items, candidates, limits } = data
  const open = r.status === 'requested' || r.status === 'building'
  const yes = items.filter((i) => i.available === true).length
  const canSend = open && yes >= limits.min && yes <= limits.max

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {back('All requests')}

      <PageHeader
        title={r.client.fullName}
        description={`${waitLabel(r.clockStartedAt)} on the clock`}
        actions={
          <>
            <StatusPill>{r.skillLabel}</StatusPill>
            <Money amount={r.budget} currency={r.currency} className="text-xl" />
          </>
        }
      />

      <Card className="gap-2 p-5">
        {r.note && <p className="text-sm">{r.note}</p>}
        <div className="space-y-0.5 text-sm">
          {r.briefLines
            ? r.briefLines.map((l) => (
                <p key={l.key}>
                  <span className="text-text-2">{l.label}: </span>
                  {l.value}
                </p>
              ))
            : Object.entries(r.brief).map(([k, v]) => (
                <p key={k}>
                  <span className="text-text-2">{k}: </span>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </p>
              ))}
        </div>
      </Card>

      <Card className="gap-3 p-5">
        <p className="font-semibold">
          The list ({yes} of {limits.min} to {limits.max} have said yes)
        </p>
        {items.length === 0 && <p className="text-sm text-text-2">Nobody asked yet. Pick from the candidates below.</p>}
        {items.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
            <div className="space-y-1">
              <TalentLine t={i.talent} />
              <p className="text-sm">{i.reason}</p>
              {i.available === true ? (
                <StatusPill tone="ok">Said yes</StatusPill>
              ) : i.available === false ? (
                <StatusPill>Said no</StatusPill>
              ) : (
                <StatusPill tone="warn">Waiting for their answer</StatusPill>
              )}
            </div>
            {open && (
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => act(`rm-${i.id}`, () => api.shortlistRemove(r.id, i.id), 'Removed')}>
                Remove
              </Button>
            )}
          </div>
        ))}
        {open && (
          <Button glow className="w-fit" onClick={() => act('send', () => api.shortlistSend(r.id), 'Sent to the client')} disabled={!canSend || busy !== null}>
            {busy === 'send' && <Loader2 className="animate-spin" />} Send the shortlist
          </Button>
        )}
        {open && !canSend && (
          <p className="text-xs text-text-2">
            Only talents who said yes are sent, and only {limits.min} to {limits.max} of them.
          </p>
        )}
      </Card>

      {open && (
        <Card className="gap-3 p-5">
          <p className="font-semibold">Candidates</p>
          <p className="text-sm text-text-2">Verified in this skill, recently active first. Include a verified newcomer where one fits. Each is asked before the client sees them.</p>
          {candidates.length === 0 && <p className="text-sm">No more verified talents in this skill.</p>}
          {candidates.map((c) => (
            <div key={c.id} className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
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
