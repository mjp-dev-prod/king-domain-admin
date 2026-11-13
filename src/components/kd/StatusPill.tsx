import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

export type PillTone = 'brand' | 'money' | 'ok' | 'warn' | 'bad' | 'plain'

/**
 * A small status, in the app's colour language: brand = you can act, ok = verified or done, warn = waiting on someone,
 * bad = an error or past target, money = gold, plain = a quiet fact. Never use a tone for another tone's meaning.
 */
export function StatusPill({ tone = 'plain', icon, children }: { tone?: PillTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <Badge variant={tone}>
      {icon}
      {children}
    </Badge>
  )
}
