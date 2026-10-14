import { useNavigate } from 'react-router-dom'
import { ru } from '@/i18n/ru'
import { Users, Wrench, Phone, ExternalLink, UserCircle, ChevronRight, ClipboardList } from 'lucide-react'
import { useAuth } from '@/modules/core/store'

export function AdminMore() {
  const navigate = useNavigate()
  const signOut = useAuth((s) => s.signOut)
  const profile = useAuth((s) => s.profile)

  const items = [
    { icon: UserCircle, label: ru.admin.more.staff, path: '/admin/more/staff' },
    { icon: Users, label: ru.admin.more.users, path: '/admin/more/users' },
    { icon: Wrench, label: ru.admin.more.incidents, path: '/admin/more/incidents' },
    { icon: Phone, label: ru.admin.more.contacts, path: '/admin/more/contacts' },
    { icon: ClipboardList, label: ru.admin.more.normTemplates, path: '/admin/more/norm-templates' },
  ]

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-ink mb-4">{ru.admin.more.title}</h1>

      <div className="bg-surface rounded-xl border border-line divide-y divide-[var(--line)] mb-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-app transition-colors"
            >
              <Icon className="w-5 h-5 text-muted" />
              <span className="flex-1 text-sm text-ink">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
          )
        })}
      </div>

      <button
        onClick={() => navigate('/sv')}
        className="w-full bg-surface rounded-xl border border-line px-4 py-3.5 flex items-center gap-3 text-left hover:bg-app transition-colors"
      >
        <ExternalLink className="w-5 h-5 text-accent" />
        <span className="flex-1 text-sm text-accent font-medium">{ru.admin.more.openAsSv}</span>
      </button>

      {profile && (
        <div className="mt-6">
          <div className="bg-surface rounded-xl border border-line px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{profile.full_name}</p>
              <p className="text-xs text-muted">{profile.login}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full mt-3 bg-white border border-line text-bad rounded-xl py-3 font-medium"
          >
            {ru.profile.logout}
          </button>
        </div>
      )}
    </div>
  )
}
