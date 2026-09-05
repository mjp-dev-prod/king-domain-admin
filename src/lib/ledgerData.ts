/**
 * Content mirrors the Marketplace Decision Ledger (originally a private
 * Claude artifact — moved here so every shareholder with dashboard access
 * can actually read it, not just the two people with access to that
 * artifact). Update both if the ledger's reasoning changes; this is the
 * shareholder-facing copy, the artifact (if kept) is a personal reference.
 */

export type MilestoneStatus = 'settled' | 'partial' | 'open'

export type LedgerMilestone = {
  ref: string
  title: string
  question: string
  status: MilestoneStatus
  decisionDate?: string
  decisionSummary?: string
  sections: { heading: string; items: string[] }[]
  weeklyLog: string
}

export const LEDGER_MILESTONES: LedgerMilestone[] = [
  {
    ref: '01',
    title: 'Lock the Marketplace Model',
    question:
      'Service catalogue, job board, matching-first, or a deliberate hybrid — this decides discovery, listings, proposals, and the entire interaction shape.',
    status: 'settled',
    decisionDate: '3 Sep 2026',
    decisionSummary:
      'King Domain launches as a job marketplace with proof-gated applications: clients post jobs, talent applies with their profile and proof attached (portfolio, credentials, assessments). Matching-first is an explicit phase 2, once real usage data exists to make recommendations meaningful rather than guesswork.',
    sections: [
      {
        heading: 'Why job marketplace, not the alternatives',
        items: [
          'vs. Service catalogue: optimizes for browsing fixed packages by price, which sidelines proof at the exact moment it should matter most.',
          'vs. Matching-first: needs real signal (completed jobs, ratings, category demand) to recommend well. Launching with it on day one means recommending on no data.',
          'vs. Hybrid (undifferentiated): "hybrid" without naming which mechanism is primary at launch is a non-decision.',
          "A job marketplace puts client-reviewed proof directly in the moment a client chooses who to trust — the strongest fit for the cold-start problem the product exists to solve.",
        ],
      },
      {
        heading: 'Known costs, accepted knowingly',
        items: [
          'Proposal noise: without safeguards, new talent can spam-apply to jobs they’re not qualified for. Milestone 03 addresses this via proof-completeness gating.',
          'No smart discovery at launch — clients do the matching work themselves. Phase 2 (matching-first) is the planned answer.',
        ],
      },
    ],
    weeklyLog:
      'Decided the marketplace model: job marketplace + proof-gated applications, matching-first deferred to phase 2.',
  },
  {
    ref: '02',
    title: 'Map Journeys & Screens',
    question:
      'Translate the client and talent journeys into concrete end-to-end screen flows, now that the marketplace model is locked.',
    status: 'settled',
    decisionDate: '3 Sep 2026',
    decisionSummary:
      'Full screen list mapped for both journeys (22 screens + 2 shared), reviewed for gaps, with three additions folded in: a symmetric client verification screen (C1.5), an explicit revision cap of 2 before forced dispute, and a deliberate messaging-scope decision.',
    sections: [
      {
        heading: 'Talent journey (T1–T12)',
        items: [
          'T1 Onboarding/Sign Up · T2 Profile Builder · T3 Proof Upload · T4 Job Feed · T5 Job Detail · T6 Apply/Proposal',
          'T7 My Applications · T8 Active Contract · T9 Delivery Submission · T10 Payout/Earnings · T11 Reputation/Standing · T12 Dispute',
        ],
      },
      {
        heading: 'Client journey (C1–C10)',
        items: [
          'C1 Onboarding/Sign Up · C1.5 Client Profile & Verification (new — symmetric trust signal) · C2 Post a Job · C3 My Jobs · C4 Proposals/Applicants',
          'C5 Talent Profile (client view) · C6 Select & Fund · C7 Active Contract · C8 Review Delivery · C9 Leave Review · C10 Dispute',
        ],
      },
      {
        heading: 'Scope decision — no standalone messaging product for v1',
        items: [
          'Pre-hire interviewing folds into C4/T7; in-contract communication folds into T8/C7. Whether this needs real-time chat eventually was left open here and settled under Milestone 03.',
        ],
      },
    ],
    weeklyLog:
      'Mapped both journeys screen-by-screen. Added C1.5, set the revision cap at 2, scoped messaging into existing screens rather than a standalone product for v1.',
  },
  {
    ref: '03',
    title: 'Define the Trust Model',
    question:
      'Verification mechanics, proof-of-skill design, reputation/progression scoring, moderation and abuse handling.',
    status: 'settled',
    decisionDate: '3 Sep 2026',
    decisionSummary:
      'Verification is self-submitted work samples, human-reviewed by the King Domain team — one submission per skill category, reviewed once, permanent (no renewal). A talent must hold Verified status in a category to apply to jobs in it. Progression above Verified is driven purely by completed jobs + client ratings. Abuse/moderation is manual: a report action routes to the admin dashboard for human review.',
    sections: [
      {
        heading: 'Why human-reviewed work samples, not the alternatives',
        items: [
          'vs. platform-native skill test: requires building real, credible assessment content per category before launch.',
          'vs. institutional proof (school/program affiliation): only covers talent who has that affiliation.',
          'Work samples are credible from day one with zero existing user base, and put the review burden on the team rather than infrastructure that doesn’t exist yet.',
        ],
      },
      {
        heading: 'Progression thresholds — deliberately deferred, not guessed',
        items: [
          'Evidence type (completed jobs + ratings) and stage order are locked now. Exact numeric thresholds between stages are left as a tunable config value, set once there’s real usage data.',
        ],
      },
      {
        heading: 'Messaging — explicitly deferred, not declined',
        items: [
          'Real-time chat (porting pendu’s socket architecture, adapted to job/application/contract threads) is the preferred direction. It is not being built now: Render’s free tier doesn’t reliably support the persistent connections it needs. Build trigger: moving to a hosting tier that supports them. Threaded comments remain the interim mechanism.',
        ],
      },
      {
        heading: 'Known costs, accepted knowingly',
        items: [
          'First-time applicants face an upfront review-wait before their first application in a category.',
          'No automated abuse detection at launch — accepted given team size.',
        ],
      },
    ],
    weeklyLog:
      'Settled the trust model: human-reviewed work samples gate applications; completed jobs + ratings drive progression; abuse handling is manual; real-time chat deferred to a future hosting migration.',
  },
  {
    ref: '04',
    title: 'Transaction & Payment Model',
    question:
      'Protected-transaction state machine plus the real-world payment provider and legal/compliance structure it has to run on.',
    status: 'open',
    sections: [
      {
        heading: 'Critical boundary',
        items: [
          'The app database is never a substitute for regulated financial infrastructure. This milestone doesn’t close on a diagram alone — it closes on a real provider evaluated against our jurisdiction and dispute needs.',
        ],
      },
      {
        heading: 'Closes when',
        items: [
          'Payment provider chosen (or shortlisted with a clear decision path) and the full state lifecycle is mapped to what that provider actually supports, including the revision-cap → dispute trigger from Milestone 02.',
        ],
      },
    ],
    weeklyLog: 'Not yet reported.',
  },
  {
    ref: '05',
    title: 'Progression Model',
    question:
      'What each reputation stage (New → Verified → Rising → Trusted → Top) actually means, and what evidence moves someone between them.',
    status: 'partial',
    sections: [
      {
        heading: 'Evidence model settled under Milestone 03',
        items: [
          '"Verified" is the work-sample gate. Everything above it advances purely on completed jobs + client ratings, no soft engagement signals. What remains open is narrower: the actual numeric thresholds per stage, deferred pending real usage data.',
        ],
      },
    ],
    weeklyLog:
      'Evidence model (completed jobs + ratings, stage order) settled as part of Milestone 03. Numeric thresholds remain open.',
  },
  {
    ref: '06',
    title: 'Domain Objects & State Machines',
    question:
      'Jobs, orders, submissions, reviews, payouts, disputes, profiles, verification records — defined at the product level, before any schema exists.',
    status: 'open',
    sections: [
      {
        heading: 'Why this is last before engineering',
        items: [
          'Everything upstream (milestones 01–05) has to be settled for these objects to be more than a guess.',
        ],
      },
    ],
    weeklyLog: 'Not yet reported.',
  },
  {
    ref: '07',
    title: 'Engineering Handoff',
    question:
      'Translate the settled product model into technical architecture, API contracts, data models, and infrastructure decisions.',
    status: 'open',
    sections: [
      {
        heading: 'Closes when',
        items: [
          'We have an architecture document that traces every technical decision back to a settled product decision above it.',
        ],
      },
    ],
    weeklyLog: 'Not yet reported.',
  },
]

export const LEDGER_ADDENDUM = [
  {
    title: 'Database & data layer — Postgres + Prisma via Supabase',
    body: 'Originally deferred pending domain modelling (Milestone 06). Pulled forward once the waitlist and admin dashboard needed real persistence. The actual domain objects (jobs, applications, proof records) are still undecided and wait on Milestone 06.',
  },
  {
    title: 'Brand v0 — ink/paper/gold palette, Fraunces + Public Sans',
    body: 'Locked while building the waitlist landing page, explicitly versioned as "v0" and revisable by a motion designer later. Documented in king-domain-mobile/CLAUDE.md.',
  },
]
