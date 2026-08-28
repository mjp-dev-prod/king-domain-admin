import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-bold text-gold">KD</p>
          <p className="label mt-2">Reset your password</p>
        </div>

        {sent ? (
          <div className="animate-in fade-in slide-in-from-top-1 space-y-4 rounded-md border border-green-soft/30 bg-green-soft/5 p-4 text-center">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-green-soft/15 text-green-soft">
              <Check className="size-4" />
            </span>
            <p className="text-sm">
              If <span className="font-medium">{email}</span> has an account, a reset link is
              on its way.
            </p>
            <p className="text-xs text-muted-foreground">
              The link expires in 1 hour. Check spam if it doesn&rsquo;t show up soon.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&rsquo;ll send you a link to reset your password.
            </p>

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
              <p className="text-sm text-destructive animate-in fade-in" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
