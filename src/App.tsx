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
import { Inbox } from '@/pages/Inbox'
import { IdentityReview } from '@/pages/IdentityReview'
import { Authenticity } from '@/pages/Authenticity'
import { SkillReviews } from '@/pages/SkillReviews'
import { JobPosts } from '@/pages/JobPosts'
import { Shortlists } from '@/pages/Shortlists'
import { SafetyReports } from '@/pages/SafetyReports'
import { StartProofs } from '@/pages/StartProofs'
import { Disputes } from '@/pages/Disputes'
import { Chargebacks } from '@/pages/Chargebacks'
import { ReviewReports } from '@/pages/ReviewReports'
import { Audit } from '@/pages/Audit'
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
              <Route path="inbox" element={<Inbox />} />
              <Route path="identity-checks" element={<IdentityReview />} />
              <Route path="identity-checks/:id" element={<IdentityReview />} />
              <Route path="authenticity" element={<Authenticity />} />
              <Route path="authenticity/:id" element={<Authenticity />} />
              <Route path="skill-reviews" element={<SkillReviews />} />
              <Route path="skill-reviews/:id" element={<SkillReviews />} />
              <Route path="job-posts" element={<JobPosts />} />
              <Route path="job-posts/:id" element={<JobPosts />} />
              <Route path="shortlists" element={<Shortlists />} />
              <Route path="shortlists/:id" element={<Shortlists />} />
              <Route path="safety-reports" element={<SafetyReports />} />
              <Route path="safety-reports/:id" element={<SafetyReports />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="disputes/:id" element={<Disputes />} />
              <Route path="review-reports" element={<ReviewReports />} />
              <Route path="review-reports/:id" element={<ReviewReports />} />
              <Route path="chargebacks" element={<Chargebacks />} />
              <Route path="chargebacks/:id" element={<Chargebacks />} />
              <Route path="start-proofs" element={<StartProofs />} />
              <Route path="start-proofs/:id" element={<StartProofs />} />
              <Route path="audit" element={<Audit />} />
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
