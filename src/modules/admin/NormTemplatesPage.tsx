import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWarehouseStock, fetchTemplateNorms, upsertNormRule, deleteNormRule } from '@/modules/admin/api'
import type { WarehouseStockRow, NormRuleRow, NormType, AptType, BaseUnit } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { toast } from '@/lib/toast'
import { ArrowLeft, Plus, Trash2, Edit3, X, Check } from 'lucide-react'

const aptTypes: AptType[] = ['studio', '1br', '2br']

const aptTypeLabels: Record<AptType, string> = {
  studio: ru.admin.normTemplates.studio,
  '1br': ru.admin.normTemplates.br1,
  '2br': ru.admin.normTemplates.br2,
}

const normTypeLabels: Record<NormType, string> = {
  asset_standing: ru.apartments.normInventory,
  turnover_replenish: ru.apartments.normTurnover,
  cleaning_consumption: ru.apartments.normCleaning,
}

const normTypeOrder: NormType[] = ['asset_standing', 'turnover_replenish', 'cleaning_consumption']

function unitShort(unit: BaseUnit): string {
  switch (unit) {
    case 'pcs': return 'шт'
    case 'g': return 'г'
    case 'ml': return 'мл'
  }
}

export function NormTemplatesPage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<AptType>('studio')
  const [norms, setNorms] = useState<NormRuleRow[]>([])
  const [stock, setStock] = useState<WarehouseStockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNorm, setEditingNorm] = useState<NormRuleRow | null>(null)
  const [addingNormType, setAddingNormType] = useState<NormType | null>(null)

  const loadNorms = (type: AptType) => {
    fetchTemplateNorms(type)
      .then(setNorms)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchWarehouseStock().then(setStock).catch(() => {})
  }, [])

  useEffect(() => {
    loadNorms(selectedType)
  }, [selectedType])

  const grouped = useMemo(() => {
    const map = new Map<NormType, NormRuleRow[]>()
    for (const n of norms) {
      const list = map.get(n.norm_type) ?? []
      list.push(n)
      map.set(n.norm_type, list)
    }
    return map
  }, [norms])

  const reload = () => loadNorms(selectedType)

  const handleSave = async (normType: string, itemId: number, qty: number, note: string | null, id?: number) => {
    try {
      await upsertNormRule({
        id: id || undefined,
        norm_type: normType as NormType,
        apartment_id: null,
        apt_type: selectedType,
        item_id: itemId,
        qty,
        note: note ?? null,
      })
      setEditingNorm(null)
      setAddingNormType(null)
      reload()
    } catch (e) {
      const msg = String(e)
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        toast(ru.admin.normTemplates.duplicate, 'error')
      } else {
        toast(msg, 'error')
      }
    }
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/admin/more')} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">{ru.admin.normTemplates.title}</h1>
        </div>
        <div className="flex px-4 gap-1">
          {aptTypes.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-2.5 text-sm border-b-2 transition-colors ${selectedType === t ? 'border-sky-600 text-sky-600 font-medium' : 'border-transparent text-slate-400'}`}
            >
              {aptTypeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        <p className="text-xs text-slate-400 bg-slate-100 rounded-xl px-3 py-2.5 mb-4">
          {ru.admin.normTemplates.hint}
        </p>

        {normTypeOrder.map((nt) => {
          const items = grouped.get(nt) ?? []
          return (
            <div key={nt} className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {normTypeLabels[nt]}
                </h3>
                <button
                  onClick={() => setAddingNormType(nt)}
                  className="text-sky-600 text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {ru.admin.normTemplates.addNorm}
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 px-3">{ru.admin.normTemplates.noNorms}</p>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {items.map((n) => {
                    const item = stock.find((s) => s.item_id === n.item_id)
                    return (
                      <div key={n.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-sm text-slate-700">{item?.name ?? `#${n.item_id}`}</span>
                          <span className="text-xs text-slate-400 ml-1">{n.qty} {item ? unitShort(item.base_unit) : ''}</span>
                          {n.note && <span className="text-xs text-slate-400 block">{n.note}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingNorm(n)} className="text-slate-400 hover:text-sky-600">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={async () => { await deleteNormRule(n.id); reload() }} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(editingNorm || addingNormType) && (
        <NormEditorModal
          norm={editingNorm}
          normType={addingNormType ?? editingNorm!.norm_type}
          items={stock}
          onClose={() => { setEditingNorm(null); setAddingNormType(null) }}
          onSave={(normType, itemId, qty, note) => handleSave(normType, itemId, qty, note, editingNorm?.id)}
        />
      )}
    </div>
  )
}

function NormEditorModal({
  norm,
  normType,
  items,
  onClose,
  onSave,
}: {
  norm: NormRuleRow | null
  normType: NormType
  items: WarehouseStockRow[]
  onClose: () => void
  onSave: (normType: string, itemId: number, qty: number, note: string | null) => void
}) {
  const [itemId, setItemId] = useState(norm?.item_id ?? 0)
  const [qty, setQty] = useState(String(norm?.qty ?? 1))
  const [note, setNote] = useState(norm?.note ?? '')
  const selectedItem = items.find((i) => i.item_id === itemId)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{norm ? ru.admin.normTemplates.editNorm : ru.admin.normTemplates.addNorm}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.normTemplates.item}</label>
            <select value={itemId} onChange={(e) => setItemId(Number(e.target.value))} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="0">—</option>
              {items.map((i) => <option key={i.item_id} value={i.item_id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.normTemplates.qty}</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
              {selectedItem && <span className="text-sm text-slate-400 shrink-0">{unitShort(selectedItem.base_unit)}</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.move.note}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">{ru.cleaning.cancel}</button>
          <button
            onClick={() => onSave(normType, itemId, Number(qty), note.trim() || null)}
            disabled={!itemId || !qty}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {ru.admin.normTemplates.save}
          </button>
        </div>
      </div>
    </div>
  )
}
