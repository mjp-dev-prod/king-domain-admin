import { useCallback, useEffect, useRef, useState } from 'react'
import { atLeast } from '@/lib/hold'
import { Sentry } from '@/lib/sentry'

/**
 * A review queue's list: loading, failed (with a retry), and the rows. `remove` drops a row the moment it is handled, so
 * the list on the left is already right when the reviewer moves to the next item. A failure is reported once to Sentry
 * with the page that raised it.
 */
export function useQueueList<T extends { id: string }>(load: () => Promise<T[]>, page: string) {
  const [loaded, setLoaded] = useState<{ page: string; rows: T[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let cancelled = false
    // Held at least 300 ms so the skeleton never flashes; a failure shows at once.
    atLeast(loadRef.current())
      .then((r) => {
        if (cancelled) return
        setLoaded({ page, rows: r })
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page, request: 'list' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, page])

  const reload = useCallback(() => {
    setLoaded(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  const remove = useCallback((id: string) => setLoaded((l) => (l ? { ...l, rows: l.rows.filter((x) => x.id !== id) } : l)), [])
  // Rows from another page key (a different filter) are not shown while the new ones load.
  const rows = loaded && loaded.page === page ? loaded.rows : null

  return { rows, failed, reload, remove }
}
