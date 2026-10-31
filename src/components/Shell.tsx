import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api, PROOF_COUNTS_CHANGED, type AdminCapability } from '@/lib/api'
import { can } from '@/lib/capabilities'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; end?: boolean; ownerOnly?: boolean; badge?: 'proof'; capability?: AdminCapability }

const LINKS: NavItem[] = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/', label: 'Overview', end: true },
  { to: '/entries', label: 'Entries' },
  { to: '/proof-review', label: 'Proof review', badge: 'proof' },
  { to: '/identity-checks', label: 'Identity', capability: 'checker' },
  { to: '/authenticity', label: 'Authenticity', capability: 'checker' },
  { to: '/skill-reviews', label: 'Skill reviews', capability: 'reviewer' },
  { to: '/decisions', label: 'Decisions' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/audit', label: 'Audit log', capability: 'shareholder' },
  { to: '/app-releases', label: 'App Releases' },
  { to: '/team', label: 'Team', ownerOnly: true },
]

/** Proof items waiting on a reviewer — refreshed on navigation and after each decision. */
function usePendingProofCount() {
  const location = useLocation()
  const [pending, setPending] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .proofCounts()
        .then((c) => !cancelled && setPending(c.pending))
        .catch(() => {})
    load()
    window.addEventListener(PROOF_COUNTS_CHANGED, load)
    return () => {
      cancelled = true
      window.removeEventListener(PROOF_COUNTS_CHANGED, load)
    }
  }, [location.pathname])

  return pending
}

function CountBadge({ count }: { count: number | null }) {
  if (!count) return null
  return (
    <span className="tabular ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-open/15 px-1.5 text-[0.7rem] font-semibold text-open">
      {count}
      <span className="sr-only"> waiting</span>
    </span>
  )
}

export function Shell() {
  const { user, signOut } = useAuth()
  const pending = usePendingProofCount()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = LINKS.filter((l) => (!l.ownerOnly || user?.role === 'owner') && (!l.capability || can(user, l.capability)))

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
          <NavLink to="/" className="-mx-2 flex min-h-11 shrink-0 items-center gap-2 px-2">
            <span className="font-display text-lg font-bold text-gold">KD</span>
            <span className="label">Admin</span>
          </NavLink>

          {/* Wide screens: the full row. */}
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {link.label}
                {link.badge === 'proof' && <CountBadge count={pending} />}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground xl:inline">
              {user?.name || user?.email}
            </span>
            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) =>
                cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'hidden lg:inline-flex', isActive && 'bg-secondary')
              }
            >
              <SettingsIcon className="size-4" />
            </NavLink>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="hidden lg:inline-flex">
              <LogOut className="size-4" />
            </Button>

            {/* Phones and tablets: everything moves into a side panel. */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                  {!!pending && <span className="absolute top-2 right-2 size-2 rounded-full bg-open" aria-hidden />}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="border-b border-border px-5 pt-5 pb-4 pr-14">
                  <SheetTitle>
                    <span className="text-gold">KD</span> Admin
                  </SheetTitle>
                  <SheetDescription className="mt-1 truncate">{user?.name || user?.email}</SheetDescription>
                </div>

                <nav className="flex-1 overflow-y-auto p-2">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-12 items-center rounded-md px-3 text-[0.95rem] transition-colors',
                          isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                        )
                      }
                    >
                      {link.label}
                      {link.badge === 'proof' && <CountBadge count={pending} />}
                    </NavLink>
                  ))}
                </nav>

                <div className="space-y-1 border-t border-border p-2">
                  <NavLink
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center gap-3 rounded-md px-3 text-[0.95rem] transition-colors',
                        isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    <SettingsIcon className="size-4" />
                    Settings
                  </NavLink>
                  <button
                    onClick={signOut}
                    className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-[0.95rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
