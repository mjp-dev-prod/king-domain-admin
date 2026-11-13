/**
 * The shareholder-facing Decision Ledger. It began as the seven-milestone ledger (a private Claude artifact, moved here so
 * every shareholder can read it) and was brought up to date with the product requirements document (PRD,
 * king-domain-mobile/docs/core/prd.md, decisions D1 to D47) on 2026-11-13. The PRD is the source of truth for what is
 * decided; where this file and the PRD differ, the PRD wins and this file is wrong. The Claude artifact is a stale
 * personal reference.
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

export const LEDGER_UPDATED = '13 Nov 2026 (checked against the code and the build notes)'

export const LEDGER_MILESTONES: LedgerMilestone[] = [
  {
    ref: '01',
    title: 'Lock the Marketplace Model',
    question:
      'Service catalogue, job board, matching-first, or a deliberate hybrid: this decides discovery, listings, proposals, and the entire interaction shape.',
    status: 'settled',
    decisionDate: '3 Sep 2026',
    decisionSummary:
      'King Domain launches as a job marketplace with proof-gated applications: clients post jobs, talent applies with their profile and proof attached. Matching-first is an explicit phase 2, once real usage data exists to make recommendations meaningful rather than guesswork.',
    sections: [
      {
        heading: 'Why job marketplace, not the alternatives',
        items: [
          'vs. Service catalogue: optimizes for browsing fixed packages by price, which sidelines proof at the exact moment it should matter most.',
          'vs. Matching-first: needs real signal (completed jobs, ratings, category demand) to recommend well. Launching with it on day one means recommending on no data.',
          'vs. Hybrid (undifferentiated): "hybrid" without naming which mechanism is primary at launch is a non-decision.',
        ],
      },
      {
        heading: 'Refined by the PRD (31 Oct 2026)',
        items: [
          'Four job types: one delivery, milestones, monthly and hourly. No contests (D1). Ready-made packages sit alongside job posts (D4, still to be posted for stances).',
          'The client sets the price; no bidding (D22). A job closes to new applicants at 50 applicants or 5 days; reopening it is a premium feature (D21).',
          'Talents are ordered by recently active, with no score and a region filter (D23). "Find someone for me" is a person-picked service with a promise computed from data (D24).',
          'Five launch skills: graphic design, short-form video, social media, writing and web development (D25).',
        ],
      },
      {
        heading: 'Known costs, accepted knowingly',
        items: [
          'Proposal noise: without safeguards, new talent can spam-apply to jobs they are not qualified for. The proof gate (Milestone 03) and the soft cap (D21) address it.',
          'No smart discovery at launch: clients do the matching work themselves, with the shortlist service as help. Phase 2 (matching-first) is the planned answer.',
        ],
      },
    ],
    weeklyLog:
      'Marketplace model settled 3 Sep: job marketplace with proof-gated applications. The PRD (31 Oct) added the four job types, the pricing and discovery rules, and the five launch skills.',
  },
  {
    ref: '02',
    title: 'Map Journeys & Screens',
    question:
      'Translate the client and talent journeys into concrete end-to-end screen flows, now that the marketplace model is locked.',
    status: 'settled',
    decisionDate: '3 Sep 2026, extended 31 Oct 2026',
    decisionSummary:
      'The PRD (sections 3 and 5) now holds the journeys and every screen for both sides, plus the team side, and every screen is specified for its empty, loading, failed, waiting, rejected and done states. Messaging, which the September scope left out, is built (slice S4); calls and the AI note-taker are not built yet.',
    sections: [
      {
        heading: 'What was settled in September, and kept',
        items: [
          'A symmetric client profile and verification screen, so talent can judge clients the way clients judge talent.',
          'Two free change rounds per contract, then the dispute path. The PRD keeps this and puts a clock on every step (see Milestone 04).',
        ],
      },
      {
        heading: 'Superseded by the PRD (31 Oct 2026)',
        items: [
          'The 22-screen list (T1 to T12, C1 to C10) is replaced by PRD section 5, which lists every screen and is the one to follow.',
          'No standalone messaging for v1 is reversed: conversations, files and held messages are built. Calls with an AI note-taker that only counts when both people confirm (D26), and a voice recorder inside the app, are decided but not built. Contract messages cannot be deleted (D27). Asking before applying is a talent premium feature (D28).',
        ],
      },
    ],
    weeklyLog:
      'Journeys and screens are now owned by the PRD. September list kept as history; messaging is built, calls and the note-taker are not.',
  },
  {
    ref: '03',
    title: 'Define the Trust Model',
    question:
      'Verification mechanics, proof-of-skill design, reputation, moderation and abuse handling.',
    status: 'settled',
    decisionDate: '3 Sep 2026, revised 31 Oct 2026',
    decisionSummary:
      'Verification follows the PRD protocol (D5): an evidence pack of two or three pieces of real work, a 2 to 3 minute walkthrough on camera, an authenticity check by the team, and two blind reviewers who rate against a per-skill list and give reasons. Result is Verified, then Proven after real jobs (D32). Identity is checked for both sides (D10). Clients are checked before their first job goes live (D16). Moderation stays manual: a person decides, the AI only prepares (D7).',
    sections: [
      {
        heading: 'Proving a skill (D5 to D9)',
        items: [
          'Real work is the way in, including your own, school and community work. No practice briefs (D6).',
          'For at least one piece, the talent shows how it was made, in a form written for their skill, from a phone if needed. A link alone is enough (decision posted 2 Nov, awaiting stances).',
          'Reviewers are the team with an AI doing groundwork, at least one who practises the skill (D7).',
          'Resending rejected work: 2 then 3 months before another try. Stolen work: banned (D9).',
        ],
      },
      {
        heading: 'Identity, student status and age (D10 to D15, D47)',
        items: [
          'Identity checks for both sides (D10). The build does not wait for CAC (D11), and until an identity provider is chosen the team checks a NIN slip photo and a short live video by hand (D47); that manual queue is built. No identity provider is connected yet.',
          'Under-18s are supported with guardian consent and are paid to their own account. Section 28 of the Child’s Rights Act is a known risk, not a blocker (D12).',
          'Student status is a label, not a gate. Education line: Student, Graduate, Trained, Self-taught (D14, D15).',
        ],
      },
      {
        heading: 'Trust and safety (D16 to D20)',
        items: [
          'First job posts from new clients are screened (D17). No contact details before award and no outside payment, with in-thread warnings (D18). Talents see the client’s track record (D19). A failed job reopens to the other applicants (D20).',
        ],
      },
      {
        heading: 'What replaced the September decision',
        items: [
          'September: one self-submitted work sample per skill category, reviewed once, permanent, no renewal. The PRD keeps the human review and the proof gate on applications, and replaces the single sample with the full protocol above.',
          'Real-time chat was deferred in September because of Render’s free tier. The PRD puts messaging in slice S4; the build and hosting question is tracked in the PRD, not here.',
        ],
      },
    ],
    weeklyLog:
      'Trust model revised to the PRD protocol: evidence pack, walkthrough, authenticity check, two blind reviewers, identity for both sides, screened client posts. Manual moderation unchanged.',
  },
  {
    ref: '04',
    title: 'Transaction & Payment Model',
    question:
      'Protected-transaction state machine plus the real-world payment provider and legal/compliance structure it has to run on.',
    status: 'partial',
    decisionDate: '1 Oct 2026, extended 31 Oct 2026',
    decisionSummary:
      'Rules are settled. Money is held until the work is approved; every step has a date and a default outcome; disputes get a free ruling with reasons in 5 days, and rulings are final. The platform fee is 10%, never refunded. The provider is Paystack. Paying for a one-delivery job, the start proof, refunds, disputes and chargebacks are built and tested on staging, but nothing is live, and auto-release of payment is switched off until it is turned on deliberately. Still open: Paystack’s written answer on holding funds in the Balance, and the CAC certificate that live payouts depend on.',
    sections: [
      {
        heading: 'Money (D37 to D40, D2, D8)',
        items: [
          'Naira or dollar prices; payouts in naira at the day’s rate; a display currency (D37).',
          'Early money is earned by a start proof in a fixed format per skill: a 20% share the client has 24 hours to object to (D2, D8).',
          'Premium never buys a better place and starts with two features; talents never pay to get or do work (D38, D39).',
          'Tax questions go to the team meeting and an accountant (D40).',
        ],
      },
      {
        heading: 'When things go wrong (D33 to D36, D44)',
        items: [
          'Dispute staircase with 48-hour clocks, then a free 5-day ruling with written reasons; rulings are final (D33, D34).',
          'Abandonment after the start share: the client keeps the work and loses the 20% (D35). Lost chargebacks after paying a talent for approved work are absorbed by King Domain (D36).',
          'Manual money actions above ₦100,000 need a second person to approve (D44).',
        ],
      },
      {
        heading: 'Closes when',
        items: [
          'Paystack confirms in writing that holding funds in the Balance (escrow) is allowed, and that job payments stay outside Google Play Billing on Android.',
          'The CAC certificate is in hand so Paystack can be upgraded to a registered business for live payouts and refunds.',
          'D2, D35 and D36 are posted for the shareholders’ stances (the PRD asks for this).',
        ],
      },
    ],
    weeklyLog:
      'Rules settled. One-delivery payment, start proof, disputes, refunds and chargebacks are built on staging; milestone, monthly and hourly funding, and dollar payments with day’s-rate payouts, are not built. Nothing is live: waiting on Paystack’s written answer and the CAC certificate.',
  },
  {
    ref: '05',
    title: 'Progression Model',
    question:
      'What a person’s standing on the platform means, and what evidence moves them along.',
    status: 'settled',
    decisionDate: '31 Oct 2026',
    decisionSummary:
      'Two states, not five. Verified is the proof gate. Proven is earned by 3 jobs in the skill with no lost dispute, on time, and every client recommending (D32). There are no star averages and no rankings of people: reviews ask specific questions and show facts and counts (D29). Reviews stay hidden until both sides are in, then lock, with one reply each (D30). A private “work with them again?” goes to King Domain only (D31).',
    sections: [
      {
        heading: 'What it replaces',
        items: [
          'The September ladder New, Verified, Rising, Trusted, Top, with thresholds to be tuned later. The PRD drops Rising, Trusted and Top, and the September correction rules out scores that rank people.',
        ],
      },
    ],
    weeklyLog:
      'Settled by the PRD: Verified then Proven (D32), no star averages (D29), reviews hidden until both are in (D30).',
  },
  {
    ref: '06',
    title: 'Domain Objects & State Machines',
    question:
      'Jobs, orders, submissions, reviews, payouts, disputes, profiles, verification records, defined at the product level.',
    status: 'partial',
    decisionSummary:
      'The state machines are defined: one lifecycle per job type (PRD section 4.1), contract timers per unit (24 hours to pay, delivery dates, 2 extensions, 3-day review, 2 change rounds, overdue at +3 days), the proof protocol, disputes and chargebacks. The data model for what is built exists in the database on staging.',
    sections: [
      {
        heading: 'Still open',
        items: [
          'The numbers for hourly reports and monthly notice are Victor’s to confirm (PRD section 7). The milestone, monthly and hourly job types are defined here but their funding and release are not built.',
          'Premium prices, and the shortlist service’s working hours.',
        ],
      },
    ],
    weeklyLog:
      'Defined in the PRD; built for one-delivery jobs. Two numbers and the premium prices are still to confirm.',
  },
  {
    ref: '07',
    title: 'Engineering Handoff',
    question:
      'Translate the settled product model into technical architecture, API contracts, data models, and infrastructure decisions.',
    status: 'partial',
    decisionSummary:
      'The PRD splits the build into slices S0 to S8, each with its own plan, its own admin queue and a walkthrough on Victor’s phone. All work goes to staging; production waits for Victor’s go-ahead. S0 to S8 are built and on staging, except the items named under Not built yet. The real-money test needs the identity and Paystack live keys, which wait on CAC.',
    sections: [
      {
        heading: 'The slices',
        items: [
          'S0 Foundations · S1 Accounts and identity · S2 Proving a skill · S3 Jobs and discovery · S4 Messaging and calls',
          'S5 Contracts and money · S6 Disputes and chargebacks · S7 Reviews and reputation · S8 Packages and premium. Training (D41, D42), dollar payouts and more premium features come later.',
        ],
      },
      {
        heading: 'Not built yet (cut from the slices, on purpose)',
        items: [
          'S4: calls and the AI note-taker, a voice recorder inside the app, live sockets (the app polls), quiet hours and mute.',
          'S5: milestone, monthly and hourly funding and release; dollar payments and payouts at the day’s rate.',
          'S6: emails for dispute steps (push and in-app only); a payout-failures queue; the agent-visit procedure.',
          'S7: a re-check queue for Proven. S8: reports on a package, an admin view of packages and entitlements, and refund notices from Google Play. Premium is not enforced yet.',
        ],
      },
      {
        heading: 'Closes when',
        items: [
          'The real-money test passes on staging with live Paystack and identity keys (target: end of December), which depends on CAC.',
        ],
      },
    ],
    weeklyLog:
      'Slices S0 to S8 built and on staging, with the cuts listed above. The real-money test is waiting on CAC.',
  },
]

export const LEDGER_ADDENDUM = [
  {
    title: 'Database and data layer: Postgres + Prisma',
    body: 'Pulled forward once the waitlist and admin dashboard needed real persistence. Production runs on Supabase; staging and tests run on Neon.',
  },
  {
    title: 'Brand v1: Royal Violet, Public Sans, tonal depth',
    body: 'Chosen by Victor on 2 Oct 2026, replacing v0. The mobile app and, since 13 Nov 2026, this admin dashboard use it (light and dark here). The waitlist site still uses v0. Documented in king-domain-mobile/CLAUDE.md.',
  },
  {
    title: 'No dead ends',
    body: 'Decided 30 Oct 2026: every screen says why it is empty, loading, failed or waiting, and offers the next step. No placeholder or coming-soon pages.',
  },
]

/** PRD section 7: who still has to decide what. Nothing here is a blocker for the build unless it says so. */
export const LEDGER_OPEN_ITEMS: { who: string; what: string }[] = [
  { who: 'Shareholders (this ledger)', what: 'Stances on D2, D4, D21 and D39, D35, D36, D42 and the premium prices. The PRD asks for these to be posted on the Decisions page.' },
  { who: 'Victor', what: 'Hourly report and monthly notice numbers; premium prices; the shortlist service’s working hours.' },
  { who: 'Team meeting and accountant', what: 'Turnover and VAT questions (D40).' },
  { who: 'Balogun', what: 'Training funding details, online alongside in person, and the first-job track (later).' },
  { who: 'Paystack', what: 'A written answer on holding funds in the Balance (escrow), and on job payments staying outside Google Play Billing on Android.' },
  { who: 'Build-phase research', what: 'The identity provider (sandbox first), a partner for dollar payouts, the call media server’s cost, address checks and the agents’ visit procedure.' },
  { who: 'Practitioners per skill', what: 'The rubric, standard and calibration set for each of the five launch skills, one working session each.' },
  { who: 'Known risks, not blockers', what: 'Child’s Rights Act section 28 for under-18 paid work; the brand name is a placeholder and will be renamed.' },
]

export type RegisterEntry = { id: string; decision: string; area: string }

/** The PRD decision register (docs/core/prd.md section 9), D1 to D47, as of 2026-11-13. */
export const LEDGER_REGISTER: RegisterEntry[] = [
  {
    "id": "D1",
    "decision": "Four job types (one delivery, milestones, monthly, hourly); no contests",
    "area": "job types"
  },
  {
    "id": "D2",
    "decision": "Early money is earned by a start proof in a fixed format per skill, smaller than 50%",
    "area": "job types"
  },
  {
    "id": "D3",
    "decision": "Monthly work funded per month on a reminder; card or direct debit only if the client opts in",
    "area": "job types"
  },
  {
    "id": "D4",
    "decision": "Ready-made packages alongside job posts (ledger)",
    "area": "job types"
  },
  {
    "id": "D5",
    "decision": "Verification protocol adopted (evidence pack, walkthrough, authenticity check, two reviewers, reasons, Verified then Proven)",
    "area": "proof"
  },
  {
    "id": "D6",
    "decision": "No practice briefs; real work (including own, school and community work) is the way in; camp work counts",
    "area": "proof"
  },
  {
    "id": "D7",
    "decision": "Reviewers are the team with an AI doing groundwork; staff later; one reviewer who practises the skill",
    "area": "proof"
  },
  {
    "id": "D8",
    "decision": "Start proof: 20% share, 24 hours to object",
    "area": "proof"
  },
  {
    "id": "D9",
    "decision": "No fixed resubmit wait; resending rejected work: 2 then 3 months; stolen work: ban",
    "area": "proof"
  },
  {
    "id": "D10",
    "decision": "Identity checks for both sides",
    "area": "identity"
  },
  {
    "id": "D11",
    "decision": "Build regardless of CAC; provider behind an interface",
    "area": "identity"
  },
  {
    "id": "D12",
    "decision": "Under-18s supported; guardian consent; paid to their own account; s.28 a known risk, not a blocker",
    "area": "identity"
  },
  {
    "id": "D13",
    "decision": "Anyone with real skill can onboard",
    "area": "identity"
  },
  {
    "id": "D14",
    "decision": "Student status is a label, not a gate, not forced to renew",
    "area": "identity"
  },
  {
    "id": "D15",
    "decision": "Education line: Student, Graduate, Trained, Self-taught",
    "area": "identity"
  },
  {
    "id": "D16",
    "decision": "Clients identity-checked before their first job goes live",
    "area": "client trust"
  },
  {
    "id": "D17",
    "decision": "First job posts from new clients screened",
    "area": "client trust"
  },
  {
    "id": "D18",
    "decision": "No contact details before award; no outside payment; in-thread warnings",
    "area": "client trust"
  },
  {
    "id": "D19",
    "decision": "Client track record shown to talents",
    "area": "client trust"
  },
  {
    "id": "D20",
    "decision": "Failed jobs reopen to the other applicants",
    "area": "client trust"
  },
  {
    "id": "D21",
    "decision": "Soft cap at 50 applicants or 5 days; reopening is premium",
    "area": "discovery"
  },
  {
    "id": "D22",
    "decision": "The client sets the price; no bidding",
    "area": "discovery"
  },
  {
    "id": "D23",
    "decision": "Talents ordered by recently active, no score, region filter",
    "area": "discovery"
  },
  {
    "id": "D24",
    "decision": "\"Find someone for me\" with a data-computed promise; talent response-time stat explained",
    "area": "discovery"
  },
  {
    "id": "D25",
    "decision": "Launch skills: graphic design, short-form video, social media, writing, web development",
    "area": "discovery"
  },
  {
    "id": "D26",
    "decision": "Calls in the app with an AI note-taker; summaries count only when both confirm",
    "area": "messaging"
  },
  {
    "id": "D27",
    "decision": "Contract messages can't be deleted",
    "area": "messaging"
  },
  {
    "id": "D28",
    "decision": "Asking before applying is a talent premium feature",
    "area": "messaging"
  },
  {
    "id": "D29",
    "decision": "No star averages; specific questions, facts and counts",
    "area": "reviews"
  },
  {
    "id": "D30",
    "decision": "Reviews hidden until both are in, then locked; one reply each",
    "area": "reviews"
  },
  {
    "id": "D31",
    "decision": "Private \"work with them again?\" for King Domain only",
    "area": "reviews"
  },
  {
    "id": "D32",
    "decision": "Proven: 3 jobs in the skill, no lost dispute, on time, all recommend",
    "area": "reviews"
  },
  {
    "id": "D33",
    "decision": "Dispute staircase with 48-hour clocks and a free 5-day ruling with reasons",
    "area": "disputes"
  },
  {
    "id": "D34",
    "decision": "Rulings are final",
    "area": "disputes"
  },
  {
    "id": "D35",
    "decision": "Abandonment after the start share: client keeps the work, loses the 20%; addresses for in-person follow-up",
    "area": "disputes"
  },
  {
    "id": "D36",
    "decision": "Lost chargebacks after paying a talent for approved work are absorbed by King Domain",
    "area": "disputes"
  },
  {
    "id": "D37",
    "decision": "Naira or dollar prices; naira payouts at the day's rate; display currency",
    "area": "money"
  },
  {
    "id": "D38",
    "decision": "Premium never buys a better place; pre-apply answers shared with all applicants",
    "area": "money"
  },
  {
    "id": "D39",
    "decision": "Premium starts with two features; more much later",
    "area": "money"
  },
  {
    "id": "D40",
    "decision": "Tax goes to the team meeting and an accountant",
    "area": "money"
  },
  {
    "id": "D41",
    "decision": "Training is a later phase, designed in-app",
    "area": "training"
  },
  {
    "id": "D42",
    "decision": "Training paid for by a mix, never tied to getting work",
    "area": "training"
  },
  {
    "id": "D43",
    "decision": "Team inbox, case screens, roles",
    "area": "admin tools"
  },
  {
    "id": "D44",
    "decision": "Second-person approval for manual money actions above ₦100,000 (confirmed 2026-10-31)",
    "area": "admin tools"
  },
  {
    "id": "D45",
    "decision": "Weekly on-call rota",
    "area": "admin tools"
  },
  {
    "id": "D46",
    "decision": "Urgent alerts to phones and Slack; daily digest",
    "area": "admin tools"
  },
  {
    "id": "D47",
    "decision": "Until the identity provider is live, the team checks a NIN slip photo and a short live video by hand; the provider re-checks later (confirmed 2026-10-31)",
    "area": "identity"
  }
]
