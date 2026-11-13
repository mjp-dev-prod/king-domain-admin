import type { ComponentType, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Eyebrow } from '@/components/kd/PageHeader'
import { cn } from '@/lib/utils'

/**
 * The frame of the pages you see before signing in (they have no Shell around them): a centred card on the ground colour,
 * the KD mark as in the Shell, a Public Sans title and an optional line under it. Works in both themes because the card
 * and ground come from the tokens; only the KD tile is fixed, as in the Shell, because the mark never changes colour.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-[#0d0a16] font-logo text-2xl font-bold text-[#f2c14e]">KD</span>
          <Eyebrow className="mt-3">King Domain Admin</Eyebrow>
        </div>

        <Card className="gap-5 p-6 sm:p-7">
          <div>
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
          </div>
          {children}
        </Card>

        {footer && <div className="mt-5 text-center text-xs text-text-2">{footer}</div>}
      </div>
    </div>
  )
}

/** A result inside the auth card: done (green) or something wrong (red), with an icon and a next step under it. */
export function AuthNotice({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: 'ok' | 'bad'
  icon: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      tone={tone}
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn('animate-in fade-in slide-in-from-top-1 items-center gap-3 p-4 text-center', className)}
    >
      <span className={cn('grid size-9 place-items-center rounded-full bg-card', tone === 'ok' ? 'text-ok' : 'text-bad')}>
        <Icon className="size-4" />
      </span>
      {children}
    </Card>
  )
}

/** What the page is waiting on while it checks a link. Skeleton lines hold the shape, so nothing jumps when it resolves. */
export function AuthChecking({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <p className="text-sm text-text-2">{children}</p>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}
