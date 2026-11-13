import { useCallback, useEffect, useState } from 'react'
import { Download, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { api, type WaitlistEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/kd/PageHeader'
import { EmptyState, ErrorState } from '@/components/kd/states'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Sentry } from '@/lib/sentry'
import { FilterTabs } from '@/components/FilterTabs'

const ROLE_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'talent', label: 'Talent' },
  { value: 'client', label: 'Clients' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** A category the person picked: a quiet chip, not a status. */
function CategoryChip({ children }: { children: string }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-text-2">{children}</span>
}

export function Entries() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<{
    entries: WaitlistEntry[]
    total: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setLoading(true)
    api
      .entries({ page, search: debounced, role })
      .then((d) => {
        setFailed(false)
        setData(d)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'entries', request: 'list' } })
        // "No signups yet" would be untrue after a failed load: show the failure, with a retry.
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [page, debounced, role, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const filtered = Boolean(debounced || role)

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Entries"
        description="Everyone who joined the waitlist, and what they said they need."
        actions={
          <Button variant="secondary" size="sm" asChild className="shrink-0">
            <a href={api.exportUrl({ search: debounced, role })}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </a>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:min-w-56 sm:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-2" />
          <Input
            placeholder="Search email or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <FilterTabs
          label="Signup side"
          options={ROLE_FILTERS}
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
        />
      </div>

      {failed ? (
        <ErrorState message="Couldn't load the entries." onRetry={retry} />
      ) : loading && !data ? (
        <Card className="space-y-2 p-5" aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : data && data.entries.length === 0 ? (
        <EmptyState icon={Users} title={filtered ? 'Nothing matches those filters' : 'No signups yet'}>
          {filtered ? 'Clear the search or pick Everyone to see the rest.' : 'People who join the waitlist appear here as they sign up.'}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Table on wider screens; cards below, where five columns stop
              being readable. */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn('transition-opacity', loading && 'opacity-50')}>
                {data?.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>
                      <Badge variant="plain" className="capitalize">
                        {entry.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {entry.categories.map((category) => (
                          <CategoryChip key={category}>{category}</CategoryChip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-text-2">
                      {entry.note ?? '—'}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap text-right text-text-2">
                      {formatDate(entry.joinedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div
            className={cn(
              'divide-y divide-line transition-opacity md:hidden',
              loading && 'opacity-50',
            )}
          >
            {data?.entries.map((entry) => (
              <div key={entry.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">{entry.email}</p>
                  <Badge variant="plain" className="shrink-0 capitalize">
                    {entry.role}
                  </Badge>
                </div>

                {entry.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.categories.map((category) => (
                      <CategoryChip key={category}>{category}</CategoryChip>
                    ))}
                  </div>
                )}

                {entry.note && <p className="text-sm text-text-2">{entry.note}</p>}

                <p className="tabular text-xs text-text-2">{formatDate(entry.joinedAt)}</p>
              </div>
            ))}
          </div>
        </Card>
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
