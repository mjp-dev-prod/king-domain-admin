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

/** A choice you can switch on and off: selected is violet-soft (you chose it), unselected is a quiet surface. */
const chip = (on: boolean) =>
  cn(
    'inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.97]',
    on ? 'bg-brand-tint text-violet-text' : 'bg-secondary text-text-2 hover:text-foreground',
  )

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

  if (admin.role === 'owner') return <p className="text-sm text-text-2">Owner: can do everything.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ALL.map((c) => (
          <button key={c} type="button" title={CAPABILITY_LABELS[c].does} aria-pressed={caps.includes(c)} onClick={() => setCaps(toggle(caps, c))} className={chip(caps.includes(c))}>
            {CAPABILITY_LABELS[c].label}
          </button>
        ))}
      </div>
      {caps.includes('reviewer') && (
        <div className="space-y-1.5">
          <p className="text-sm text-text-2">Reviews proof in:</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <button key={s.key} type="button" aria-pressed={reviewSkills.includes(s.key)} onClick={() => setReviewSkills(toggle(reviewSkills, s.key))} className={chip(reviewSkills.includes(s.key))}>
                {s.label}
              </button>
            ))}
          </div>
          {reviewSkills.length === 0 && <p className="text-xs text-bad">Choose at least one skill, or this reviewer sees no proof.</p>}
        </div>
      )}
      <Button size="sm" onClick={save} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save roles'}</Button>
    </div>
  )
}
