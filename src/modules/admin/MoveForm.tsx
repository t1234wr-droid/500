import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWarehouseStock, fetchApartmentsAdmin, fetchAllStaff, postMove } from '@/modules/admin/api'
import type { WarehouseStockRow, Apartment, Staff } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatQty } from '@/lib/format'
import { toast } from '@/lib/toast'
import { ArrowLeft, Plus, Minus, Trash2, Loader2, Check } from 'lucide-react'

interface MoveOpDef {
  op: string
  label: string
  needsApartment: boolean
  needsStaff: boolean
  needsCost: boolean
}

const ops: MoveOpDef[] = [
  { op: 'receipt', label: ru.admin.move.receipt, needsApartment: false, needsStaff: false, needsCost: true },
  { op: 'issue_apartment', label: ru.admin.move.issueApt, needsApartment: true, needsStaff: false, needsCost: false },
  { op: 'return_apartment', label: ru.admin.move.returnApt, needsApartment: true, needsStaff: false, needsCost: false },
  { op: 'writeoff_apartment', label: ru.admin.move.writeoffApt, needsApartment: true, needsStaff: false, needsCost: false },
  { op: 'writeoff_warehouse', label: ru.admin.move.writeoffWh, needsApartment: false, needsStaff: false, needsCost: false },
  { op: 'issue_holder', label: ru.admin.move.issueHolder, needsApartment: false, needsStaff: true, needsCost: false },
  { op: 'return_holder', label: ru.admin.move.returnHolder, needsApartment: false, needsStaff: true, needsCost: false },
  { op: 'writeoff_holder', label: ru.admin.move.writeoffHolder, needsApartment: false, needsStaff: true, needsCost: false },
]

interface CartLine {
  itemId: number
  itemName: string
  qty: string
  unitCost: string
}

export function MoveForm() {
  const navigate = useNavigate()
  const [stock, setStock] = useState<WarehouseStockRow[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [op, setOp] = useState<string>('receipt')
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [staffId, setStaffId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    Promise.all([fetchWarehouseStock(), fetchApartmentsAdmin(), fetchAllStaff()])
      .then(([s, a, st]) => {
        setStock(s)
        setApartments(a)
        setStaffList(st.filter((x) => x.active))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const opDef = ops.find((o) => o.op === op)!
  const filteredStock = useMemo(
    () => stock.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim())).slice(0, 20),
    [stock, search],
  )

  const addToCart = (item: WarehouseStockRow) => {
    setCart((prev) => {
      if (prev.some((l) => l.itemId === item.item_id)) return prev
      return [...prev, { itemId: item.item_id, itemName: item.name, qty: '1', unitCost: '' }]
    })
  }

  const updateLine = (idx: number, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const removeLine = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const handlePost = async () => {
    if (cart.length === 0) {
      toast(ru.admin.move.empty, 'error')
      return
    }
    if (opDef.needsApartment && !apartmentId) {
      toast(ru.admin.move.apartment, 'error')
      return
    }
    if (opDef.needsStaff && !staffId) {
      toast(ru.admin.move.staff, 'error')
      return
    }
    setPosting(true)
    try {
      for (const line of cart) {
        const qty = Number(line.qty)
        if (!qty || qty <= 0) continue
        await postMove({
          op,
          item: line.itemId,
          qty,
          apartment: opDef.needsApartment ? apartmentId : null,
          staff: opDef.needsStaff ? staffId : null,
          unitCost: opDef.needsCost && line.unitCost ? Number(line.unitCost) : null,
          note: note.trim() || null,
        })
      }
      toast(ru.admin.move.success, 'success')
      navigate('/admin')
    } catch (e) {
      toast(String(e), 'error')
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">{ru.admin.move.title}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">
        {/* Operation */}
        <Field label={ru.admin.move.operation}>
          <select
            value={op}
            onChange={(e) => setOp(e.target.value)}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
          >
            {ops.map((o) => (
              <option key={o.op} value={o.op}>{o.label}</option>
            ))}
          </select>
        </Field>

        {/* Apartment */}
        {opDef.needsApartment && (
          <Field label={ru.admin.move.apartment}>
            <select
              value={apartmentId ?? ''}
              onChange={(e) => setApartmentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="">—</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>{a.code}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Staff */}
        {opDef.needsStaff && (
          <Field label={ru.admin.move.staff}>
            <select
              value={staffId ?? ''}
              onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="">—</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Item search */}
        <Field label={ru.admin.move.items}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ru.admin.stock.search}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none mb-2"
          />
          {search.trim() && (
            <div className="bg-white rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
              {filteredStock.map((s) => (
                <button
                  key={s.item_id}
                  onClick={() => { addToCart(s); setSearch('') }}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm text-slate-700 truncate">{s.name}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{formatQty(s.qty, s)}</span>
                </button>
              ))}
            </div>
          )}
        </Field>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((line, idx) => (
              <div key={line.itemId} className="bg-white rounded-xl border border-slate-100 px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{line.itemName}</span>
                  <button onClick={() => removeLine(idx)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center bg-slate-100 rounded-lg">
                    <button onClick={() => updateLine(idx, { qty: String(Math.max(1, Number(line.qty) - 1)) })} className="px-2 py-1.5">
                      <Minus className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <input
                      type="number"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, { qty: e.target.value })}
                      className="w-14 bg-transparent text-center text-sm py-1.5 focus:outline-none"
                    />
                    <button onClick={() => updateLine(idx, { qty: String(Number(line.qty) + 1) })} className="px-2 py-1.5">
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                  {opDef.needsCost && (
                    <input
                      type="number"
                      value={line.unitCost}
                      onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                      placeholder={ru.admin.move.unitCost}
                      className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        <Field label={ru.admin.move.note}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </Field>
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium"
          >
            {ru.cleaning.cancel}
          </button>
          <button
            onClick={handlePost}
            disabled={posting || cart.length === 0}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {ru.admin.move.post}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
