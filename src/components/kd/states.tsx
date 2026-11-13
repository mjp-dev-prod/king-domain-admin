import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * A loading state is held at least `minMs` so it never flashes (brand v1): it turns on at once, and only turns off
 * once the minimum has passed.
 */
export function useHeldLoading(loading: boolean, minMs = 300): boolean {
  const [held, setHeld] = useState(loading)
  const startedAt = useRef<number | null>(loading ? Date.now() : null)
  useEffect(() => {
    if (loading) {
      startedAt.current = Date.now()
      setHeld(true)
      return
    }
    if (startedAt.current === null) {
      setHeld(false)
      return
    }
    const left = Math.max(0, minMs - (Date.now() - startedAt.current))
    const t = setTimeout(() => {
      startedAt.current = null
      setHeld(false)
    }, left)
    return () => clearTimeout(t)
  }, [loading, minMs])
  return held
}

/** Skeleton rows shaped like a queue row, so the page does not jump when the data arrives. */
export function LoadingList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} className="flex-row items-center gap-3 p-3">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Says why there is nothing, and what happens next. Every empty state offers a way forward. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="items-center gap-2 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-lg bg-secondary text-text-2">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-text-2">{children}</p>}
      {action && <div className="pt-2">{action}</div>}
    </Card>
  )
}

/** A failed load, with a Retry. Errors are inline, never a dead end. */
export function ErrorState({ message = "Couldn't load this.", onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Card tone="bad" className="flex-row items-center justify-between gap-3 p-4" role="alert">
      <p className="flex items-center gap-2 text-sm font-medium text-bad">
        <AlertCircle className="size-4 shrink-0" />
        {message}
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  )
}
