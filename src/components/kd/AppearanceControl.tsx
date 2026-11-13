import { Monitor, Moon, Sun } from 'lucide-react'
import { useAppearance, type Appearance } from '@/lib/appearance'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Appearance; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

/**
 * System (the default, follows the device), Light or Dark. A segmented choice, kept per browser. `compact` shows only the
 * icons, for the narrow sidebar and the phone bar.
 */
export function AppearanceControl({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { pref, set } = useAppearance()
  return (
    <div role="radiogroup" aria-label="Appearance" className={cn('inline-flex gap-1 rounded-lg bg-secondary p-1', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = pref === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => set(value)}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97]',
              on ? 'bg-card text-foreground shadow-(--kd-shadow)' : 'text-text-2 hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {!compact && label}
          </button>
        )
      })}
    </div>
  )
}
