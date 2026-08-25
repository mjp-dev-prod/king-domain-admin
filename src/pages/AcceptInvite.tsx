import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_PASSWORD = 12

export function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, setUser } = useAuth()

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState<{ email: string; name: string | null } | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('This link is missing its token.')
      setChecking(false)
      return
    }

    api
      .checkInvite(token)
      .then((data) => {
        setInvite(data)
        setName(data.name ?? '')
      })
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
      const { user } = await api.acceptInvite(token, password, name)
      setUser(user)
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
          <p className="label mt-2">Set up your account</p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline size-4 animate-spin" />
            Checking your invite…
          </p>
        ) : !invite ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ask whoever invited you to send a new link.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <p className="label">Signing up as</p>
              <p className="text-sm">{invite.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              Create account
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
