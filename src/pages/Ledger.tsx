import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LEDGER_MILESTONES, LEDGER_ADDENDUM, type LedgerMilestone, type MilestoneStatus } from '@/lib/ledgerData'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  settled: 'Settled',
  partial: 'Partially settled',
  open: 'Open',
}

/** Settled is done (green). Partial and open are both still waiting on a decision (amber); the label says which. */
const STATUS_TONE: Record<MilestoneStatus, 'ok' | 'warn'> = {
  settled: 'ok',
  partial: 'warn',
  open: 'warn',
}

function MilestoneCard({
  milestone: m,
  defaultOpen,
}: {
  milestone: LedgerMilestone
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-surface-2"
      >
        <div className="space-y-1">
          <p className="label text-violet-text">Milestone {m.ref}</p>
          <h3 className="text-lg font-bold">{m.title}</h3>
          <p className="text-sm text-text-2">{m.question}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
          <ChevronDown
            className={cn(
              'size-4 text-text-2 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      <div
        style={{
          maxHeight: open ? (contentRef.current?.scrollHeight ?? 2000) : 0,
        }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="space-y-4 border-t border-line p-5">
          {m.decisionSummary && (
            <div className="rounded-lg bg-ok-tint p-3">
              <p className="mb-1 text-xs font-semibold text-ok">
                Decision{m.decisionDate ? ` — ${m.decisionDate}` : ''}
              </p>
              <p className="text-sm leading-relaxed">{m.decisionSummary}</p>
            </div>
          )}

          {m.sections.map((section, i) => (
            <div key={i}>
              <p className="mb-1.5 text-sm font-semibold">{section.heading}</p>
              <ul className="space-y-1 text-sm text-text-2">
                {section.items.map((item, j) => (
                  <li key={j}>· {item}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="border-t border-line pt-3">
            <Eyebrow className="mb-1">Weekly Log</Eyebrow>
            <p className="text-sm text-text-2">{m.weeklyLog}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function Ledger() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <PageHeader
          eyebrow="Working Ledger · Student Talent Marketplace"
          title="Decision Ledger & Weekly Report"
          description="Seven milestones, in the sequence the product vision itself lays out. Each one closes when an open question becomes a settled decision — not when a date passes."
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
          <span>
            Source: <strong className="text-foreground">Product Vision v0.1</strong>
          </span>
          <span>
            Cadence: <strong className="text-foreground">Weekly, minimum</strong>
          </span>
        </div>
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-sm leading-relaxed text-text-2">
          This ledger exists because the vision document is explicit about what it hasn't decided
          yet, and we agreed not to skip past that into engineering. A milestone is done when its
          governing question has a real answer — reasoned, written down, and defensible to a
          client later — not when we've talked around it long enough to move on.
        </p>
        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold">No MVP mentality</p>
            <p className="text-xs text-text-2">
              Depth over speed. A thin slice is for validating the model, not shipping something
              half-considered.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Decisions, not vibes</p>
            <p className="text-xs text-text-2">
              Every "settled" status links to the reasoning that settled it, so it can be
              revisited on evidence.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Stakeholder cadence</p>
            <p className="text-xs text-text-2">
              Weekly reporting exists so everyone stays aligned on what's real progress and what's
              still open.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-extrabold">The Seven Milestones</h2>

        {LEDGER_MILESTONES.map((m) => (
          <MilestoneCard key={m.ref} milestone={m} defaultOpen={m.status !== 'open'} />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-extrabold">Decided outside the sequence</h2>
        <p className="text-sm text-text-2">
          Two calls were made ahead of their "natural" milestone, deliberately rather than by
          drift — recorded here so the ledger stays honest about what's actually settled.
        </p>
        {LEDGER_ADDENDUM.map((item, i) => (
          <Card key={i} className="gap-1 p-4">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-sm text-text-2">{item.body}</p>
          </Card>
        ))}
      </div>

      <p className="border-t border-line pt-4 text-xs text-text-2">
        Sourced from <em>Student Talent Marketplace — Product Vision v0.1</em>. As milestones
        close, their status here moves from open to settled and the reasoning gets folded back
        into the vision doc's own decision register.
      </p>
    </div>
  )
}
