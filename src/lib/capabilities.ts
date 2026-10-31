import type { AdminCapability, AdminUser } from './api'

/** Mirrors the backend: an owner can do everything; anyone else needs the capability. */
export function can(user: AdminUser | null | undefined, capability: AdminCapability): boolean {
  if (!user) return false
  return user.role === 'owner' || user.capabilities.includes(capability)
}

export const CAPABILITY_LABELS: Record<AdminCapability, { label: string; does: string }> = {
  reviewer: { label: 'Reviewer', does: 'Reviews proof in the skills chosen for them' },
  checker: { label: 'Checker', does: 'Checks authenticity, identity and student documents' },
  safety: { label: 'Safety', does: 'Handles reports and screens first job posts' },
  disputes: { label: 'Disputes', does: 'Rules on disputes and start-proof objections' },
  finance: { label: 'Finance', does: 'Refunds, splits, chargebacks and payout failures' },
  support: { label: 'Support', does: 'Builds shortlists and answers help requests' },
  shareholder: { label: 'Shareholder', does: 'Reads the ledger, metrics and audit log' },
}

/** "45 min", "6 h", "3 days", or "not enough data yet" for null. */
export function formatMinutes(min: number | null): string {
  if (min === null) return 'not enough data yet'
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'}`
}
