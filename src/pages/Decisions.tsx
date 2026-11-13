import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Vote } from 'lucide-react'
import { api, type DecisionSummary, type DecisionStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/kd/PageHeader'
import { EmptyState, ErrorState } from '@/components/kd/states'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { findMilestone } from '@/lib/milestones'
import { FilterTabs } from '@/components/FilterTabs'
import { Sentry } from '@/lib/sentry'

const STATUS_FILTERS: { value: DecisionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

/** Open is waiting on the shareholders (amber); closed is settled (green). */
const STATUS_TONE: Record<DecisionStatus, 'warn' | 'ok'> = {
  open: 'warn',
  closed: 'ok',
}

function stanceSummary(counts: DecisionSummary['stanceCounts']) {
  const parts: string[] = []
  if (counts.agree) parts.push(`${counts.agree} agree`)
  if (counts.disagree) parts.push(`${counts.disagree} disagree`)
  if (counts.need_discussion) parts.push(`${counts.need_discussion} need discussion`)
  return parts.length ? parts.join(' · ') : 'No responses yet'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function Decisions() {
  const { user } = useAuth()
  const [status, setStatus] = useState<DecisionStatus | ''>('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    decisions: DecisionSummary[]
    total: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setLoading(true)
    api
      .decisions({ page, status: status || undefined })
      .then((d) => {
        setFailed(false)
        setData(d)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'decisions', request: 'list' } })
        // "No decisions yet" would be a lie after a failed load: show the failure and let them retry.
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [page, status, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const isOwner = user?.role === 'owner'

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Decisions"
        description="Questions put to the shareholders, and where each one stands."
        actions={
          isOwner && (
            <Button asChild size="sm" glow>
              <Link to="/decisions/new">
                <Plus className="size-4" />
                New decision
              </Link>
            </Button>
          )
        }
      />

      <FilterTabs
        label="Decision status"
        options={STATUS_FILTERS}
        value={status}
        onChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
      />

      {failed ? (
        <ErrorState message="Couldn't load the decisions." onRetry={retry} />
      ) : loading && !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3 p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : data && data.decisions.length === 0 ? (
        <EmptyState
          icon={Vote}
          title={status ? `No ${status} decisions` : 'No decisions posted yet'}
          action={
            isOwner &&
            !status && (
              <Button asChild size="sm">
                <Link to="/decisions/new">Post the first one</Link>
              </Button>
            )
          }
        >
          {status ? 'Try another filter to see the rest.' : 'When a decision is posted, the shareholders see it here and say where they stand.'}
        </EmptyState>
      ) : (
        <div className={cn('space-y-3 transition-opacity', loading && 'opacity-50')}>
          {data?.decisions.map((decision) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`} className="block">
              <Card interactive className="gap-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg leading-snug font-bold">{decision.title}</h3>
                  <Badge variant={STATUS_TONE[decision.status]} className="shrink-0 capitalize">
                    {decision.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-2">
                  {decision.milestoneRef && (
                    <span className="label text-violet-text">
                      Milestone {decision.milestoneRef}
                      {findMilestone(decision.milestoneRef) &&
                        ` — ${findMilestone(decision.milestoneRef)!.title}`}
                    </span>
                  )}
                  <span>{stanceSummary(decision.stanceCounts)}</span>
                  <span className="tabular">{formatDate(decision.createdAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!failed && data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-2">
            Page {page} of {data.pages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
