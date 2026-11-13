import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, type QueueSummary } from '@/lib/api'

/**
 * The inbox's per-queue counts, kept fresh for the sidebar: loaded on every navigation (a decision just made changes a
 * count) and again every minute (work arrives while a page is open). A failed load keeps the last numbers rather than
 * blanking them. Only queues the signed-in admin may see come back, so the sidebar never advertises one they cannot open.
 */
export function useQueueSummaries(): Record<string, QueueSummary> {
  const location = useLocation()
  const [byPath, setByPath] = useState<Record<string, QueueSummary>>({})

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .inbox()
        .then((r) => !cancelled && setByPath(Object.fromEntries(r.queues.map((q) => [q.path, q]))))
        .catch(() => {})
    load()
    const timer = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [location.pathname])

  return byPath
}
