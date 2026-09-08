import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Shell } from '@/components/Shell'
import { Login } from '@/pages/Login'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { AcceptInvite } from '@/pages/AcceptInvite'
import { Overview } from '@/pages/Overview'
import { Entries } from '@/pages/Entries'
import { Team } from '@/pages/Team'
import { Settings } from '@/pages/Settings'
import { Decisions } from '@/pages/Decisions'
import { DecisionDetail } from '@/pages/DecisionDetail'
import { NewDecision } from '@/pages/NewDecision'
import { AppReleases } from '@/pages/AppReleases'
import { Ledger } from '@/pages/Ledger'
import { Toaster } from '@/components/ui/sonner'
import { Sentry } from '@/lib/sentry'

function Protected() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Shell />
}

/** Owner-only routes fall back to the overview rather than erroring. */
function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'owner') return <Navigate to="/" replace />
  return <>{children}</>
}

function CrashFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display text-xl font-semibold">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">
        This has been reported. Try reloading the page.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ error }) => <CrashFallback error={error} />}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            <Route element={<Protected />}>
              <Route index element={<Overview />} />
              <Route path="entries" element={<Entries />} />
              <Route path="decisions" element={<Decisions />} />
              <Route
                path="decisions/new"
                element={
                  <OwnerOnly>
                    <NewDecision />
                  </OwnerOnly>
                }
              />
              <Route path="decisions/:id" element={<DecisionDetail />} />
              <Route path="app-releases" element={<AppReleases />} />
              <Route path="ledger" element={<Ledger />} />
              <Route
                path="team"
                element={
                  <OwnerOnly>
                    <Team />
                  </OwnerOnly>
                }
              />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}
