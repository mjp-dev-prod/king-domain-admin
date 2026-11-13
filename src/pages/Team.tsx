import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type AdminUser, type Skill } from '@/lib/api'
import { CapabilityEditor } from '@/components/team/CapabilityEditor'
import { OnCallPanel } from '@/components/team/OnCallPanel'
import { ErrorState } from '@/components/kd/states'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { useAuth } from '@/lib/auth'
import { Sentry } from '@/lib/sentry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Active is in good standing (green), invited is waiting on them to accept (amber), revoked is just a fact. */
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'plain'> = {
  active: 'ok',
  invited: 'warn',
  revoked: 'plain',
}

export function Team() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [revoking, setRevoking] = useState<AdminUser | null>(null)
  const [revokePending, setRevokePending] = useState(false)

  function load() {
    api
      .admins()
      .then((d) => {
        setFailed(false)
        setAdmins(d.admins)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'team', request: 'list' } })
        // An empty roster would read as "nobody is on the team"; say it failed and offer a retry instead.
        setFailed(true)
      })
  }

  function retry() {
    setAdmins(null)
    setFailed(false)
    load()
  }

  useEffect(load, [])
  useEffect(() => {
    api.skills().then((r) => setSkills(r.skills)).catch(() => setSkills([]))
  }, [])

  async function onInvite(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const result = await api.invite(email, name, 'admin')
      setInviteUrl(result.inviteUrl)
      setEmail('')
      setName('')
      load()
      toast.success('Invite created', {
        description: `Send the link to ${result.admin.email}. It expires in ${result.expiresInHours} hours.`,
      })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create the invite.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setRevokePending(true)

    try {
      await api.revoke(revoking.id)
      load()
      toast.success(`${revoking.email} revoked`)
      setRevoking(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not revoke access.')
    } finally {
      setRevokePending(false)
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy — select and copy it manually.'),
    )
  }

  const canRevoke = (admin: AdminUser) =>
    admin.id !== user?.id && admin.status !== 'revoked'

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader title="Team" description="Who can sign in, what each person may do, and who is on call." />

      <Card className="gap-0 p-5">
        <Eyebrow className="mb-1">Invite an admin</Eyebrow>
        <p className="mb-4 text-sm text-text-2">
          Creates a single-use link. Send it to them yourself — no email is sent.
        </p>

        <form onSubmit={onInvite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="min-w-40 flex-1 space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" glow disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="animate-spin" /> : <UserPlus className="size-4" />}
            Create invite
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary p-3 animate-in fade-in slide-in-from-top-1">
            <code className="flex-1 truncate text-xs">{inviteUrl}</code>
            <Button variant="ghost" size="sm" onClick={copyInvite} className="shrink-0">
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        )}
      </Card>

      {failed ? (
        <ErrorState message="Couldn't load the team." onRetry={retry} />
      ) : admins === null ? (
        <Card className="space-y-2 p-5" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : (
        <>
          {/* Table on wider screens; cards below, where columns stop working. */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell className="text-text-2">{admin.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="plain" className="capitalize">
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[admin.status] ?? 'plain'} className="capitalize">
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canRevoke(admin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-bad hover:text-bad"
                          onClick={() => setRevoking(admin)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {admins.map((admin) => (
              <Card key={admin.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{admin.email}</p>
                    <p className="text-sm text-text-2">{admin.name ?? '—'}</p>
                  </div>
                  <Badge variant={STATUS_TONE[admin.status] ?? 'plain'} className="shrink-0 capitalize">
                    {admin.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="plain" className="capitalize">
                    {admin.role}
                  </Badge>
                  {canRevoke(admin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-bad hover:text-bad"
                      onClick={() => setRevoking(admin)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="space-y-4 p-5">
            <div>
              <p className="font-semibold">Roles</p>
              <p className="text-sm text-text-2">What each person may do. Without a role they can read the dashboard but not act.</p>
            </div>
            {admins
              .filter((a) => a.status === 'active')
              .map((a) => (
                <div key={a.id} className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p className="text-sm font-medium">{a.name ?? a.email}</p>
                  <CapabilityEditor
                    admin={a}
                    skills={skills}
                    onSaved={(updated) => setAdmins((list) => (list ? list.map((x) => (x.id === updated.id ? updated : x)) : list))}
                  />
                </div>
              ))}
          </Card>

          <OnCallPanel admins={admins} />
        </>
      )}

      <Dialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke access?</DialogTitle>
            <DialogDescription>
              {revoking?.email} loses access immediately and any active sessions end. Their
              outstanding invite links stop working too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)} disabled={revokePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revokePending}>
              {revokePending && <Loader2 className="animate-spin" />}
              Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
