import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type ReviewDetail, type ReviewRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { useQueueList } from '@/lib/useQueueList'
import { useQueueTarget } from '@/lib/wait'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { SkillWorkViewer } from '@/components/SkillWorkViewer'
import { EmptyState, ErrorState, LoadingList } from '@/components/kd/states'
import { MasterDetail } from '@/components/kd/MasterDetail'
import { PageHeader } from '@/components/kd/PageHeader'
import { QueueRow } from '@/components/kd/QueueRow'
import { StatusPill } from '@/components/kd/StatusPill'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

/**
 * Skill reviews: rate the work against the list. List left, the open one right. Reviewers are blind: a row carries no
 * name, and the page never shows what the other reviewer said.
 */
export function SkillReviews() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queue = useQueueList<ReviewRow>(() => api.skillReviews().then((r) => r.submissions), 'skill-reviews')
  const target = useQueueTarget('skill-review')

  if (!can(user, 'reviewer')) return <Navigate to="/" replace />

  /** After a review: take the row off the list and open the next one. */
  function handled(doneId: string) {
    const rows = queue.rows ?? []
    const at = rows.findIndex((r) => r.id === doneId)
    const next = rows[at + 1] ?? rows[at - 1]
    queue.remove(doneId)
    navigate(next && next.id !== doneId ? `/skill-reviews/${next.id}` : '/skill-reviews')
  }

  const loading = queue.rows === null && !queue.failed

  const list = (
    <div className="space-y-4">
      <PageHeader
        title="Skill reviews"
        description="Rate the work against the list. You won't see who made it, or what the other reviewer said."
        actions={
          <Button variant="ghost" size="icon" onClick={queue.reload} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      {queue.failed && <ErrorState message="Couldn't load the list." onRetry={queue.reload} />}
      {!queue.failed && loading && <LoadingList />}
      {!queue.failed && !loading && queue.rows?.length === 0 && (
        <EmptyState icon={ClipboardCheck} title="Nothing for you to review">
          Work appears here once it has passed the authenticity check, for the skills you hold. You are emailed when some arrives.
        </EmptyState>
      )}
      {!queue.failed && !loading && queue.rows && queue.rows.length > 0 && (
        <>
          <p className="label">{queue.rows.length} waiting</p>
          <div className="space-y-2">
            {queue.rows.map((r) => (
              <QueueRow
                key={r.id}
                to={`/skill-reviews/${r.id}`}
                selected={r.id === id}
                name={r.skillLabel}
                skill={`${r.pieces} ${r.pieces === 1 ? 'piece' : 'pieces'}`}
                since={r.waitingSince}
                targetMinutes={target}
                preview={r.preview}
                fallbackIcon={ClipboardCheck}
                flags={r.thirdOpinion && <StatusPill tone="brand">Deciding vote</StatusPill>}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <MasterDetail
      hasSelection={!!id}
      list={list}
      detail={id ? <Detail key={id} id={id} onHandled={handled} /> : null}
      empty={
        <div className="grid h-full min-h-80 place-items-center">
          <EmptyState icon={ClipboardCheck} title="Pick something to review">
            Choose one on the left, look at the work, rate each line, and say what the person should know.
          </EmptyState>
        </div>
      }
    />
  )
}

function Detail({ id, onHandled }: { id: string; onHandled: (id: string) => void }) {
  const [data, setData] = useState<ReviewDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<'pass' | 'notYet' | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .skillReview(id)
      .then((r) => !cancelled && setData(r))
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'skill-reviews', request: 'detail' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  async function send(verdict: 'pass' | 'notYet') {
    setBusy(verdict)
    try {
      const r = await api.submitSkillReview(id, { scores, verdict, comment: comment.trim() })
      toast.success(
        r.state === 'decided'
          ? r.outcome === 'verified'
            ? 'Your review decided it: verified'
            : 'Your review decided it: not yet'
          : r.state === 'needThird'
            ? 'Recorded. The two of you differ, so a third reviewer decides'
            : 'Recorded. Waiting for the second reviewer',
      )
      onHandled(id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const back = (
    <Link to="/skill-reviews" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-2 hover:text-foreground lg:hidden">
      <ArrowLeft className="size-4" /> All reviews
    </Link>
  )

  if (failed) {
    return (
      <div className="space-y-3">
        {back}
        <ErrorState
          message="Couldn't open this submission. You may not review this skill, or it was already decided."
          onRetry={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true">
        {back}
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  const { rubric, submission } = data
  const open = submission.status === 'review' && !data.myReview
  const complete = rubric.lines.every((l) => scores[l.key] !== undefined)
  const lowest = complete ? Math.min(...Object.values(scores)) : 4
  const commentOk = comment.trim().length >= 10

  return (
    <div className="space-y-4 pb-8">
      {back}

      <Card className="flex-row flex-wrap items-center justify-between gap-2 p-5">
        <h2 className="text-xl font-extrabold">{submission.skillLabel}</h2>
        {data.thirdOpinion && <StatusPill tone="brand">The first two differed: yours decides</StatusPill>}
      </Card>

      {rubric.draft && (
        <Card tone="warn" className="p-4 text-sm">
          This list is a draft that has not yet been worked through with someone who practises the skill. If a line doesn't fit the work, say so in your comment.
        </Card>
      )}

      <SkillWorkViewer work={submission} />

      {data.myReview && (
        <Card tone="ok" className="flex-row items-start gap-2 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
          <p>
            You rated this one: <strong>{data.myReview.verdict === 'pass' ? 'pass' : 'not yet'}</strong>. {data.myReview.comment}
          </p>
        </Card>
      )}

      {open && (
        <Card className="gap-5 p-5">
          <h3 className="text-base font-extrabold">Rate each line</h3>
          {rubric.lines.map((l) => (
            <fieldset key={l.key} className="space-y-1.5">
              <legend className="text-sm font-semibold">{l.label}</legend>
              <p className="text-xs text-text-2">{l.looksLike}</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={l.label}>
                {rubric.scale.map((s) => {
                  const on = scores[l.key] === s.score
                  return (
                    <button
                      key={s.score}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setScores((cur) => ({ ...cur, [l.key]: s.score }))}
                      className={cn(
                        'min-h-10 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] sm:min-h-9',
                        on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-2 hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {s.score} · {s.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="comment">What the person should know {lowest <= 2 || !complete ? '(required for Not yet)' : '(optional)'}</Label>
            <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Be specific: which part, and what to change." />
            <p className="text-xs text-text-3">At least 10 characters for a Not yet.</p>
          </div>

          {complete && lowest === 1 && <p className="text-sm text-text-2">A line is below the standard, so this can only be Not yet.</p>}
          <div className="flex flex-wrap gap-2">
            {/* The one main action on the screen: the only glow. */}
            <Button glow onClick={() => send('pass')} disabled={!complete || lowest === 1 || busy !== null}>
              {busy === 'pass' && <Loader2 className="animate-spin" />} Pass
            </Button>
            <Button variant="secondary" onClick={() => send('notYet')} disabled={!complete || !commentOk || busy !== null}>
              {busy === 'notYet' && <Loader2 className="animate-spin" />} Not yet
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
