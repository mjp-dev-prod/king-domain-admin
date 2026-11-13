import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AppearanceControl } from '@/components/kd/AppearanceControl'
import { Eyebrow, PageHeader } from '@/components/kd/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_PASSWORD = 12

export function Settings() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (next.length < MIN_PASSWORD) {
      setError(`New password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (next !== confirm) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Password updated', {
        description: 'Every other session was signed out.',
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 animate-in fade-in duration-500">
      <PageHeader title="Settings" description="Your account, and how this dashboard looks to you." />

      <Card className="gap-1 p-5">
        <Eyebrow>Signed in as</Eyebrow>
        <p className="text-sm">{user?.email}</p>
      </Card>

      <Card className="gap-3 p-5">
        <div>
          <Eyebrow className="mb-1">Appearance</Eyebrow>
          <p className="text-sm text-text-2">System follows your device. Light and Dark stay as you choose, in this browser.</p>
        </div>
        <AppearanceControl className="self-start" />
      </Card>

      <Card className="gap-0 p-5">
        <Eyebrow className="mb-1">Change password</Eyebrow>
        <p className="mb-4 text-sm text-text-2">Changing your password signs out every other session.</p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next">New password</Label>
            <Input
              id="next"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <p className="text-xs text-text-2">At least {MIN_PASSWORD} characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-bad animate-in fade-in" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" glow disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
