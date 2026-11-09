import { useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Inbox as InboxIcon,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  MessageSquareWarning,
  Scale,
  ScanSearch,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  FileText,
  UserSearch,
  Flag,
  Smartphone,
  Users,
  Vote,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { type AdminCapability } from '@/lib/api'
import { can } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  ownerOnly?: boolean
  capability?: AdminCapability
}

type NavGroup = { title: string; items: NavItem[] }

/** Queues first (what needs a person today), then the product, then the admin's own tools. */
const GROUPS: NavGroup[] = [
  {
    title: 'Work queues',
    items: [
      { to: '/inbox', label: 'Inbox', icon: InboxIcon },
      { to: '/identity-checks', label: 'Identity', icon: ShieldCheck, capability: 'checker' },
      { to: '/authenticity', label: 'Authenticity', icon: ScanSearch, capability: 'checker' },
      { to: '/skill-reviews', label: 'Skill reviews', icon: ClipboardCheck, capability: 'reviewer' },
      { to: '/job-posts', label: 'Job posts', icon: FileText, capability: 'safety' },
      { to: '/shortlists', label: 'Shortlists', icon: UserSearch, capability: 'support' },
      { to: '/safety-reports', label: 'Safety reports', icon: Flag, capability: 'safety' },
      { to: '/disputes', label: 'Disputes', icon: Scale, capability: 'disputes' },
      { to: '/review-reports', label: 'Reported reviews', icon: MessageSquareWarning, capability: 'safety' },
      { to: '/start-proofs', label: 'Start proofs', icon: FileCheck2, capability: 'disputes' },
      { to: '/chargebacks', label: 'Chargebacks', icon: CreditCard, capability: 'finance' },
    ],
  },
  {
    title: 'Product',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/entries', label: 'Entries', icon: List },
      { to: '/decisions', label: 'Decisions', icon: Vote },
      { to: '/ledger', label: 'Ledger', icon: BookOpen },
      { to: '/app-releases', label: 'App Releases', icon: Smartphone },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/audit', label: 'Audit log', icon: ScrollText, capability: 'shareholder' },
      { to: '/team', label: 'Team', icon: Users, ownerOnly: true },
    ],
  },
]

/** Everything the sidebar holds. The same content sits in the fixed column on desktop and in the slide-out on phones. */
function SidebarBody({ onNavigate, touch }: { onNavigate?: () => void; touch?: boolean }) {
  const { user, signOut } = useAuth()
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((l) => (!l.ownerOnly || user?.role === 'owner') && (!l.capability || can(user, l.capability))),
  })).filter((g) => g.items.length > 0)

  const row = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 text-sm transition-colors',
      touch ? 'min-h-12 text-[0.95rem]' : 'min-h-10',
      isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
    )

  return (
    <>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="label px-3 pb-1.5">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} onClick={onNavigate} className={({ isActive }) => row(isActive)}>
                  <link.icon className="size-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border p-3">
        <p className="truncate px-3 pb-1 text-xs text-muted-foreground">{user?.name || user?.email}</p>
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => row(isActive)}>
          <SettingsIcon className="size-4 shrink-0" />
          Settings
        </NavLink>
        <button onClick={signOut} className={cn(row(false), 'w-full')}>
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  )
}

function Brand({ className }: { className?: string }) {
  return (
    <NavLink to="/" className={cn('flex min-h-11 shrink-0 items-center gap-2', className)}>
      <span className="font-display text-lg font-bold text-gold">KD</span>
      <span className="label">Admin</span>
    </NavLink>
  )
}

export function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-dvh">
      {/* Desktop: a fixed column down the left. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Brand />
        </div>
        <SidebarBody />
      </aside>

      {/* Phones and tablets: a slim bar with the same sidebar in a slide-out. */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Brand className="-mx-2 px-2" />
          <div className="ml-auto">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="border-b border-border px-5 pt-5 pr-14 pb-4">
                  <SheetTitle>
                    <span className="text-gold">KD</span> Admin
                  </SheetTitle>
                  <SheetDescription className="mt-1 truncate">{user?.name || user?.email}</SheetDescription>
                </div>
                <SidebarBody touch onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:ml-64 lg:max-w-none lg:px-8 xl:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
