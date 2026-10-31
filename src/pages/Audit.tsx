import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { api, type AuditEvent } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Sentry } from '@/lib/sentry'

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function Audit() {
  const { user } = useAuth()
  const [action, setAction] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .audit({ action: action.trim() || undefined, subjectId: subjectId.trim() || undefined })
      .then((r) => {
        if (cancelled) return
        setEvents(r.events)
        setNextBefore(r.nextBefore)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'audit' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [action, subjectId, attempt])

  const loadMore = useCallback(
    (before: string) => {
      setLoadingMore(true)
      api
        .audit({ action: action.trim() || undefined, subjectId: subjectId.trim() || undefined, before })
        .then((r) => {
          setEvents((prev) => [...(prev ?? []), ...r.events])
          setNextBefore(r.nextBefore)
        })
        .catch((err: unknown) => {
          Sentry.captureException(err, { tags: { page: 'audit', request: 'more' } })
          setFailed(true)
        })
        .finally(() => setLoadingMore(false))
    },
    [action, subjectId],
  )

  if (!can(user, 'shareholder')) return <Navigate to="/" replace />

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Every action the team takes: who, when, what, and why. Nothing here can be changed.</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Action, e.g. proof.approve" value={action} onChange={(e) => setAction(e.target.value)} />
        <Input placeholder="Subject id" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
      </div>

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the audit log.</p>
          <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
        </Card>
      )}

      {!failed && events === null && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}

      {!failed && events?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ScrollText className="size-6 text-muted-foreground" />
          <p className="font-medium">No actions match</p>
          <p className="text-sm text-muted-foreground">Clear the filters to see everything, newest first.</p>
        </Card>
      )}

      {events?.map((e) => (
        <Card key={e.id} className="space-y-1 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-sm">{e.action}</p>
            <p className="text-xs text-muted-foreground">{when(e.createdAt)}</p>
          </div>
          <p className="text-sm">
            {e.actor.name ?? e.actor.email} <span className="text-muted-foreground">({e.actorRole})</span> · {e.subjectType} {e.subjectId.slice(0, 8)}
          </p>
          {e.note && <p className="text-sm text-muted-foreground">{e.note}</p>}
        </Card>
      ))}

      {nextBefore && (
        <Button variant="secondary" className="w-full" onClick={() => loadMore(nextBefore)} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load older'}
        </Button>
      )}
    </div>
  )
}
