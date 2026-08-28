import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_PASSWORD = 12

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const { user } = useAuth()

  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('This link is missing its token.')
      setChecking(false)
      return
    }

    api
      .checkResetToken(token)
      .then((data) => setEmail(data.email))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not check this link.'),
      )
      .finally(() => setChecking(false))
  }, [token])

  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-bold text-gold">KD</p>
          <p className="label mt-2">Set a new password</p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline size-4 animate-spin" />
            Checking your link…
          </p>
        ) : done ? (
          <div className="animate-in fade-in slide-in-from-top-1 space-y-4 rounded-md border border-green-soft/30 bg-green-soft/5 p-4 text-center">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-green-soft/15 text-green-soft">
              <Check className="size-4" />
            </span>
            <p className="text-sm">Password updated. Every other session was signed out.</p>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          </div>
        ) : !email ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Link
              to="/forgot-password"
              className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <p className="label">Resetting password for</p>
              <p className="text-sm">{email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD} characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
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

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Reset password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
