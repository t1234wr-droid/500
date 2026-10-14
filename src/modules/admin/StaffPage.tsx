import { useState, useEffect } from 'react'
import { fetchAllStaff, createStaff, updateStaff, deleteStaff } from '@/modules/admin/api'
import type { Staff } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { toast } from '@/lib/toast'
import { Plus, Trash2, Edit3, X, Check, Phone } from 'lucide-react'

export function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [adding, setAdding] = useState(false)

  const load = () => {
    fetchAllStaff().then(setStaff).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{ru.admin.staff.title}</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-sky-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {ru.admin.staff.add}
        </button>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-slate-400 text-center mt-8">{ru.admin.staff.noStaff}</p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                  <p className="text-xs text-slate-400">{s.role}</p>
                  {s.phone && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{s.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {s.active ? ru.admin.staff.active : ru.admin.staff.inactive}
                  </span>
                  <button onClick={() => setEditing(s)} className="text-slate-400 hover:text-sky-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || adding) && (
        <StaffEditor
          staff={editing}
          onClose={() => { setEditing(null); setAdding(false) }}
          onSave={async (name, roleVal, phone, active) => {
            try {
              if (editing) {
                await updateStaff(editing.id, { full_name: name, role: roleVal, phone, active })
              } else {
                await createStaff(name, roleVal, phone)
              }
              toast(ru.admin.staff.save, 'success')
              setEditing(null)
              setAdding(false)
              load()
            } catch (e) {
              toast(String(e), 'error')
            }
          }}
          onDelete={editing ? async () => {
            try {
              await deleteStaff(editing.id)
              toast(ru.admin.staff.delete, 'success')
              setEditing(null)
              load()
            } catch (e) {
              toast(String(e), 'error')
            }
          } : undefined}
        />
      )}
    </div>
  )
}

function StaffEditor({
  staff,
  onClose,
  onSave,
  onDelete,
}: {
  staff: Staff | null
  onClose: () => void
  onSave: (name: string, role: string, phone: string, active: boolean) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(staff?.full_name ?? '')
  const [roleVal, setRoleVal] = useState(staff?.role ?? 'housekeeper')
  const [phone, setPhone] = useState(staff?.phone ?? '')
  const [active, setActive] = useState(staff?.active ?? true)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{staff ? ru.admin.staff.title : ru.admin.staff.add}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.staff.name}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.staff.role}</label>
            <input value={roleVal} onChange={(e) => setRoleVal(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.staff.phone}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20123456789" className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          {staff && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-slate-600">{ru.admin.staff.active}</span>
            </label>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          {onDelete && (
            <button onClick={() => { if (confirm(ru.admin.staff.confirmDelete)) onDelete() }} className="bg-red-50 text-red-600 rounded-xl px-4 py-3 font-medium">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">{ru.cleaning.cancel}</button>
          <button
            onClick={() => onSave(name.trim(), roleVal.trim(), phone.trim(), active)}
            disabled={!name.trim()}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {ru.admin.staff.save}
          </button>
        </div>
      </div>
    </div>
  )
}
