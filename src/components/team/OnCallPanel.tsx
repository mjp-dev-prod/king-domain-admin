import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, Trash2 } from 'lucide-react'
import { api, ApiError, type AdminUser, type OnCallShift } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function OnCallPanel({ admins }: { admins: AdminUser[] }) {
  const active = admins.filter((a) => a.status === 'active')
  const [shifts, setShifts] = useState<OnCallShift[] | null>(null)
  const [adminId, setAdminId] = useState(active[0]?.id ?? '')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.onCall().then((r) => setShifts(r.shifts)).catch(() => setShifts([]))
  }, [])
  useEffect(load, [load])

  async function add() {
    setBusy(true)
    try {
      await api.addOnCall({ adminId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() })
      toast.success('Shift added')
      setStartsAt('')
      setEndsAt('')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add the shift.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    try {
      await api.removeOnCall(id)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove the shift.')
    }
  }

  async function testAlert() {
    try {
      const r = await api.testAlert()
      toast.success(r.alert.slackSent ? 'Test alert sent to Slack and email' : 'Slack did not accept it: check OPS_SLACK_WEBHOOK_URL on the server')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send the test alert.')
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">On call</p>
          <p className="text-sm text-muted-foreground">Who gets urgent alerts (chargebacks, safety reports) outside working hours. With nobody on call, the owners get them.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={testAlert}><BellRing className="size-4" /> Send a test alert</Button>
      </div>

      {shifts?.length === 0 && <p className="text-sm text-muted-foreground">No shifts coming up. Add this week's rota below.</p>}
      {shifts?.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
          <span>{s.admin.name ?? s.admin.email}: {fmt(s.startsAt)} → {fmt(s.endsAt)}</span>
          <Button variant="ghost" size="icon" onClick={() => remove(s.id)} aria-label="Remove shift"><Trash2 className="size-4" /></Button>
        </div>
      ))}

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="oc-admin">Person</Label>
          <select id="oc-admin" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
            {active.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.email}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label htmlFor="oc-start">Starts</Label><Input id="oc-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="oc-end">Ends</Label><Input id="oc-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={add} disabled={!adminId || !startsAt || !endsAt || busy}>{busy ? 'Adding…' : 'Add shift'}</Button></div>
      </div>
    </Card>
  )
}
