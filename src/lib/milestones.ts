/**
 * The 7 milestones from the Marketplace Decision Ledger artifact — kept as a
 * small constant here rather than a backend model since this list rarely
 * changes and is the same 7 items the ledger already tracks. If the ledger's
 * wording changes, update both places; they're independent sources on
 * purpose (this is a summary for in-app context, the artifact is the real
 * record of reasoning and status).
 */
export type Milestone = {
  ref: string
  title: string
  summary: string
}

export const MILESTONES: Milestone[] = [
  {
    ref: '01',
    title: 'Lock the Marketplace Model',
    summary:
      'Service catalogue, job board, matching-first, or a hybrid — decides discovery, listings, proposals, and the whole interaction shape. Settled: job marketplace with proof-gated applications.',
  },
  {
    ref: '02',
    title: 'Map Journeys & Screens',
    summary:
      'Translate the client and talent journeys into concrete end-to-end screen flows. Settled: full 22-screen map for both journeys, revision cap, messaging scope.',
  },
  {
    ref: '03',
    title: 'Define the Trust Model',
    summary:
      'Verification mechanics, proof-of-skill design, progression scoring, moderation. Settled: human-reviewed work samples gate applications; completed jobs + ratings drive progression; real-time chat deferred to a future hosting migration.',
  },
  {
    ref: '04',
    title: 'Transaction & Payment Model',
    summary:
      'Protected-transaction state machine plus the real-world payment provider and legal/compliance structure it runs on. Open.',
  },
  {
    ref: '05',
    title: 'Progression Model',
    summary:
      'What each reputation stage (New → Verified → Rising → Trusted → Top) means and what evidence moves someone between them. Partially settled — evidence model locked under Milestone 03; numeric thresholds still open.',
  },
  {
    ref: '06',
    title: 'Domain Objects & State Machines',
    summary:
      'Jobs, orders, submissions, reviews, payouts, disputes, profiles, verification records — defined at the product level, before any schema exists. Open, waits on 01-05.',
  },
  {
    ref: '07',
    title: 'Engineering Handoff',
    summary:
      'Translate the settled product model into technical architecture, API contracts, data models, and infrastructure decisions. Open, last before engineering.',
  },
]

export function findMilestone(ref: string | null): Milestone | undefined {
  if (!ref) return undefined
  return MILESTONES.find((m) => m.ref === ref)
}

/**
 * Where shareholders go for the full reasoning behind a milestone's status.
 * An in-app route, not the original Claude artifact — that artifact was
 * private to one Claude account, so it couldn't actually be shared with
 * other shareholders. See src/pages/Ledger.tsx and src/lib/ledgerData.ts.
 */
export const DECISION_LEDGER_URL = '/ledger'
