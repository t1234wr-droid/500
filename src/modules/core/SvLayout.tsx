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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => {
            const active = tab.end ? pathname === tab.to : pathname.startsWith(tab.to)
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="flex-1 flex flex-col items-center gap-1 py-2.5"
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'text-sky-600' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[11px] ${active ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>
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
