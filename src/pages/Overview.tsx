import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { api, ApiError, type Stats } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/kd/states'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatTile as Tile } from '@/components/kd/StatTile'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Sentry } from '@/lib/sentry'

const dailyChartConfig = {
  count: { label: 'Signups', color: 'var(--kd-violet)' },
} satisfies ChartConfig

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return <Tile label={label} value={value} sub={hint} className="p-5" />
}

/** Signups per day. A bar per day beats a line chart at this data volume. */
function DailyChart({ daily }: { daily: Stats['daily'] }) {
  if (daily.length === 0) return null
  const peak = Math.max(...daily.map((d) => d.count))

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="label">Signups per day</p>
        <p className="tabular text-xs text-text-2">peak {peak}</p>
      </div>

      <ChartContainer config={dailyChartConfig} className="aspect-auto h-40 w-full">
        <BarChart data={daily} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--kd-line)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            domain={[0, (max: number) => Math.max(4, max)]}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--kd-brand-tint)' }}
            content={<ChartTooltipContent labelFormatter={(value) => formatShortDate(value as string)} />}
          />
          <Bar dataKey="count" fill="var(--kd-violet)" radius={[3, 3, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ChartContainer>
    </Card>
  )
}

/**
 * Category demand, split by side of the marketplace. This is the view that
 * feeds the open taxonomy decision — a category with talent but no clients
 * (or the reverse) is a real signal, not just a total.
 */
function CategoryDemand({ categories }: { categories: Stats['categories'] }) {
  if (categories.length === 0) {
    return (
      <Card className="p-5">
        <p className="label mb-2">Category demand</p>
        <p className="text-sm text-text-2">
          Nothing picked yet. This fills in as people join.
        </p>
      </Card>
    )
  }

  const peak = Math.max(...categories.map((c) => c.total))

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="label">Category demand</p>
        <p className="flex items-center gap-3 text-xs text-text-2">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" /> Talent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-text-3" /> Clients
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((row) => (
          <div key={row.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm">{row.category}</span>
                <span className="tabular text-xs text-text-2">
                  {row.talent} / {row.client}
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-primary transition-all duration-700"
                  style={{ width: `${(row.talent / peak) * 100}%` }}
                />
                <div
                  className="bg-text-3 transition-all duration-700"
                  style={{ width: `${(row.client / peak) * 100}%` }}
                />
              </div>
            </div>
            <span className="tabular w-8 text-right text-lg font-extrabold">
              {row.total}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Notes() {
  const [notes, setNotes] = useState<
    { id: string; note: string; role: string; joinedAt: string }[] | null
  >(null)

  useEffect(() => {
    api
      .notes()
      .then((d) => setNotes(d.notes))
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'overview', request: 'notes' } })
        setNotes([])
      })
  }, [])

  return (
    <Card className="p-5">
      <p className="label mb-1">In their own words</p>
      <p className="mb-4 text-xs text-text-2">
        Free-text answers — the categories we didn&rsquo;t offer.
      </p>

      {notes === null ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-text-2">Nothing written in yet.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 p-3 text-sm"
            >
              <span>{note.note}</span>
              <span className="label shrink-0">{note.role}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((err: unknown) => {
        // Report the real cause (status code, message, or a raw network
        // failure) to Sentry — the UI still shows a short message, but
        // this is what actually lets us diagnose a device-specific report
        // like "works everywhere except this one iPhone" instead of only
        // seeing a screenshot of a generic string.
        Sentry.captureException(err, { tags: { page: 'overview', request: 'stats' } })

        if (err instanceof ApiError) {
          setError(
            err.status === 0
              ? 'Could not reach the server. Check your connection and try again.'
              : `Could not load stats (${err.status}): ${err.message}`,
          )
        } else {
          setError('Could not load stats — an unexpected error occurred.')
        }
      })
  }, [attempt])

  if (error) return <ErrorState message={error} onRetry={() => { setError(''); setAttempt((n) => n + 1) }} />

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader title="Overview" description="Who has joined the waitlist, and what they asked for." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="On the waitlist" value={stats.total} />
        <StatTile
          label="Talent"
          value={stats.talent}
          hint={stats.total ? `${Math.round((stats.talent / stats.total) * 100)}% of signups` : undefined}
        />
        <StatTile
          label="Clients"
          value={stats.client}
          hint={stats.total ? `${Math.round((stats.client / stats.total) * 100)}% of signups` : undefined}
        />
        <StatTile label="Wrote something" value={stats.withNote} hint="Free-text answers" />
      </div>

      <DailyChart daily={stats.daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDemand categories={stats.categories} />
        <Notes />
      </div>
    </div>
  )
}
