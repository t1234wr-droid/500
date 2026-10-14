import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ru } from '@/i18n/ru'
import { toast, errorMessage } from '@/lib/toast'
import { Plus, Trash2, Eye, EyeOff, Copy, Check, X, Lock, CreditCard as Edit3 } from 'lucide-react'

interface AdminUser {
  id: string
  login: string
  full_name: string
  active: boolean
  created_at: string
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ login: string; password: string } | null>(null)
  const [copied, setCopied] = useState<'login' | 'password' | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const load = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setUsers(data.users ?? [])
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSetActive = async (id: string, active: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'set_active', id, active: !active } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast(active ? ru.admin.users.inactive : ru.admin.users.active, 'success')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(ru.admin.users.confirmDelete)) return
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', id } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast(ru.admin.users.delete, 'success')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const copy = (text: string, what: 'login' | 'password') => {
    navigator.clipboard.writeText(text)
    setCopied(what)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{ru.admin.users.title}</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-sky-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {ru.admin.users.add}
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-400 text-center mt-8">{ru.admin.users.noUsers}</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.full_name}</p>
                  <p className="text-xs text-slate-400">{u.login}</p>
                </div>
                <button
                  onClick={() => handleSetActive(u.id, u.active)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${u.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  {u.active ? ru.admin.users.active : ru.admin.users.inactive}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const pw = prompt(ru.admin.users.setPassword)
                    if (pw && pw.length >= 8) {
                      supabase.functions.invoke('admin-users', { body: { action: 'set_password', id: u.id, password: pw } })
                        .then(({ data, error }) => {
                          if (error || data?.error) { toast(error?.message ?? data?.error, 'error'); return }
                          toast(ru.admin.users.setPassword, 'success')
                        })
                    } else if (pw) {
                      toast(ru.auth.bootstrapPassword, 'error')
                    }
                  }}
                  className="text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Lock className="w-3 h-3" />
                  {ru.admin.users.setPassword}
                </button>
                <button
                  onClick={() => { setRenaming(u.id); setRenameValue(u.full_name) }}
                  className="text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3 h-3" />
                  {ru.admin.users.rename}
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  {ru.admin.users.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add user form */}
      {adding && (
        <UserCreateForm
          onClose={() => setAdding(false)}
          onCreated={(login, password) => {
            setAdding(false)
            setCreatedCreds({ login, password })
            load()
          }}
        />
      )}

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">{ru.admin.users.renameTitle}</h3>
              <button onClick={() => setRenaming(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRenaming(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">
                {ru.cleaning.cancel}
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'rename', id: renaming, full_name: renameValue.trim() } })
                    if (error) throw error
                    if (data?.error) throw new Error(data.error)
                    toast(ru.admin.users.renamed, 'success')
                    setRenaming(null)
                    load()
                  } catch (e) {
                    toast(errorMessage(e), 'error')
                  }
                }}
                disabled={!renameValue.trim()}
                className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40"
              >
                {ru.admin.users.rename}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created credentials */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">{ru.admin.users.credentialsTitle}</h3>
              <button onClick={() => setCreatedCreds(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-4">{ru.admin.users.credentialsHint}</p>
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{ru.admin.users.login}</p>
                  <p className="text-sm font-medium text-slate-800">{createdCreds.login}</p>
                </div>
                <button onClick={() => copy(createdCreds.login, 'login')} className="text-sky-600">
                  {copied === 'login' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{ru.admin.users.password}</p>
                  <p className="text-sm font-medium text-slate-800">{createdCreds.password}</p>
                </div>
                <button onClick={() => copy(createdCreds.password, 'password')} className="text-sky-600">
                  {copied === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={() => setCreatedCreds(null)} className="w-full mt-4 bg-sky-600 text-white rounded-xl py-3 font-medium">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (login: string, password: string) => void }) {
  const [login, setLogin] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create', login, full_name: fullName, password },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast(ru.admin.users.created, 'success')
      onCreated(login, password)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{ru.admin.users.add}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.users.login}</label>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value.toLowerCase())}
              placeholder="a-z 0-9 . _ -"
              className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.users.fullName}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.users.password}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="мин. 8 символов"
                className="w-full bg-slate-100 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none"
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">{ru.cleaning.cancel}</button>
          <button
            onClick={handleCreate}
            disabled={submitting || !login.trim() || !fullName.trim() || password.length < 8}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40"
          >
            {ru.admin.users.add}
          </button>
        </div>
      </div>
    </div>
  )
}
