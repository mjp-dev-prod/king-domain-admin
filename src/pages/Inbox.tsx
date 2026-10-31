import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ChevronRight, Clock, Inbox as InboxIcon, Pencil, RefreshCw } from 'lucide-react'
import { api, ApiError, type QueueSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatMinutes } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sentry } from '@/lib/sentry'

export function Inbox() {
  const { user } = useAuth()
  const [queues, setQueues] = useState<QueueSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState<QueueSummary | null>(null)

  const load = useCallback(() => {
    api
      .inbox()
      .then((r) => {
        setQueues(r.queues)
        setFailed(false)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'inbox' } })
        setFailed(true)
      })
  }, [])

  useEffect(load, [load])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Everything waiting on the team, with how long it may wait.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
          <RefreshCw className="size-4" />
        </Button>
      </header>

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the inbox. Check your connection.</p>
          <Button size="sm" onClick={load}>Retry</Button>
        </Card>
      )}

      {!failed && queues === null && [0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}

      {!failed && queues?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <InboxIcon className="size-6 text-muted-foreground" />
          <p className="font-medium">No queues for you yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Queues appear here once an owner gives you a role on the Team page, such as Reviewer or Finance.
          </p>
        </Card>
      )}

      {queues?.map((q) => (
        <Card key={q.key} className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{q.label}</p>
              <p className="text-sm text-muted-foreground">
                {q.open === 0 ? 'Nothing waiting.' : `${q.open} waiting`}
                {q.overdue > 0 && <span className="ml-2 font-medium text-destructive">{q.overdue} past target</span>}
              </p>
            </div>
            <Button asChild size="sm" variant={q.overdue > 0 ? 'default' : 'secondary'}>
              <Link to={q.path}>
                Open <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Target</dt><dd>{formatMinutes(q.targetMinutes)}</dd></div>
            <div><dt className="text-muted-foreground">Oldest</dt><dd>{q.oldestWaitingMinutes === null ? '—' : formatMinutes(q.oldestWaitingMinutes)}</dd></div>
            <div><dt className="text-muted-foreground">Typical</dt><dd>{formatMinutes(q.p50Minutes)}</dd></div>
            <div><dt className="text-muted-foreground">Slowest 10%</dt><dd>{formatMinutes(q.p90Minutes)}</dd></div>
          </dl>

          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            {q.overdue > 0 ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <Clock className="mt-0.5 size-4 shrink-0" />}
            <span>If it waits past the target: {q.defaultWhenLate}</span>
          </p>

          {q.sample > 0 && <p className="text-xs text-muted-foreground">Times from the last {q.sample} handled.</p>}

          {user?.role === 'owner' && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(q)}>
              <Pencil className="size-4" /> Edit target
            </Button>
          )}
        </Card>
      ))}

      {editing && <TargetDialog queue={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}

function TargetDialog({ queue, onClose, onSaved }: { queue: QueueSummary; onClose: () => void; onSaved: () => void }) {
  const [hours, setHours] = useState(String(Math.round(queue.targetMinutes / 60)))
  const [whenLate, setWhenLate] = useState(queue.defaultWhenLate)
  const [saving, setSaving] = useState(false)
  const h = Number(hours)
  const valid = Number.isFinite(h) && h > 0 && h <= 720 && whenLate.trim().length >= 5

  async function save() {
    setSaving(true)
    try {
      await api.setQueueTarget(queue.key, { targetMinutes: Math.round(h * 60), defaultWhenLate: whenLate.trim() })
      toast.success('Target saved')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the target.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Target for {queue.label}</DialogTitle>
          <DialogDescription>Measure before promising: set a target the team can keep nine times in ten.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="hours">Hours</Label>
            <Input id="hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="late">What happens when it passes</Label>
            <Input id="late" value={whenLate} onChange={(e) => setWhenLate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
