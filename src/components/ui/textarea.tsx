import * as React from "react"

import { cn } from "@/lib/utils"

/** A multi-line field, styled like Input: filled, with an edge that can be found (3:1), a violet focus ring. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-md border border-input bg-secondary px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-text-3 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
