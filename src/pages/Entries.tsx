import { useEffect, useState } from 'react'
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type WaitlistEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

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
      .then(setData)
      .catch(() => setData({ entries: [], total: 0, pages: 1 }))
      .finally(() => setLoading(false))
  }, [page, debounced, role])

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:min-w-56 sm:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search email or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setRole(filter.value)
                  setPage(1)
                }}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3',
                  role === filter.value
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <Button variant="outline" asChild className="shrink-0">
            <a href={api.exportUrl({ search: debounced, role })}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </a>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading && !data ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {debounced || role ? 'Nothing matches those filters.' : 'No signups yet.'}
          </p>
        ) : (
          <>
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
                        <Badge
                          variant="outline"
                          className={cn(
                            entry.role === 'talent'
                              ? 'border-gold/40 text-gold'
                              : 'border-green-soft/40 text-green-soft',
                          )}
                        >
                          {entry.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.categories.map((category) => (
                            <span
                              key={category}
                              className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">
                        {entry.note ?? '—'}
                      </TableCell>
                      <TableCell className="tabular whitespace-nowrap text-right text-muted-foreground">
                        {formatDate(entry.joinedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div
              className={cn(
                'divide-y divide-border transition-opacity md:hidden',
                loading && 'opacity-50',
              )}
            >
              {data?.entries.map((entry) => (
                <div key={entry.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{entry.email}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0',
                        entry.role === 'talent'
                          ? 'border-gold/40 text-gold'
                          : 'border-green-soft/40 text-green-soft',
                      )}
                    >
                      {entry.role}
                    </Badge>
                  </div>

                  {entry.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.categories.map((category) => (
                        <span
                          key={category}
                          className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.note && (
                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                  )}

                  <p className="tabular text-xs text-muted-foreground">
                    {formatDate(entry.joinedAt)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

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
