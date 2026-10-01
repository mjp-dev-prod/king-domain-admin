import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string; count?: number | null }

/** The row of status/role filters used across list pages. Phone-sized taps below `sm`. */
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
    <div role="tablist" aria-label={label} className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex min-h-10 items-center rounded-md px-3 text-sm transition-colors sm:min-h-0 sm:py-1.5',
            value === option.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
          {option.count != null && <span className="tabular ml-1.5 text-xs text-muted-foreground">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
