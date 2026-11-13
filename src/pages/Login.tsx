import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const { user, loading, setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { user } = await api.login(email, password)
      setUser(user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Sign in" footer="Access is invite only.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-violet-text transition-colors hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
