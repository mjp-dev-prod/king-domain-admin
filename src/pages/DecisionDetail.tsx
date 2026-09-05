import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2, Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError, type Decision, type Stance } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { DECISION_LEDGER_URL, findMilestone } from '@/lib/milestones'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: 'agree', label: 'Agree' },
  { value: 'disagree', label: 'Disagree' },
  { value: 'need_discussion', label: 'Need discussion' },
]

const STANCE_STYLES: Record<Stance, string> = {
  agree: 'border-settled/40 text-settled',
  disagree: 'border-open/40 text-open',
  need_discussion: 'border-gold/40 text-gold',
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
  const [stancePending, setStancePending] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentPending, setCommentPending] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closePending, setClosePending] = useState(false)

  function load() {
    if (!id) return
    api
      .decision(id)
      .then((d) => setDecision(d.decision))
      .catch(() => setDecision(null))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!decision || !id) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Decision not found.{' '}
        <Link to="/decisions" className="text-gold underline underline-offset-2">
          Back to decisions
        </Link>
      </Card>
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
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in duration-500">
      <Button variant="ghost" size="sm" onClick={() => navigate('/decisions')} className="-ml-2">
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold">{decision.title}</h1>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0',
              isOpen ? 'border-open/40 text-open' : 'border-settled/40 text-settled',
            )}
          >
            {decision.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Posted by {decision.createdBy.name || decision.createdBy.email} ·{' '}
            {formatDateTime(decision.createdAt)}
          </span>
        </div>

        {!isOpen && decision.closedBy && decision.closedAt && (
          <p className="text-xs text-muted-foreground">
            Closed by {decision.closedBy.name || decision.closedBy.email} at{' '}
            {formatDateTime(decision.closedAt)}
          </p>
        )}
      </div>

      {decision.milestoneRef &&
        (() => {
          const milestone = findMilestone(decision.milestoneRef)
          return (
            <Card className="gap-1.5 border-gold/30 bg-gold/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="label text-gold">
                  Milestone {decision.milestoneRef}
                  {milestone && ` — ${milestone.title}`}
                </p>
                <Link
                  to={DECISION_LEDGER_URL}
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Full ledger
                  <ExternalLink className="size-3" />
                </Link>
              </div>
              {milestone && <p className="text-sm text-muted-foreground">{milestone.summary}</p>}
            </Card>
          )
        })()}

      <Card className="p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{decision.description}</p>
      </Card>

      {user?.role === 'owner' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCloseDialogOpen(true)}
          className="w-fit"
        >
          {isOpen ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
          {isOpen ? 'Close decision' : 'Reopen decision'}
        </Button>
      )}

      <div className="space-y-2">
        <p className="label text-muted-foreground">Stances</p>

        {isOpen && (
          <div className="flex flex-wrap gap-2">
            {STANCE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={myStance === opt.value ? 'default' : 'outline'}
                disabled={stancePending}
                onClick={() => castStance(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {decision.stances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has responded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {decision.stances.map((s) => (
              <Badge key={s.user.id} variant="outline" className={STANCE_STYLES[s.stance]}>
                {s.user.name || s.user.email}: {s.stance.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="label text-muted-foreground">
          Discussion {decision.comments.length > 0 && `(${decision.comments.length})`}
        </p>

        {decision.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {decision.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{comment.user.name || comment.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(comment.createdAt)}
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {comment.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {isOpen && (
          <form onSubmit={onComment} className="space-y-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              placeholder="Add a comment…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)} disabled={closePending}>
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
