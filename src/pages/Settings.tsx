import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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
    <div className="max-w-md space-y-4 animate-in fade-in duration-500">
      <Card className="p-5">
        <p className="label mb-1">Signed in as</p>
        <p className="text-sm">{user?.email}</p>
      </Card>

      <Card className="p-5">
        <p className="label mb-1">Change password</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Changing your password signs out every other session.
        </p>

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
            <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
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
            <p className="text-sm text-destructive animate-in fade-in" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
