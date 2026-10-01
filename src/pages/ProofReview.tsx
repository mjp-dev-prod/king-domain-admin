import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Check, ExternalLink, FileText, ImageOff, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, ApiError, PROOF_COUNTS_CHANGED, type ProofCounts, type ProofItem, type ProofStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilterTabs } from '@/components/FilterTabs'
import { cn } from '@/lib/utils'
import { Sentry } from '@/lib/sentry'

/** Starting points only — the reviewer can edit the text before sending. */
const REJECT_REASONS = [
  { label: "File won't open", text: "The file doesn't open or is unreadable. Please upload it again as an image or PDF." },
  { label: 'Not their own work', text: "We couldn't confirm this is your own work. Please submit something you made yourself, ideally with drafts or a link showing it's yours." },
  { label: 'Wrong category', text: "This sample doesn't show the skill for the category it was submitted under. Please submit it under the matching category." },
  { label: 'Not enough to judge', text: 'This sample is too small to judge the skill. Please submit a fuller piece of work.' },
]
const REASON_MIN = 10
const REASON_MAX = 500

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function waitingFor(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

export function ProofReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ProofStatus>('pending')
  const [items, setItems] = useState<ProofItem[] | null>(null)
  const [counts, setCounts] = useState<ProofCounts | null>(null)

  const load = useCallback(() => {
    api
      .proofItems(status)
      .then((r) => setItems(r.proofItems))
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'proof-review', request: 'list' } })
        setItems([])
      })
    api.proofCounts().then(setCounts).catch(() => {})
  }, [status])

  useEffect(load, [load])

  const afterDecision = (decidedId: string) => {
    window.dispatchEvent(new Event(PROOF_COUNTS_CHANGED))
    const remaining = (items ?? []).filter((i) => i.id !== decidedId)
    setItems(remaining)
    api.proofCounts().then(setCounts).catch(() => {})
    // Move straight on to the next waiting item, the way a review inbox should.
    navigate(remaining[0] ? `/proof-review/${remaining[0].id}` : '/proof-review', { replace: true })
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className={cn('space-y-3', id && 'hidden lg:block')}>
        <div>
          <h1 className="text-2xl font-semibold">Proof review</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            A talent can't apply in a category until a reviewer verifies their proof there. Oldest first.
          </p>
        </div>
        <FilterTabs
          label="Review status"
          value={status}
          onChange={(v) => {
            setItems(null)
            setStatus(v)
            navigate('/proof-review')
          }}
          options={[
            { value: 'pending', label: 'Waiting', count: counts?.pending },
            { value: 'verified', label: 'Verified', count: counts?.verified },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className={cn('space-y-2', id && 'hidden lg:block')}>
          <QueueList items={items} status={status} selectedId={id} />
        </div>

        <div className={cn(!id && 'hidden lg:block', 'lg:sticky lg:top-20')}>
          {id ? (
            <ProofDetail key={id} id={id} onDecided={afterDecision} />
          ) : (
            items &&
            items.length > 0 && (
              <Card className="hidden p-10 text-center text-sm text-muted-foreground lg:block">
                Choose a submission to review it.
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function QueueList({ items, status, selectedId }: { items: ProofItem[] | null; status: ProofStatus; selectedId?: string }) {
  if (!items) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </Card>
        ))}
      </>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {status === 'pending' ? 'Nothing waiting. Every submission has been reviewed.' : 'No verified proof yet.'}
      </Card>
    )
  }

  return (
    <>
      {items.map((item) => (
        <Link key={item.id} to={`/proof-review/${item.id}`} className="block">
          <Card
            className={cn(
              'gap-1.5 p-4 transition-colors hover:border-gold/40',
              selectedId === item.id && 'border-gold/60 bg-secondary/40',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-medium">{item.talent?.fullName ?? 'Unknown talent'}</p>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {item.status === 'pending' ? waitingFor(item.createdAt) : formatDate(item.reviewedAt ?? item.createdAt)}
              </span>
            </div>
            <p className="label text-gold">{item.category}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{item.title}</p>
          </Card>
        </Link>
      ))}
    </>
  )
}

function ProofDetail({ id, onDecided }: { id: string; onDecided: (id: string) => void }) {
  const [item, setItem] = useState<ProofItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null)

  const fetchItem = useCallback(() => {
    api
      .proofItem(id)
      .then((r) => {
        setItem(r.proofItem)
        setPreviewFailed(false)
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load this submission.'))
  }, [id])

  useEffect(fetchItem, [fetchItem])

  if (error) {
    return (
      <Card className="space-y-3 p-6 text-sm">
        <BackToQueue />
        <p className="text-muted-foreground">{error}</p>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card className="space-y-3 p-6">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    )
  }

  const talent = item.talent
  const isImage = !!item.fileUrl && IMAGE_EXT.test(item.fileName ?? '')

  return (
    <Card className="gap-0 p-0">
      <div className="space-y-4 p-5 sm:p-6">
        <BackToQueue />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label text-gold">{item.category}</p>
            <h2 className="mt-1 text-xl leading-snug font-semibold break-words">{item.title}</h2>
            <p className="tabular mt-1 text-xs text-muted-foreground">Submitted {formatDate(item.createdAt)}</p>
          </div>
          {item.status === 'verified' ? (
            <Badge variant="outline" className="shrink-0 border-settled/40 text-settled">
              <ShieldCheck className="size-3.5" />
              Verified {item.reviewedAt && formatDate(item.reviewedAt)}
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 border-open/40 text-open">
              Waiting
            </Badge>
          )}
        </div>

        {/* The work itself. Signed links last 5 minutes, so a failed preview offers a fresh one. */}
        {item.fileUrl ? (
          isImage && !previewFailed ? (
            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border bg-ink">
              <img
                src={item.fileUrl}
                alt={`Proof submitted by ${talent?.fullName ?? 'the talent'}: ${item.title}`}
                className="max-h-[28rem] w-full object-contain"
                onError={() => setPreviewFailed(true)}
              />
            </a>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-secondary/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                {previewFailed ? <ImageOff className="size-4 shrink-0" /> : <FileText className="size-4 shrink-0" />}
                <span className="truncate">{previewFailed ? 'Preview link expired.' : item.fileName}</span>
              </span>
              {previewFailed ? (
                <Button variant="outline" size="sm" onClick={fetchItem}>
                  <RefreshCw className="size-4" />
                  Load a fresh link
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a href={item.fileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Open file
                  </a>
                </Button>
              )}
            </div>
          )
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No file attached. The talent described this work in the title only, so judge whether that is enough to verify.
          </p>
        )}

        {talent && (
          <div className="space-y-2 rounded-md border border-border p-4">
            <p className="label">Submitted by</p>
            <p className="font-medium">{talent.fullName}</p>
            <p className="text-xs break-all text-muted-foreground">{talent.email}</p>
            {talent.headline && <p className="text-sm">{talent.headline}</p>}
            {talent.bio && <p className="text-sm text-muted-foreground">{talent.bio}</p>}
            {talent.skillCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {talent.skillCategories.map((c) => (
                  <span key={c} className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {item.status === 'pending' && (
        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:justify-end sm:px-6 lg:static lg:bg-secondary/20">
          <Button variant="outline" onClick={() => setConfirm('reject')}>
            Reject with a reason
          </Button>
          <Button onClick={() => setConfirm('approve')}>
            <Check className="size-4" />
            Verify in {item.category}
          </Button>
        </div>
      )}

      <ApproveDialog item={item} open={confirm === 'approve'} onClose={() => setConfirm(null)} onDone={onDecided} />
      <RejectDialog item={item} open={confirm === 'reject'} onClose={() => setConfirm(null)} onDone={onDecided} />
    </Card>
  )
}

function BackToQueue() {
  return (
    <Link
      to="/proof-review"
      className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
    >
      <ArrowLeft className="size-4" />
      All submissions
    </Link>
  )
}

type DialogProps = { item: ProofItem; open: boolean; onClose: () => void; onDone: (id: string) => void }

function ApproveDialog({ item, open, onClose, onDone }: DialogProps) {
  const [busy, setBusy] = useState(false)
  const name = item.talent?.fullName ?? 'This talent'

  const approve = async () => {
    setBusy(true)
    try {
      await api.approveProof(item.id)
      toast.success(`${name} is verified in ${item.category}`, { description: "They've been emailed and can now apply." })
      onClose()
      onDone(item.id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not verify this submission.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify {name} in {item.category}?</DialogTitle>
          <DialogDescription>
            They'll be able to apply to {item.category} jobs straight away, and we'll email them to say so. This
            can't be undone from the dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={approve} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ item, open, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const name = item.talent?.fullName ?? 'the talent'
  const trimmed = reason.trim()
  const valid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX

  const reject = async () => {
    setBusy(true)
    try {
      await api.rejectProof(item.id, trimmed)
      toast.success('Submission rejected', { description: `${name} has been emailed your note.` })
      setReason('')
      onClose()
      onDone(item.id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reject this submission.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reject this submission?</DialogTitle>
          <DialogDescription>
            It's removed from {name}'s profile and this note is emailed to them, so say what to fix.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REJECT_REASONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setReason(r.text)}
                className={cn(
                  'min-h-10 rounded-md border px-3 text-sm transition-colors sm:min-h-8',
                  reason === r.text ? 'border-gold/60 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Note to {name}</Label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX}
              rows={4}
              placeholder="Pick a reason above or write your own."
              className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm"
            />
            <p className="tabular text-right text-xs text-muted-foreground">
              {trimmed.length < REASON_MIN ? `At least ${REASON_MIN} characters` : `${trimmed.length}/${REASON_MAX}`}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={reject} disabled={!valid || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Reject and email {name.split(' ')[0]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
