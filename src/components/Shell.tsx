import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/entries', label: 'Entries' },
  { to: '/decisions', label: 'Decisions' },
  { to: '/app-releases', label: 'App Releases' },
  { to: '/team', label: 'Team', ownerOnly: true },
]

export function Shell() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="font-display text-lg font-bold text-gold">KD</span>
            <span className="label hidden sm:inline">Admin</span>
          </div>

          <nav className="flex flex-1 items-center gap-0.5 sm:gap-1">
            {LINKS.filter((l) => !l.ownerOnly || user?.role === 'owner').map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground md:inline">
              {user?.name || user?.email}
            </span>
            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) =>
                cn(buttonVariants({ variant: 'ghost', size: 'icon' }), isActive && 'bg-secondary')
              }
            >
              <SettingsIcon className="size-4" />
            </NavLink>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
