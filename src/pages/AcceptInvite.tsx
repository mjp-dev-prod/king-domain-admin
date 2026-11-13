import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AuthChecking, AuthLayout, AuthNotice } from '@/components/auth/AuthLayout'
import { Eyebrow } from '@/components/kd/PageHeader'
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
    <AuthLayout title="Set up your account">
      {checking ? (
        <AuthChecking>Checking your invite…</AuthChecking>
      ) : !invite ? (
        <AuthNotice tone="bad" icon={AlertCircle}>
          <p className="text-sm text-bad">{error}</p>
          <p className="text-xs text-text-2">Ask whoever invited you to send a new link.</p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </AuthNotice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="rounded-lg bg-secondary px-3 py-2">
            <Eyebrow>Signing up as</Eyebrow>
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
            <p className="text-xs text-text-2">At least {MIN_PASSWORD} characters.</p>
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
            <p className="text-sm text-bad animate-in fade-in" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" glow className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Create account
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
