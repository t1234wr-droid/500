import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, homePathForRole } from '@/modules/core/store'
import { BootstrapScreen, LoginScreen } from '@/modules/core/AuthScreens'
import { SvRoutes, AdminRoutes } from '@/modules/registry'
import { ru } from '@/i18n/ru'
import { Package } from 'lucide-react'

function App() {
  const state = useAuth((s) => s.state)
  const init = useAuth((s) => s.init)
  const profile = useAuth((s) => s.profile)

  useEffect(() => {
    init()
  }, [init])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
          <Package className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm text-slate-400">{ru.app.loading}</p>
      </div>
    )
  }

  if (state === 'bootstrap') {
    return <BootstrapScreen />
  }

  if (state === 'login') {
    return <LoginScreen />
  }

  // ready
  if (!profile) {
    return <LoginScreen />
  }

  const home = homePathForRole(profile.role)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sv/*" element={<SvRoutes />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
