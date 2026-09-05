import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Download, Loader2, Plus, Rocket, Trash2, Zap, ZapOff } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type AppRelease } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-border text-muted-foreground',
  published: 'border-settled/40 text-settled',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function multilineToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function AppReleases() {
  const { user } = useAuth()
  const [releases, setReleases] = useState<AppRelease[] | null>(null)
  const [creating, setCreating] = useState(false)

  const [version, setVersion] = useState('')
  const [highlights, setHighlights] = useState('')
  const [improvements, setImprovements] = useState('')
  const [fixes, setFixes] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [pendingAction, setPendingAction] = useState<{
    release: AppRelease
    kind: 'publish' | 'activate' | 'deactivate' | 'delete'
  } | null>(null)
  const [actionPending, setActionPending] = useState(false)

  function load() {
    api
      .appReleases()
      .then((d) => setReleases(d.releases))
      .catch(() => setReleases([]))
  }

  useEffect(load, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const changelog = {
      highlights: multilineToList(highlights),
      improvements: multilineToList(improvements),
      fixes: multilineToList(fixes),
    }
    if (changelog.highlights.length + changelog.improvements.length + changelog.fixes.length === 0) {
      toast.error('Add at least one changelog line.')
      return
    }

    setSubmitting(true)
    try {
      await api.createAppRelease({ version: version.trim(), changelog, forceUpdate })
      toast.success(`Draft ${version.trim()} created`, {
        description: 'Push to master to have CI build and upload the APK for it.',
      })
      setVersion('')
      setHighlights('')
      setImprovements('')
      setFixes('')
      setForceUpdate(false)
      setCreating(false)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create the release.')
    } finally {
      setSubmitting(false)
    }
  }

  async function runPendingAction() {
    if (!pendingAction) return
    setActionPending(true)

    try {
      const { release, kind } = pendingAction
      if (kind === 'publish') {
        await api.publishAppRelease(release.id)
        toast.success(`${release.version} published`)
      } else if (kind === 'activate') {
        await api.activateForceUpdate(release.id)
        toast.success(`Force update active for ${release.version}`)
      } else if (kind === 'deactivate') {
        await api.deactivateForceUpdate(release.id)
        toast.success(`Force update turned off for ${release.version}`)
      } else {
        await api.deleteAppRelease(release.id)
        toast.success(`Draft ${release.version} deleted`)
      }
      load()
      setPendingAction(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not complete that action.')
    } finally {
      setActionPending(false)
    }
  }

  const dialogCopy: Record<string, { title: string; description: string; confirmLabel: string; destructive?: boolean }> = {
    publish: {
      title: 'Publish this release?',
      description:
        'Makes it the version the app reports as latest. Force update stays off regardless of what was requested at draft time — activate it separately once you\'ve confirmed the build actually installs and runs correctly.',
      confirmLabel: 'Publish',
    },
    activate: {
      title: 'Force this update on every device?',
      description:
        'Every install below this version will be blocked until they update. Only do this after confirming the APK actually works — this cannot be undone remotely for someone already stuck.',
      confirmLabel: 'Activate force update',
      destructive: true,
    },
    deactivate: {
      title: 'Turn off force update?',
      description: 'Devices can use the app again without updating first.',
      confirmLabel: 'Deactivate',
    },
    delete: {
      title: 'Delete this draft?',
      description: 'Permanent. Only drafts can be deleted — published releases stay as history.',
      confirmLabel: 'Delete draft',
      destructive: true,
    },
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">App releases</h1>
          <p className="text-sm text-muted-foreground">
            Direct-APK distribution for internal testing — no Play Store yet.
          </p>
        </div>
        {user?.role === 'owner' && !creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New draft
          </Button>
        )}
      </div>

      {creating && (
        <Card className="p-5">
          <p className="label mb-1">New draft release</p>
          <p className="mb-4 text-xs text-muted-foreground">
            CI reads this draft's version and changelog on the next push to master, builds the
            APK, and uploads it here — it stays a draft until you publish it.
          </p>

          <form onSubmit={onCreate} className="space-y-4">
            <div className="max-w-40 space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                pattern="\d+\.\d+\.\d+"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="highlights">Highlights</Label>
                <textarea
                  id="highlights"
                  rows={4}
                  placeholder={'One per line'}
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="improvements">Improvements</Label>
                <textarea
                  id="improvements"
                  rows={4}
                  placeholder={'One per line'}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixes">Fixes</Label>
                <textarea
                  id="fixes"
                  rows={4}
                  placeholder={'One per line'}
                  value={fixes}
                  onChange={(e) => setFixes(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceUpdate}
                onChange={(e) => setForceUpdate(e.target.checked)}
                className="accent-gold size-4"
              />
              Request force update once published
              <span className="text-xs text-muted-foreground">
                (still requires a separate activation step later)
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Create draft
              </Button>
            </div>
          </form>
        </Card>
      )}

      {releases === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : releases.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No releases yet. Create a draft to give CI something to build.
        </Card>
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <Card key={release.id} className="gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">{release.version}</span>
                    <Badge variant="outline" className={STATUS_STYLES[release.status]}>
                      {release.status}
                    </Badge>
                    {release.isLatest && (
                      <Badge variant="outline" className="border-gold/40 text-gold">
                        latest
                      </Badge>
                    )}
                    {release.forceUpdate && (
                      <Badge variant="outline" className="border-open/40 text-open">
                        <Zap className="size-3" />
                        force update active
                      </Badge>
                    )}
                    {!release.forceUpdate && release.forceUpdateRequested && (
                      <Badge variant="outline" className="text-muted-foreground">
                        force update requested
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDateTime(release.createdAt)}
                    {release.publishedAt && ` · Published ${formatDateTime(release.publishedAt)}`}
                  </p>
                </div>

                {release.apkUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={release.apkUrl} target="_blank" rel="noreferrer">
                      <Download className="size-4" />
                      Download APK
                    </a>
                  </Button>
                )}
              </div>

              {release.changelog && (
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  {(['highlights', 'improvements', 'fixes'] as const).map((key) =>
                    release.changelog![key].length > 0 ? (
                      <div key={key}>
                        <p className="label mb-1 capitalize">{key}</p>
                        <ul className="space-y-0.5 text-muted-foreground">
                          {release.changelog![key].map((line, i) => (
                            <li key={i}>· {line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              {user?.role === 'owner' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {release.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        disabled={!release.apkUrl}
                        onClick={() => setPendingAction({ release, kind: 'publish' })}
                      >
                        <Rocket className="size-4" />
                        {release.apkUrl ? 'Publish' : 'Waiting for CI upload…'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingAction({ release, kind: 'delete' })}
                      >
                        <Trash2 className="size-4" />
                        Delete draft
                      </Button>
                    </>
                  )}
                  {release.status === 'published' && !release.forceUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-open/40 text-open hover:text-open"
                      onClick={() => setPendingAction({ release, kind: 'activate' })}
                    >
                      <Zap className="size-4" />
                      Activate force update
                    </Button>
                  )}
                  {release.status === 'published' && release.forceUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingAction({ release, kind: 'deactivate' })}
                    >
                      <ZapOff className="size-4" />
                      Deactivate force update
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-md">
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {dialogCopy[pendingAction.kind].destructive && (
                    <AlertTriangle className="size-4 text-open" />
                  )}
                  {dialogCopy[pendingAction.kind].title}
                </DialogTitle>
                <DialogDescription>{dialogCopy[pendingAction.kind].description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingAction(null)} disabled={actionPending}>
                  Cancel
                </Button>
                <Button
                  variant={dialogCopy[pendingAction.kind].destructive ? 'destructive' : 'default'}
                  onClick={runPendingAction}
                  disabled={actionPending}
                >
                  {actionPending && <Loader2 className="animate-spin" />}
                  {dialogCopy[pendingAction.kind].confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
