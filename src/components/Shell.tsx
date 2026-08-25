import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/entries', label: 'Entries' },
  { to: '/team', label: 'Team', ownerOnly: true },
]

export function Shell() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-gold">KD</span>
            <span className="label hidden sm:inline">Admin</span>
          </div>

          <nav className="flex flex-1 items-center gap-1">
            {LINKS.filter((l) => !l.ownerOnly || user?.role === 'owner').map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
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

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
