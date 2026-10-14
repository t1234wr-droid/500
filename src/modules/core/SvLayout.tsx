import { NavLink, useLocation } from 'react-router-dom'
import { ru } from '@/i18n/ru'
import { Building2, Wrench, Phone, User } from 'lucide-react'

const tabs = [
  { to: '/sv', icon: Building2, label: ru.nav.apartments, end: true },
  { to: '/sv/incidents', icon: Wrench, label: ru.nav.incidents },
  { to: '/sv/contacts', icon: Phone, label: ru.nav.contacts },
  { to: '/sv/profile', icon: User, label: ru.nav.profile },
]

export function SvLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-app flex flex-col">
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => {
            const active = tab.end ? pathname === tab.to : pathname.startsWith(tab.to)
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
                style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-accent' : 'text-muted'}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`text-[11px] transition-colors ${active ? 'text-accent font-medium' : 'text-muted'}`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
