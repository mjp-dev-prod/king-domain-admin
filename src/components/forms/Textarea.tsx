import * as React from 'react'
import { cn } from '@/lib/utils'

/** A multi-line field styled to match `Input` (same surface, radius and focus ring), so forms read as one family. */
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-secondary px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-text-3 sm:text-sm',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
