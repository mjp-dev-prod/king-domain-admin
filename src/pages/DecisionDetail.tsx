import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileQuestion, Loader2, Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type Decision, type Stance } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/forms/Textarea'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { EmptyState, ErrorState } from '@/components/kd/states'
import { DECISION_LEDGER_URL, findMilestone } from '@/lib/milestones'
import { Sentry } from '@/lib/sentry'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: 'agree', label: 'Agree' },
  { value: 'disagree', label: 'Disagree' },
  { value: 'need_discussion', label: 'Need discussion' },
]

/** Agreeing is done (green); needing discussion is waiting on the others (amber); disagreeing is a fact, not an error. */
const STANCE_TONE: Record<Stance, 'ok' | 'warn' | 'plain'> = {
  agree: 'ok',
  disagree: 'plain',
  need_discussion: 'warn',
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

export function DecisionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [stancePending, setStancePending] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentPending, setCommentPending] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closePending, setClosePending] = useState(false)

  function load() {
    if (!id) return
    api
      .decision(id)
      .then((d) => {
        setFailed(false)
        setDecision(d.decision)
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { tags: { page: 'decision-detail', request: 'get' } })
        setDecision(null)
        // "Not found" is only true for a 404; anything else is a failed load the person can retry.
        setFailed(!(err instanceof ApiError && err.status === 404))
      })
      .finally(() => setLoading(false))
  }

  function retry() {
    setLoading(true)
    setFailed(false)
    load()
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <ErrorState message="Couldn't load this decision." onRetry={retry} />
      </div>
    )
  }

  if (!decision || !id) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={FileQuestion}
          title="Decision not found"
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/decisions">Back to decisions</Link>
            </Button>
          }
        >
          It may have been removed, or the link is wrong.
        </EmptyState>
      </div>
    )
  }

  const myStance = decision.stances.find((s) => s.user.id === user?.id)?.stance ?? null
  const isOpen = decision.status === 'open'

  async function castStance(stance: Stance) {
    setStancePending(true)
    try {
      const result = await api.castStance(id!, stance)
      setDecision(result.decision)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not record your stance.')
    } finally {
      setStancePending(false)
    }
  }

  async function onComment(event: FormEvent) {
    event.preventDefault()
    if (!commentBody.trim()) return
    setCommentPending(true)

    try {
      const result = await api.addComment(id!, commentBody.trim())
      setDecision(result.decision)
      setCommentBody('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not post the comment.')
    } finally {
      setCommentPending(false)
    }
  }

  async function toggleClosed() {
    setClosePending(true)
    try {
      const result = isOpen ? await api.closeDecision(id!) : await api.reopenDecision(id!)
      setDecision(result.decision)
      toast.success(isOpen ? 'Decision closed' : 'Decision reopened')
      setCloseDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the decision.')
    } finally {
      setClosePending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 animate-in fade-in duration-500">
      <Button variant="ghost" size="sm" onClick={() => navigate('/decisions')} className="-ml-2">
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <div className="space-y-2">
        <PageHeader
          title={decision.title}
          description={
            <>
              Posted by {decision.createdBy.name || decision.createdBy.email} · {formatDateTime(decision.createdAt)}
            </>
          }
          actions={
            <Badge variant={isOpen ? 'warn' : 'ok'} className="capitalize">
              {decision.status}
            </Badge>
          }
        />

        {!isOpen && decision.closedBy && decision.closedAt && (
          <p className="text-xs text-text-2">
            Closed by {decision.closedBy.name || decision.closedBy.email} at{' '}
            {formatDateTime(decision.closedAt)}
          </p>
        )}
      </div>

      {decision.milestoneRef &&
        (() => {
          const milestone = findMilestone(decision.milestoneRef)
          return (
            <Card tone="brand" className="gap-1.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="label text-violet-text">
                  Milestone {decision.milestoneRef}
                  {milestone && ` — ${milestone.title}`}
                </p>
                <Link
                  to={DECISION_LEDGER_URL}
                  className="flex shrink-0 items-center gap-1 text-xs text-text-2 hover:text-foreground"
                >
                  Full ledger
                  <ExternalLink className="size-3" />
                </Link>
              </div>
              {milestone && <p className="text-sm text-text-2">{milestone.summary}</p>}
            </Card>
          )
        })()}

      <Card className="p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{decision.description}</p>
      </Card>

      {user?.role === 'owner' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCloseDialogOpen(true)}
          className="w-fit"
        >
          {isOpen ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
          {isOpen ? 'Close decision' : 'Reopen decision'}
        </Button>
      )}

      <div className="space-y-2">
        <Eyebrow>Stances</Eyebrow>

        {isOpen && (
          <div className="flex flex-wrap gap-2">
            {STANCE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={myStance === opt.value ? 'default' : 'secondary'}
                disabled={stancePending}
                onClick={() => castStance(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {decision.stances.length === 0 ? (
          <p className="text-sm text-text-2">No one has responded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {decision.stances.map((s) => (
              <Badge key={s.user.id} variant={STANCE_TONE[s.stance]}>
                {s.user.name || s.user.email}: {s.stance.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <Eyebrow>Discussion {decision.comments.length > 0 && `(${decision.comments.length})`}</Eyebrow>

        {decision.comments.length === 0 ? (
          <p className="text-sm text-text-2">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {decision.comments.map((comment) => (
              <Card key={comment.id} className="gap-1 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{comment.user.name || comment.user.email}</p>
                  <p className="tabular text-xs text-text-2">{formatDateTime(comment.createdAt)}</p>
                </div>
                <p className="text-sm whitespace-pre-wrap text-text-2">{comment.body}</p>
              </Card>
            ))}
          </div>
        )}

        {isOpen && (
          <form onSubmit={onComment} className="space-y-2">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              placeholder="Add a comment…"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={commentPending || !commentBody.trim()}>
                {commentPending && <Loader2 className="animate-spin" />}
                Comment
              </Button>
            </div>
          </form>
        )}
      </div>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isOpen ? 'Close this decision?' : 'Reopen this decision?'}</DialogTitle>
            <DialogDescription>
              {isOpen
                ? 'Stances and comments will lock. You can reopen it later if needed.'
                : 'This decision becomes open again — stances and comments are re-enabled.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCloseDialogOpen(false)} disabled={closePending}>
              Cancel
            </Button>
            <Button onClick={toggleClosed} disabled={closePending}>
              {closePending && <Loader2 className="animate-spin" />}
              {isOpen ? 'Close decision' : 'Reopen decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
