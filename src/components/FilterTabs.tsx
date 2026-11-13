import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string; count?: number | null }

/** The row of status/role filters used across list pages: a segmented choice. Phone-sized taps below `sm`. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
      {options.map((option) => {
        const on = value === option.value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] sm:min-h-8',
              on ? 'bg-card text-foreground shadow-(--kd-shadow)' : 'text-text-2 hover:text-foreground',
            )}
          >
            {option.label}
            {option.count != null && <span className="tabular ml-1.5 text-xs font-medium text-text-3">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
