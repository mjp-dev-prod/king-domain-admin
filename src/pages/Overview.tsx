import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { api, type Stats } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const dailyChartConfig = {
  count: { label: 'Signups', color: 'var(--color-gold)' },
} satisfies ChartConfig

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="gap-1 p-5">
      <p className="label">{label}</p>
      <p className="tabular font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

/** Signups per day. A bar per day beats a line chart at this data volume. */
function DailyChart({ daily }: { daily: Stats['daily'] }) {
  if (daily.length === 0) return null
  const peak = Math.max(...daily.map((d) => d.count))

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="label">Signups per day</p>
        <p className="tabular text-xs text-muted-foreground">peak {peak}</p>
      </div>

      <ChartContainer config={dailyChartConfig} className="aspect-auto h-40 w-full">
        <BarChart data={daily} margin={{ left: -20, right: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, (max: number) => Math.max(4, max)]}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--secondary)' }}
            content={<ChartTooltipContent labelFormatter={(value) => formatShortDate(value as string)} />}
          />
          <Bar dataKey="count" fill="var(--color-gold)" radius={[3, 3, 0, 0]} maxBarSize={48} />
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
        <p className="text-sm text-muted-foreground">
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
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-gold" /> Talent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-green-soft" /> Clients
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((row) => (
          <div key={row.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm">{row.category}</span>
                <span className="tabular text-xs text-muted-foreground">
                  {row.talent} / {row.client}
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-gold transition-all duration-700"
                  style={{ width: `${(row.talent / peak) * 100}%` }}
                />
                <div
                  className="bg-green-soft transition-all duration-700"
                  style={{ width: `${(row.client / peak) * 100}%` }}
                />
              </div>
            </div>
            <span className="tabular w-8 text-right font-display text-lg font-semibold">
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
      .catch(() => setNotes([]))
  }, [])

  return (
    <Card className="p-5">
      <p className="label mb-1">In their own words</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Free-text answers — the categories we didn&rsquo;t offer.
      </p>

      {notes === null ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing written in yet.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 border-b border-border pb-2 text-sm last:border-0"
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

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => setError('Could not load stats.'))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>

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
