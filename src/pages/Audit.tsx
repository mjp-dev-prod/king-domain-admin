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
import { PageHeader } from '@/components/kd/PageHeader'
import { EmptyState, ErrorState } from '@/components/kd/states'
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
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader title="Audit log" description="Every action the team takes: who, when, what, and why. Nothing here can be changed." />

      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Action, e.g. proof.approve" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action" />
        <Input placeholder="Subject id" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Filter by subject id" />
      </div>

      {failed && <ErrorState message="Couldn't load the audit log." onRetry={() => setAttempt((n) => n + 1)} />}

      {!failed && events === null && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!failed && events?.length === 0 && (
        <EmptyState icon={ScrollText} title="No actions match">
          Clear the filters to see everything, newest first.
        </EmptyState>
      )}

      <div className="space-y-2">
        {events?.map((e) => (
          <Card key={e.id} className="gap-1 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-sm">{e.action}</p>
              <p className="tabular text-xs text-text-2">{when(e.createdAt)}</p>
            </div>
            <p className="text-sm">
              {e.actor.name ?? e.actor.email} <span className="text-text-2">({e.actorRole})</span> · {e.subjectType} {e.subjectId.slice(0, 8)}
            </p>
            {e.note && <p className="text-sm text-text-2">{e.note}</p>}
          </Card>
        ))}
      </div>

      {nextBefore && (
        <Button variant="secondary" className="w-full" onClick={() => loadMore(nextBefore)} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load older'}
        </Button>
      )}
    </div>
  )
}
