import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/forms/Textarea'
import { PageHeader } from '@/components/kd/PageHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MILESTONES, findMilestone } from '@/lib/milestones'

const NONE_VALUE = '__none__'

export function NewDecision() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [milestoneRef, setMilestoneRef] = useState(NONE_VALUE)
  const [submitting, setSubmitting] = useState(false)

  const selectedMilestone = findMilestone(milestoneRef === NONE_VALUE ? null : milestoneRef)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const result = await api.createDecision(
        title,
        description,
        milestoneRef === NONE_VALUE ? undefined : milestoneRef,
      )
      toast.success('Decision posted')
      navigate(`/decisions/${result.decision.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not post the decision.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 animate-in fade-in duration-500">
      <PageHeader title="New decision" description="Put a question to the shareholders. They each say where they stand." />

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
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="What's being decided, and why."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone">Milestone (optional)</Label>
            <Select value={milestoneRef} onValueChange={setMilestoneRef}>
              <SelectTrigger id="milestone" className="w-full">
                <SelectValue placeholder="No milestone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No milestone</SelectItem>
                {MILESTONES.map((m) => (
                  <SelectItem key={m.ref} value={m.ref}>
                    {m.ref} — {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMilestone && (
              <p className="text-xs text-text-2">{selectedMilestone.summary}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/decisions')}>
              Cancel
            </Button>
            <Button type="submit" glow disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Post decision
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
