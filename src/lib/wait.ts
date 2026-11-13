import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** How long ago something started, in the words a reviewer scans: "just now", "5 h", "3 days". */
export function waitLabel(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

export type WaitTone = 'warn' | 'bad'

/**
 * Waiting is amber (waiting on someone); it turns red once it is past the queue's target. Without a known target
 * it stays amber: never claim lateness the queue has not defined.
 */
export function waitTone(iso: string, targetMinutes: number | null, now = Date.now()): WaitTone {
  if (targetMinutes === null) return 'warn'
  const minutes = (now - new Date(iso).getTime()) / 60000
  return minutes > targetMinutes ? 'bad' : 'warn'
}

// One fetch of the inbox serves every queue page: it carries each queue's target.
let cache: Promise<Record<string, number>> | null = null
function loadTargets(): Promise<Record<string, number>> {
  if (!cache) {
    cache = api
      .inbox()
      .then((r) => Object.fromEntries(r.queues.map((q) => [q.key, q.targetMinutes])))
      .catch(() => {
        cache = null // try again next time; a failure must not stick
        return {} as Record<string, number>
      })
  }
  return cache
}

/** The target, in minutes, for a queue ("authenticity", "skill-review", "identity"), or null while unknown. */
export function useQueueTarget(queueKey: string): number | null {
  const [target, setTarget] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    loadTargets().then((t) => {
      if (!cancelled) setTarget(t[queueKey] ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [queueKey])
  return target
}
