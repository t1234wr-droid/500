import { useAuth } from '@/modules/core/store'
import { ru } from '@/i18n/ru'
import { Package, LogOut } from 'lucide-react'

export function ProfilePage() {
  const profile = useAuth((s) => s.profile)
  const signOut = useAuth((s) => s.signOut)

  if (!profile) return null

  const roleLabel = profile.role === 'admin' ? ru.profile.roleAdmin : ru.profile.roleSupervisor

  return (
    <div className="px-4 pt-8 pb-28">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mb-3">
          <Package className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-800">{profile.full_name}</h1>
        <span className="text-sm text-slate-400 mt-1">{roleLabel}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
        <Row label={ru.profile.name} value={profile.full_name} />
        <Row label={ru.profile.login} value={profile.login} />
        <Row label={ru.profile.role} value={roleLabel} />
      </div>

      <button
        onClick={signOut}
        className="w-full mt-6 bg-white border border-red-200 text-red-600 rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        {ru.profile.logout}
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value}</span>
    </div>
  )
}
