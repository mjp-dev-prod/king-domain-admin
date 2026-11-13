import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A mono, uppercase label: for eyebrows and step numbers only (brand v1). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('label', className)}>{children}</p>
}

/** The top of a page: a title, one line saying what it is for, and the page's actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-text-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
