import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { StatusPill } from '@/components/kd/StatusPill'
import { WorkPreview, type WorkPreviewData } from '@/components/kd/WorkPreview'
import { waitLabel, waitTone } from '@/lib/wait'
import { cn } from '@/lib/utils'

/**
 * One item in a review queue: a look at the work, who it is from, which skill, how long it has waited (amber, red once
 * past the queue's target), and anything the reviewer must know first. The whole row is the link; the selected row is
 * tinted. Identity rows pass no preview: identity documents are private IDs and are never shown in a list.
 */
export function QueueRow({
  to,
  selected,
  name,
  skill,
  since,
  targetMinutes,
  preview,
  showPreview = true,
  fallbackIcon,
  flags,
}: {
  to: string
  selected?: boolean
  name: string
  skill?: string
  since: string
  targetMinutes: number | null
  preview?: WorkPreviewData | null
  showPreview?: boolean
  fallbackIcon?: ComponentType<{ className?: string }>
  flags?: ReactNode
}) {
  const tone = waitTone(since, targetMinutes)
  return (
    <Link
      to={to}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl p-3 transition-[transform,background-color] duration-200 ease-out active:scale-[0.99]',
        selected ? 'bg-brand-tint' : 'bg-card hover:bg-surface-2',
      )}
    >
      {showPreview && <WorkPreview preview={preview} fallbackIcon={fallbackIcon} />}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{name}</p>
          <StatusPill tone={tone} icon={<Clock />}>
            {waitLabel(since)}
          </StatusPill>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {skill && <StatusPill tone="plain">{skill}</StatusPill>}
          {flags}
        </div>
      </div>
    </Link>
  )
}
