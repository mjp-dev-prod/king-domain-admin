import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ChevronRight, Clock, Inbox as InboxIcon, Pencil, RefreshCw } from 'lucide-react'
import { api, ApiError, type QueueSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatMinutes } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
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
      <PageHeader
        title="Inbox"
        description="Everything waiting on the team, with how long it may wait."
        actions={
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      {failed && <ErrorState message="Couldn't load the inbox. Check your connection." onRetry={load} />}

      {!failed && queues === null && <LoadingList />}

      {!failed && queues?.length === 0 && (
        <EmptyState icon={InboxIcon} title="No queues for you yet">
          Queues appear here once an owner gives you a role on the Team page, such as Reviewer or Finance.
        </EmptyState>
      )}

      {queues?.map((q) => (
        <Card key={q.key} tone={q.overdue > 0 ? 'bad' : 'plain'} className="gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold">{q.label}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-text-2">
                {q.open === 0 ? 'Nothing waiting.' : `${q.open} waiting`}
                {q.overdue > 0 && <StatusPill tone="bad">{q.overdue} past target</StatusPill>}
              </p>
            </div>
            <Button asChild size="sm" variant={q.overdue > 0 ? 'default' : 'secondary'}>
              <Link to={q.path}>
                Open <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Target', formatMinutes(q.targetMinutes)],
              ['Oldest', q.oldestWaitingMinutes === null ? '—' : formatMinutes(q.oldestWaitingMinutes)],
              ['Typical', formatMinutes(q.p50Minutes)],
              ['Slowest 10%', formatMinutes(q.p90Minutes)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-2 p-3">
                <dt className="label">{k}</dt>
                <dd className="tabular mt-1 text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="flex items-start gap-2 text-sm text-text-2">
            {q.overdue > 0 ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" /> : <Clock className="mt-0.5 size-4 shrink-0" />}
            <span>If it waits past the target: {q.defaultWhenLate}</span>
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {q.sample > 0 ? <p className="text-xs text-text-3">Times from the last {q.sample} handled.</p> : <span />}
            {user?.role === 'owner' && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(q)}>
                <Pencil className="size-4" /> Edit target
              </Button>
            )}
          </div>
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
