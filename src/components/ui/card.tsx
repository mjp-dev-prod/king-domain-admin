import * as React from "react"

import { cn } from "@/lib/utils"

/** What a card is telling you. Each tone keeps its colour's one job (see CLAUDE.md): brand = you can act, money = gold,
 *  ok = verified or done, warn = waiting on someone, bad = an error or past target. A tinted card is the tint over a card
 *  surface, so it is never darker than a plain one. */
type CardTone = "plain" | "brand" | "money" | "ok" | "warn" | "bad"

const cardTones: Record<CardTone, string> = {
  plain: "bg-card",
  brand: "bg-brand-tint",
  money: "bg-money-tint",
  ok: "bg-ok-tint",
  warn: "bg-warn-tint",
  bad: "bg-bad-tint",
}

function Card({
  className,
  tone = "plain",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { tone?: CardTone; interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        // A card is one surface step off what it sits on: no outline, no shadow (shadows are for things that float).
        "flex flex-col gap-6 rounded-xl py-6 text-card-foreground transition-[transform,background-color] duration-200 ease-out",
        cardTones[tone],
        interactive && "cursor-pointer hover:bg-surface-2 active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
