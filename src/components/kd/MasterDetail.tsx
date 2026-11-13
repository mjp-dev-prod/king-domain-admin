import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * List on the left, the open item on the right, side by side on wide screens so a reviewer clears a queue without
 * leaving the page. On a phone it is one pane at a time: the list, or the open item when there is one. Each pane
 * scrolls on its own on wide screens, so the list stays put while a long submission is read.
 */
export function MasterDetail({
  list,
  detail,
  hasSelection,
  empty,
}: {
  list: ReactNode
  detail: ReactNode
  hasSelection: boolean
  /** Shown on the right of a wide screen while nothing is open. */
  empty: ReactNode
}) {
  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-4 p-4 sm:p-6 lg:h-[calc(100dvh-0rem)] lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
      {/* Phone: only the list when nothing is open, and only the open item when something is. */}
      <section className={cn('min-w-0 lg:overflow-y-auto lg:pr-1', hasSelection && 'hidden lg:block')} aria-label="Queue">
        {list}
      </section>
      <section className={cn('min-w-0 lg:overflow-y-auto lg:pr-1', !hasSelection && 'hidden lg:block')} aria-label="Open item">
        {hasSelection ? detail : empty}
      </section>
    </div>
  )
}
