import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck, Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError, type ReviewDetail, type ReviewRow } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillWorkViewer } from '@/components/SkillWorkViewer'
import { Sentry } from '@/lib/sentry'
import { cn } from '@/lib/utils'

function waiting(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h waiting`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} waiting`
}

export function SkillReviews() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!can(user, 'reviewer')) return <Navigate to="/" replace />
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .skillReviews()
      .then((r) => {
        if (cancelled) return
        setRows(r.submissions)
        setFailed(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        Sentry.captureException(err, { tags: { page: 'skill-reviews', request: 'list' } })
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setRows(null)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Skill reviews</h1>
          <p className="text-sm text-muted-foreground">Score the work against the rubric. You won't see who made it or what the other reviewer scored.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
      </header>

      {failed && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Couldn't load the list.</p>
          <Button size="sm" onClick={reload}>Retry</Button>
        </Card>
      )}
      {!failed && rows === null && [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      {!failed && rows?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ClipboardCheck className="size-6 text-muted-foreground" />
          <p className="font-medium">Nothing for you to review</p>
          <p className="text-sm text-muted-foreground">Work appears here once it has passed the authenticity check, for the skills you hold.</p>
        </Card>
      )}
      {rows?.map((r) => (
        <Link key={r.id} to={`/skill-reviews/${r.id}`}>
          <Card className="space-y-1 p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.skillLabel}</p>
              <div className="flex gap-2">
                {r.thirdOpinion && <Badge>Deciding vote</Badge>}
                <Badge variant="outline">{r.pieces} pieces</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{waiting(r.waitingSince)}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<ReviewDetail | null>(null)
  const [failed, setFailed] = useState(false)
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
  }, [id])

  async function send(verdict: 'pass' | 'notYet') {
    setBusy(verdict)
    try {
      const r = await api.submitSkillReview(id, { scores, verdict, comment: comment.trim() })
      toast.success(
        r.state === 'decided' ? (r.outcome === 'verified' ? 'Your review decided it: verified' : 'Your review decided it: not yet') : r.state === 'needThird' ? 'Recorded. The two of you differ, so a third reviewer decides' : 'Recorded. Waiting for the second reviewer',
      )
      navigate('/skill-reviews')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <Link to="/skill-reviews" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <Card className="p-4 text-sm">Couldn't open this submission. You may not review this skill, or it was already decided.</Card>
      </div>
    )
  }
  if (!data) return <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>

  const { rubric, submission } = data
  const open = submission.status === 'review' && !data.myReview
  const complete = rubric.lines.every((l) => scores[l.key] !== undefined)
  const lowest = complete ? Math.min(...Object.values(scores)) : 4
  const commentOk = comment.trim().length >= 10

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/skill-reviews" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All reviews</Link>

      <Card className="flex items-center justify-between gap-2 p-4">
        <p className="font-display text-lg font-semibold">{submission.skillLabel}</p>
        {data.thirdOpinion && <Badge>The first two differed: yours decides</Badge>}
      </Card>

      {rubric.draft && (
        <Card className="p-4 text-sm text-muted-foreground">This rubric is a draft that has not yet been worked through with someone who practises the skill. If a line doesn't fit the work, say so in your comment.</Card>
      )}

      <SkillWorkViewer work={submission} />

      {data.myReview && <Card className="p-4 text-sm">You scored this one: {data.myReview.verdict === 'pass' ? 'pass' : 'not yet'}. {data.myReview.comment}</Card>}

      {open && (
        <Card className="space-y-4 p-4">
          <p className="font-medium">Score each line</p>
          {rubric.lines.map((l) => (
            <fieldset key={l.key} className="space-y-1">
              <legend className="text-sm font-medium">{l.label}</legend>
              <p className="text-xs text-muted-foreground">{l.looksLike}</p>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={l.label}>
                {rubric.scale.map((s) => (
                  <button
                    key={s.score}
                    type="button"
                    role="radio"
                    aria-checked={scores[l.key] === s.score}
                    onClick={() => setScores((cur) => ({ ...cur, [l.key]: s.score }))}
                    className={cn('min-h-10 rounded-md border px-3 text-sm transition-colors sm:min-h-0 sm:py-1.5', scores[l.key] === s.score ? 'border-transparent bg-primary text-primary-foreground' : 'hover:bg-secondary/60')}
                  >
                    {s.score} · {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="space-y-1">
            <Label htmlFor="comment">What the person should know {lowest <= 2 || !complete ? '(required for Not yet)' : '(optional)'}</Label>
            <textarea id="comment" className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Be specific: which part, and what to change." />
          </div>

          {complete && lowest === 1 && <p className="text-sm text-muted-foreground">A line is below the standard, so this can only be Not yet.</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => send('pass')} disabled={!complete || lowest === 1 || busy !== null}>
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
