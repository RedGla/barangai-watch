import { createContext, Suspense, useContext } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { m } from 'motion/react'
import { Bell, ClipboardList, House, LifeBuoy, SquarePen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Txt, useText } from '../lib/i18n'
import type { User } from '../features/auth/queries'
import { AccountButton } from '../features/account/AccountSettings'
import { AccountIdentity, AccountMenu } from '../features/account/AccountMenu'
import { Wordmark } from '@/components/BrandMark'
import { useNotifications } from '../features/notifications/NotificationsPage'
import { PageSpinner } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Kap } from '@/components/Kap'
import { useReports } from '../features/reports/queries'
import { DESKTOP, useMediaQuery } from '@/hooks/use-media-query'

const TABS = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/report', label: 'Report', icon: SquarePen },
  { to: '/reports', label: 'My reports', icon: ClipboardList },
  { to: '/updates', label: 'Updates', icon: Bell },
  { to: '/help', label: 'Help', icon: LifeBuoy },
]

const UserContext = createContext<User | null>(null)
/** The signed-in resident, for greetings. */
export const useResident = () => useContext(UserContext)!

/** Avatar for the right of each resident large title (phones and tablets; desktops use the sidebar). */
export function ResidentAccount() {
  const user = useResident()
  return useMediaQuery(DESKTOP) ? null : <AccountButton user={user} />
}

function TabBar() {
  const t = useText()
  const unread = useUnread()
  return (
    <nav
      aria-label={t('Resident sections')}
      className="glass pb-safe fixed inset-x-0 bottom-0 z-40 shadow-[0_-0.5px_0_var(--border)] lg:hidden md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[min(560px,calc(100%-48px))] md:-translate-x-1/2 md:rounded-full md:pb-0 md:shadow-[0_8px_30px_rgb(0_0_0/0.12),0_0_0_0.5px_var(--border)]"
    >
      <ul className="mx-auto flex h-[var(--tabbar)] max-w-2xl items-stretch">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to !== '/reports'}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <m.span
                      className="block"
                      animate={{ scale: isActive ? 1 : 0.92, y: isActive ? -1 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Icon className="size-6" strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                    </m.span>
                    {to === '/updates' && unread > 0 && (
                      <m.span
                        key={unread}
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                        aria-label={`${unread} ${t('unread')}`}
                        className="absolute -top-1 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-white"
                      >
                        {unread}
                      </m.span>
                    )}
                  </span>
                  <Txt>{label}</Txt>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function useUnread() {
  const notices = useNotifications()
  return (notices.data ?? []).filter(item => !item.read_at).length
}

const SECTIONS = [
  { label: 'Reports', tabs: TABS.slice(0, 3) },
  { label: 'Support', tabs: TABS.slice(3) },
]

/** Desktop navigation (1024px and up), in place of the tab bar: the main action, grouped links, a live
    summary of the resident's reports, a way to Help, and the account menu. */
function SideBar({ user }: { user: User }) {
  const t = useText()
  const unread = useUnread()
  const reports = useReports()
  const all = reports.data ?? []
  const open = all.filter(report => !['Resolved', 'Rejected'].includes(report.status)).length
  const resolved = all.filter(report => report.status === 'Resolved').length
  return (
    <aside className="scroll-thin fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col gap-5 overflow-y-auto border-r bg-sidebar px-4 pt-5 pb-4">
      <div className="px-2">
        <Wordmark />
      </div>
      <Button asChild className="w-full shadow-[0_6px_16px_-8px_rgb(29_100_216/0.6)]">
        <Link to="/report">
          <SquarePen />
          <Txt>Report a concern</Txt>
        </Link>
      </Button>
      <nav aria-label={t('Resident sections')} className="space-y-5">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <h2 className="mb-1.5 px-3 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
              <Txt>{section.label}</Txt>
            </h2>
            <ul className="space-y-1">
              {section.tabs.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to !== '/reports'}
                    className={({ isActive }) =>
                      cn(
                        'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                        isActive
                          ? 'bg-card text-primary shadow-[0_1px_3px_rgb(0_0_0/0.08),0_0_0_0.5px_var(--border)]'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent',
                      )
                    }
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="flex-1">
                      <Txt>{label}</Txt>
                    </span>
                    {to === '/updates' && unread > 0 && (
                      <span
                        aria-label={`${unread} ${t('unread')}`}
                        className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white"
                      >
                        {unread}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/reports" className="hairline rounded-xl bg-card px-3 py-2.5 transition-colors hover:bg-accent">
          <strong className="block text-[22px] leading-tight font-bold tabular-nums">{open}</strong>
          <span className="text-[12.5px] text-muted-foreground">
            <Txt>Open</Txt>
          </span>
        </Link>
        <Link to="/reports" className="hairline rounded-xl bg-card px-3 py-2.5 transition-colors hover:bg-accent">
          <strong className="block text-[22px] leading-tight font-bold text-[var(--status-resolved)] tabular-nums">
            {resolved}
          </strong>
          <span className="text-[12.5px] text-muted-foreground">
            <Txt>Resolved</Txt>
          </span>
        </Link>
      </div>
      <div className="mt-auto space-y-3">
        <Link
          to="/help"
          className="flex items-center gap-3 rounded-2xl bg-tint p-3 pr-4 transition-colors hover:bg-primary/15"
        >
          <Kap pose="welcome" className="h-14 w-auto shrink-0" />
          <span className="min-w-0">
            <strong className="block text-[14px] font-semibold">
              <Txt>Need help?</Txt>
            </strong>
            <span className="text-[13px] text-primary">
              <Txt>Ask BarangAI</Txt> →
            </span>
          </span>
        </Link>
        <AccountMenu
          trigger={
            <button
              type="button"
              aria-label={t('Account and settings')}
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent"
            >
              <AccountIdentity user={user} />
            </button>
          }
        />
      </div>
    </aside>
  )
}

/** Phone-first resident app: one column, large titles, iOS-style tab bar (a floating capsule on tablets, a sidebar on desktops). */
export function ResidentShell({ user }: { user: User }) {
  const desktop = useMediaQuery(DESKTOP)
  return (
    <UserContext.Provider value={user}>
      <div className="resident-shell min-h-dvh">
        {desktop && <SideBar user={user} />}
        {/* Desktop pages pick their own width (lists, split views); phones and tablets keep one centred column. */}
        <main className="mx-auto max-w-2xl px-4 pb-[calc(var(--tab-offset)+12px)] sm:px-6 md:pb-32 lg:ml-[17rem] lg:max-w-none lg:px-10 lg:pb-10">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
        {!desktop && <TabBar />}
      </div>
    </UserContext.Provider>
  )
}
