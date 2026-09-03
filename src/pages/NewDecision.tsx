import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function NewDecision() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [milestoneRef, setMilestoneRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const result = await api.createDecision(title, description, milestoneRef)
      toast.success('Decision posted')
      navigate(`/decisions/${result.decision.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not post the decision.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in fade-in duration-500">
      <h1 className="font-display text-2xl font-semibold">New decision</h1>

      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="What's being decided, and why."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone">Milestone (optional)</Label>
            <Input
              id="milestone"
              value={milestoneRef}
              onChange={(e) => setMilestoneRef(e.target.value)}
              placeholder="e.g. 03"
              className="max-w-32"
            />
            <p className="text-xs text-muted-foreground">
              Links this decision to a milestone in the Marketplace Decision Ledger, if relevant.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/decisions')}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Post decision
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
