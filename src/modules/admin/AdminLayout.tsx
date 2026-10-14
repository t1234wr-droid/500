import { NavLink, useLocation } from 'react-router-dom'
import { ru } from '@/i18n/ru'
import { Home, Package, Plus, Building2, MoreHorizontal } from 'lucide-react'

const tabs = [
  { to: '/admin', icon: Home, label: ru.admin.nav.home, end: true },
  { to: '/admin/stock', icon: Package, label: ru.admin.nav.stock },
  { to: '/admin/move', icon: Plus, label: ru.admin.nav.move, end: true },
  { to: '/admin/apartments', icon: Building2, label: ru.admin.nav.apartments },
  { to: '/admin/more', icon: MoreHorizontal, label: ru.admin.nav.more, end: true },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => {
            const active = tab.end ? pathname === tab.to : pathname.startsWith(tab.to)
            const Icon = tab.icon
            const isPlus = tab.label === ru.admin.nav.move
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="flex-1 flex flex-col items-center gap-1 py-2.5"
              >
                {isPlus ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center -mt-1 ${active ? 'bg-sky-600' : 'bg-slate-300'}`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 ${active ? 'text-sky-600' : 'text-slate-400'}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                )}
                <span className={`text-[10px] ${active ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>
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
