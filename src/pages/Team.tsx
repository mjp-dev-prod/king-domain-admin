import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type AdminUser } from '@/lib/api'
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
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  active: 'border-green-soft/40 text-green-soft',
  invited: 'border-gold/40 text-gold',
  revoked: 'border-border text-muted-foreground',
}

export function Team() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[] | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [revoking, setRevoking] = useState<AdminUser | null>(null)
  const [revokePending, setRevokePending] = useState(false)

  function load() {
    api
      .admins()
      .then((d) => setAdmins(d.admins))
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'team', request: 'list' } })
        setAdmins([])
      })
  }

  useEffect(load, [])

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
      <Card className="p-5">
        <p className="label mb-1">Invite an admin</p>
        <p className="mb-4 text-xs text-muted-foreground">
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
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="animate-spin" /> : <UserPlus className="size-4" />}
            Create invite
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-gold/30 bg-gold/5 p-3 animate-in fade-in slide-in-from-top-1">
            <code className="flex-1 truncate text-xs">{inviteUrl}</code>
            <Button variant="ghost" size="sm" onClick={copyInvite} className="shrink-0">
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        )}
      </Card>

      {admins === null ? (
        <Card className="space-y-2 p-5">
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
                    <TableCell className="text-muted-foreground">{admin.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(STATUS_STYLES[admin.status])}>
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canRevoke(admin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
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
                    <p className="text-sm text-muted-foreground">{admin.name ?? '—'}</p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', STATUS_STYLES[admin.status])}>
                    {admin.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">
                    {admin.role}
                  </Badge>
                  {canRevoke(admin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevoking(admin)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
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
