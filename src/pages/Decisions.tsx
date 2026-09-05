import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { api, type DecisionSummary, type DecisionStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { findMilestone } from '@/lib/milestones'

const STATUS_FILTERS: { value: DecisionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_STYLES: Record<DecisionStatus, string> = {
  open: 'border-open/40 text-open',
  closed: 'border-settled/40 text-settled',
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

  useEffect(() => {
    setLoading(true)
    api
      .decisions({ page, status: status || undefined })
      .then(setData)
      .catch(() => setData({ decisions: [], total: 0, pages: 1 }))
      .finally(() => setLoading(false))
  }, [page, status])

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatus(filter.value)
                setPage(1)
              }}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3',
                status === filter.value
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {user?.role === 'owner' && (
          <Button asChild size="sm">
            <Link to="/decisions/new">
              <Plus className="size-4" />
              New decision
            </Link>
          </Button>
        )}
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : data && data.decisions.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {status ? `No ${status} decisions.` : 'No decisions posted yet.'}
        </Card>
      ) : (
        <div className={cn('space-y-3 transition-opacity', loading && 'opacity-50')}>
          {data?.decisions.map((decision) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`}>
              <Card className="gap-2 p-5 transition-colors hover:border-gold/40">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg leading-snug font-semibold">
                    {decision.title}
                  </h3>
                  <Badge variant="outline" className={cn('shrink-0', STATUS_STYLES[decision.status])}>
                    {decision.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {decision.milestoneRef && (
                    <span className="label text-gold">
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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {data.pages} · {data.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
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
