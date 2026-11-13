import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The browser's own select, styled to match `Input` (same surface, radius and focus ring). Use it where a short list of
 * plain options is enough; it keeps the phone's native picker, which is the better control on a small screen.
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-11 w-full rounded-md border border-input bg-secondary px-2 text-base outline-none transition-[color,box-shadow] sm:h-9 sm:text-sm',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
