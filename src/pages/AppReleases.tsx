import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Download, Loader2, Plus, Rocket, Smartphone, Trash2, Zap, ZapOff } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type AppRelease } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/forms/Textarea'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { StatusPill } from '@/components/kd/StatusPill'
import { EmptyState, ErrorState } from '@/components/kd/states'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sentry } from '@/lib/sentry'

/** A draft is waiting on someone to publish it (amber); published is live (green). */
const STATUS_TONE: Record<string, 'warn' | 'ok' | 'plain'> = {
  draft: 'warn',
  published: 'ok',
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
  const [failed, setFailed] = useState(false)
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
      .then((d) => {
        setFailed(false)
        setReleases(d.releases)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'app-releases', request: 'list' } })
        // An empty list would read as "no releases yet" and invite a duplicate draft; say it failed instead.
        setFailed(true)
      })
  }

  function retry() {
    setReleases(null)
    setFailed(false)
    load()
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

  const isOwner = user?.role === 'owner'

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="App releases"
        description="Direct-APK distribution for internal testing — no Play Store yet."
        actions={
          // With no releases the empty state below offers the same button, so the page shows it once.
          isOwner &&
          !creating &&
          releases?.length !== 0 && (
            <Button size="sm" glow onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New draft
            </Button>
          )
        }
      />

      {creating && (
        <Card className="gap-0 p-5">
          <Eyebrow className="mb-1">New draft release</Eyebrow>
          <p className="mb-4 text-sm text-text-2">
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
                <Textarea id="highlights" rows={4} placeholder={'One per line'} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="improvements">Improvements</Label>
                <Textarea id="improvements" rows={4} placeholder={'One per line'} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixes">Fixes</Label>
                <Textarea id="fixes" rows={4} placeholder={'One per line'} value={fixes} onChange={(e) => setFixes(e.target.value)} />
              </div>
            </div>

            <label className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceUpdate}
                onChange={(e) => setForceUpdate(e.target.checked)}
                className="size-4 accent-violet"
              />
              Request force update once published
              <span className="text-xs text-text-2">
                (still requires a separate activation step later)
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" glow disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Create draft
              </Button>
            </div>
          </form>
        </Card>
      )}

      {failed ? (
        <ErrorState message="Couldn't load the releases." onRetry={retry} />
      ) : releases === null ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : releases.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No releases yet"
          action={
            isOwner &&
            !creating && (
              <Button size="sm" glow onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                New draft
              </Button>
            )
          }
        >
          Create a draft to give CI something to build.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <Card key={release.id} className="gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-lg font-extrabold">{release.version}</span>
                    <StatusPill tone={STATUS_TONE[release.status] ?? 'plain'}>{release.status}</StatusPill>
                    {release.isLatest && <StatusPill tone="brand">latest</StatusPill>}
                    {release.forceUpdate && (
                      <StatusPill tone="warn" icon={<Zap />}>
                        force update active
                      </StatusPill>
                    )}
                    {!release.forceUpdate && release.forceUpdateRequested && <StatusPill>force update requested</StatusPill>}
                  </div>
                  <p className="mt-1 text-xs text-text-2">
                    Created {formatDateTime(release.createdAt)}
                    {release.publishedAt && ` · Published ${formatDateTime(release.publishedAt)}`}
                  </p>
                </div>

                {release.apkUrl && (
                  <Button variant="secondary" size="sm" asChild>
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
                        <Eyebrow className="mb-1 capitalize">{key}</Eyebrow>
                        <ul className="space-y-0.5 text-text-2">
                          {release.changelog![key].map((line, i) => (
                            <li key={i}>· {line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              {isOwner && (
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
                        className="text-bad hover:text-bad"
                        onClick={() => setPendingAction({ release, kind: 'delete' })}
                      >
                        <Trash2 className="size-4" />
                        Delete draft
                      </Button>
                    </>
                  )}
                  {release.status === 'published' && !release.forceUpdate && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-warn hover:text-warn"
                      onClick={() => setPendingAction({ release, kind: 'activate' })}
                    >
                      <Zap className="size-4" />
                      Activate force update
                    </Button>
                  )}
                  {release.status === 'published' && release.forceUpdate && (
                    <Button
                      variant="secondary"
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
                    <AlertTriangle className="size-4 text-bad" />
                  )}
                  {dialogCopy[pendingAction.kind].title}
                </DialogTitle>
                <DialogDescription>{dialogCopy[pendingAction.kind].description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={actionPending}>
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
