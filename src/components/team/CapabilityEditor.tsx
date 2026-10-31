import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError, type AdminCapability, type AdminUser, type Skill } from '@/lib/api'
import { CAPABILITY_LABELS } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALL = Object.keys(CAPABILITY_LABELS) as AdminCapability[]

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function CapabilityEditor({ admin, skills, onSaved }: { admin: AdminUser; skills: Skill[]; onSaved: (a: AdminUser) => void }) {
  const [caps, setCaps] = useState<AdminCapability[]>(admin.capabilities)
  const [reviewSkills, setReviewSkills] = useState<string[]>(admin.reviewerSkills)
  const [saving, setSaving] = useState(false)
  const changed =
    [...caps].sort().join() !== [...admin.capabilities].sort().join() ||
    [...reviewSkills].sort().join() !== [...admin.reviewerSkills].sort().join()

  async function save() {
    setSaving(true)
    try {
      const r = await api.setCapabilities(admin.id, { capabilities: caps, reviewerSkills: caps.includes('reviewer') ? reviewSkills : [] })
      toast.success('Roles saved')
      onSaved(r.admin)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the roles.')
    } finally {
      setSaving(false)
    }
  }

  if (admin.role === 'owner') return <p className="text-sm text-muted-foreground">Owner: can do everything.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ALL.map((c) => (
          <button
            key={c}
            type="button"
            title={CAPABILITY_LABELS[c].does}
            aria-pressed={caps.includes(c)}
            onClick={() => setCaps(toggle(caps, c))}
            className={cn('rounded-full border px-3 py-1 text-sm', caps.includes(c) ? 'border-primary bg-primary/10' : 'text-muted-foreground')}
          >
            {CAPABILITY_LABELS[c].label}
          </button>
        ))}
      </div>
      {caps.includes('reviewer') && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Reviews proof in:</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={reviewSkills.includes(s.key)}
                onClick={() => setReviewSkills(toggle(reviewSkills, s.key))}
                className={cn('rounded-full border px-3 py-1 text-sm', reviewSkills.includes(s.key) ? 'border-primary bg-primary/10' : 'text-muted-foreground')}
              >
                {s.label}
              </button>
            ))}
          </div>
          {reviewSkills.length === 0 && <p className="text-xs text-destructive">Choose at least one skill, or this reviewer sees no proof.</p>}
        </div>
      )}
      <Button size="sm" onClick={save} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save roles'}</Button>
    </div>
  )
}
