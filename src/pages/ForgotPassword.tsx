import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AuthLayout, AuthNotice } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPassword() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.forgotPassword(email)
      // Always show the same success state — the endpoint gives an identical
      // response whether or not an account exists, and the UI shouldn't undo
      // that by reacting differently.
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description={sent ? undefined : 'Enter your email and we’ll send you a link to reset your password.'}
      footer={
        <Link to="/login" className="inline-flex items-center justify-center gap-1.5 transition-colors hover:text-foreground">
          <ArrowLeft className="size-3" />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <AuthNotice tone="ok" icon={Check}>
          <p className="text-sm">
            If <span className="font-semibold">{email}</span> has an account, a reset link is on its way.
          </p>
          <p className="text-xs text-text-2">The link expires in 1 hour. Check spam if it doesn&rsquo;t show up soon.</p>
        </AuthNotice>
      ) : (
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

          {error && (
            <p className="text-sm text-bad animate-in fade-in" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" glow className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
