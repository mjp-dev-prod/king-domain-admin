import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/kd/PageHeader'
import { cn } from '@/lib/utils'

/** A number with a caption: the figure is Public Sans 800 with lining numbers, the caption a mono eyebrow. */
export function StatTile({
  label,
  value,
  sub,
  tone = 'plain',
  className,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: 'plain' | 'brand' | 'money' | 'ok' | 'warn' | 'bad'
  className?: string
}) {
  return (
    <Card tone={tone} className={cn('gap-1 p-4', className)}>
      <Eyebrow>{label}</Eyebrow>
      <p className="tabular text-3xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="text-sm text-text-2">{sub}</p>}
    </Card>
  )
}
