import * as Sentry from '@sentry/react'

// Guarded on the DSN being set, same pattern as the backend's instrument.js —
// a missing key never blocks the app, it just means nothing is captured.
// This exists specifically because a Safari/iOS-only failure (cross-site
// cookie rejection, most likely — see api.ts's credentials:'include' comment)
// was previously invisible to us: the only signal was a screenshot of a
// generic "Could not load stats" message with the real cause thrown away.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Session Replay — lets us watch what actually happened in a device-
      // specific report like "Could not load stats" on one admin's iPhone,
      // instead of guessing from a screenshot alone.
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.2,
    // Replays are cheap to sample broadly here — this is an internal admin
    // dashboard with a handful of users, not a public high-traffic app.
    replaysSessionSampleRate: 0.1,
    // Always capture a replay when an error actually happens, regardless of
    // the session sample rate above — this is the case that matters.
    replaysOnErrorSampleRate: 1.0,
  })
}

export { Sentry }
