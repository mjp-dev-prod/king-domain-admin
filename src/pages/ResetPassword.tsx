import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AuthChecking, AuthLayout, AuthNotice } from '@/components/auth/AuthLayout'
import { Eyebrow } from '@/components/kd/PageHeader'
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
    <AuthLayout title="Set a new password">
      {checking ? (
        <AuthChecking>Checking your link…</AuthChecking>
      ) : done ? (
        <AuthNotice tone="ok" icon={Check}>
          <p className="text-sm">Password updated. Every other session was signed out.</p>
          <Button glow className="w-full" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </AuthNotice>
      ) : !email ? (
        <AuthNotice tone="bad" icon={AlertCircle}>
          <p className="text-sm text-bad">{error}</p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </AuthNotice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="rounded-lg bg-secondary px-3 py-2">
            <Eyebrow>Resetting password for</Eyebrow>
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
            Reset password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
