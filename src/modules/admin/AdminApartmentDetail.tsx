import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchApartmentsAdmin,
  fetchApartmentGaps,
  fetchNormRules,
  fetchTemplateNorms,
  fetchCleaningEvents,
  fetchAllStaff,
  issueMissing,
  reverseCleaning,
  recalculateCleaning,
  upsertNormRule,
  deleteNormRule,
} from '@/modules/admin/api'
import { fetchWarehouseStock } from '@/modules/admin/api'
import type { Apartment, ApartmentGapRow, NormRuleRow, CleaningEventRow, Staff, WarehouseStockRow, IssueMissingResult, NormType } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatDateTime, formatQty } from '@/lib/format'
import { toast } from '@/lib/toast'
import { ArrowLeft, ClipboardList, History, Plus, Trash2, Edit3, Gift, RotateCcw, X, Check, Loader2, AlertTriangle } from 'lucide-react'

type Tab = 'norms' | 'history'

const normTypeLabels: Record<NormType, string> = {
  asset_standing: ru.apartments.normInventory,
  turnover_replenish: ru.apartments.normTurnover,
  cleaning_consumption: ru.apartments.normCleaning,
}

const normTypeOrder: NormType[] = ['asset_standing', 'turnover_replenish', 'cleaning_consumption']

export function AdminApartmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const aptId = Number(id)
  const [apartment, setApartment] = useState<Apartment | null>(null)
  const [gaps, setGaps] = useState<ApartmentGapRow[]>([])
  const [overrideNorms, setOverrideNorms] = useState<NormRuleRow[]>([])
  const [templateNorms, setTemplateNorms] = useState<NormRuleRow[]>([])
  const [events, setEvents] = useState<CleaningEventRow[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [stock, setStock] = useState<WarehouseStockRow[]>([])
  const [tab, setTab] = useState<Tab>('norms')
  const [loading, setLoading] = useState(true)
  const [issueResult, setIssueResult] = useState<IssueMissingResult | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [editingNorm, setEditingNorm] = useState<NormRuleRow | null>(null)
  const [addingNorm, setAddingNorm] = useState(false)
  const [reverseEventId, setReverseEventId] = useState<string | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [recalcEventId, setRecalcEventId] = useState<string | null>(null)
  const [recalcDate, setRecalcDate] = useState('')
  const [recalcStaffIds, setRecalcStaffIds] = useState<number[]>([])

  const loadAll = () => {
    if (!aptId) return
    Promise.all([
      fetchApartmentsAdmin(),
      fetchApartmentGaps(),
      fetchNormRules(aptId),
      fetchCleaningEvents(aptId),
      fetchAllStaff(),
      fetchWarehouseStock(),
    ])
      .then(([apts, ga, norms, ev, st, wh]) => {
        const apt = apts.find((a) => a.id === aptId) ?? null
        setApartment(apt)
        setGaps(ga.filter((g) => g.apartment_id === aptId))
        setOverrideNorms(norms)
        if (apt) {
          fetchTemplateNorms(apt.type).then(setTemplateNorms).catch(() => {})
        }
        setEvents(ev)
        setStaffList(st)
        setStock(wh)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAll()
  }, [aptId])

  const gapItems = useMemo(() => gaps.filter((g) => g.gap > 0), [gaps])

  const handleIssueAll = async () => {
    setIssuing(true)
    try {
      const result = await issueMissing(aptId)
      setIssueResult(result)
      if (result.issued.length === 0 && result.short.length > 0) {
        toast(ru.admin.apartments.nothingIssued, 'error')
      } else {
        toast(ru.admin.apartments.issued, 'success')
      }
      loadAll()
    } catch (e) {
      toast(String(e), 'error')
    } finally {
      setIssuing(false)
    }
  }

  const handleReverse = async () => {
    if (!reverseEventId) return
    try {
      await reverseCleaning(reverseEventId, reverseReason.trim() || null)
      toast('Уборка отменена', 'success')
      setReverseEventId(null)
      setReverseReason('')
      loadAll()
    } catch (e) {
      toast(String(e), 'error')
    }
  }

  const handleRecalc = async () => {
    if (!recalcEventId) return
    try {
      const cleanedAt = recalcDate || null
      const staffIds = recalcStaffIds.length > 0 ? recalcStaffIds : null
      const leadStaffId = staffIds && staffIds.length > 0 ? staffIds[0] : null
      await recalculateCleaning(recalcEventId, cleanedAt, staffIds, leadStaffId)
      toast('Уборка пересчитана', 'success')
      setRecalcEventId(null)
      setRecalcDate('')
      setRecalcStaffIds([])
      loadAll()
    } catch (e) {
      toast(String(e), 'error')
    }
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  if (!apartment) {
    return <div className="px-4 pt-8 text-center text-slate-400">Не найдено</div>
  }

  const groupedOverrides = useMemo(() => {
    const map = new Map<NormType, NormRuleRow[]>()
    for (const n of overrideNorms) {
      const list = map.get(n.norm_type) ?? []
      list.push(n)
      map.set(n.norm_type, list)
    }
    return map
  }, [overrideNorms])

  const groupedTemplates = useMemo(() => {
    const map = new Map<NormType, NormRuleRow[]>()
    for (const n of templateNorms) {
      const list = map.get(n.norm_type) ?? []
      list.push(n)
      map.set(n.norm_type, list)
    }
    return map
  }, [templateNorms])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/admin/apartments')} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">{apartment.code}</h1>
            <p className="text-xs text-slate-500">{apartment.type}</p>
          </div>
        </div>
        <div className="flex px-4 gap-1">
          <TabButton active={tab === 'norms'} onClick={() => setTab('norms')} icon={ClipboardList} label={ru.admin.apartments.norms} />
          <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={History} label={ru.admin.apartments.cleaningHistory} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        {/* Gap section */}
        {gapItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{ru.admin.apartments.gap}</h3>
              <button
                onClick={handleIssueAll}
                disabled={issuing}
                className="bg-sky-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
              >
                {issuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                {ru.admin.apartments.issueAll}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
              {gapItems.map((g) => (
                <div key={`${g.item_id}`} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{g.name}</span>
                  <span className="text-sm text-amber-600">{g.gap} {ru.admin.dashboard.gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issue result sheet */}
        {issueResult && (
          <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>
              <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">{ru.admin.apartments.issueAll}</h2>
                <button onClick={() => setIssueResult(null)} className="p-1">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {issueResult.doc_number && (
                  <p className="text-sm text-slate-500">Документ: {issueResult.doc_number}</p>
                )}
                {issueResult.issued.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-2">{ru.admin.apartments.issued}</p>
                    <div className="bg-green-50 rounded-xl border border-green-100 divide-y divide-green-50">
                      {issueResult.issued.map((it) => (
                        <div key={it.item_id} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-sm text-slate-700">{it.name}</span>
                          <span className="text-sm text-green-600">{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {issueResult.short.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-500 mb-2">{ru.admin.apartments.short}</p>
                    <div className="bg-red-50 rounded-xl border border-red-100 divide-y divide-red-50">
                      {issueResult.short.map((it) => (
                        <div key={it.item_id} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-sm text-slate-700">{it.name}</span>
                          <span className="text-sm text-red-500">{it.issued}/{it.need}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3">
                <button onClick={() => setIssueResult(null)} className="w-full bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Norms tab */}
        {tab === 'norms' && (
          <div className="space-y-5">
            {/* Overrides */}
            {normTypeOrder.map((nt) => {
              const overrides = groupedOverrides.get(nt) ?? []
              const templates = groupedTemplates.get(nt) ?? []
              const hasOverrides = overrides.length > 0
              if (overrides.length === 0 && templates.length === 0) return null
              return (
                <div key={nt}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {normTypeLabels[nt]}
                    </h3>
                    <button
                      onClick={() => { setAddingNorm(true); setEditingNorm({ id: 0, norm_type: nt, apt_type: null, apartment_id: aptId, item_id: 0, qty: 1, note: null }) }}
                      className="text-sky-600 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {ru.admin.apartments.addNorm}
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {hasOverrides ? (
                      overrides.map((n) => (
                        <div key={n.id} className="px-4 py-2.5 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-sm text-slate-700">{stock.find((s) => s.item_id === n.item_id)?.name ?? `#${n.item_id}`}</span>
                            {n.note && <span className="text-xs text-slate-400 block">{n.note}</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-slate-500">{n.qty}</span>
                            <button onClick={() => setEditingNorm(n)} className="text-slate-400 hover:text-sky-600">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={async () => { await deleteNormRule(n.id); loadAll() }} className="text-slate-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      templates.map((n) => (
                        <div key={n.id} className="px-4 py-2.5 flex items-center justify-between opacity-60">
                          <span className="text-sm text-slate-600">{stock.find((s) => s.item_id === n.item_id)?.name ?? `#${n.item_id}`}</span>
                          <span className="text-sm text-slate-400">{n.qty} ({ru.admin.apartments.template})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-slate-400 text-center mt-8">{ru.admin.apartments.noCleaning}</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{formatDateTime(ev.cleaned_at)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'done' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {ev.status === 'done' ? ru.admin.apartments.done : ru.admin.apartments.reversed}
                    </span>
                  </div>
                  {ev.cleaning_event_staff && ev.cleaning_event_staff.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {ev.cleaning_event_staff.map((s, i) => (
                        <span key={s.staff_id}>
                          {i > 0 && ', '}
                          {s.staff.full_name}
                          {s.staff_id === ev.lead_staff_id && ` ${ru.admin.apartments.recalcLead}`}
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{ru.admin.apartments.revision}: {ev.revision}</p>
                  {ev.note && <p className="text-xs text-slate-400 mt-1">{ev.note}</p>}
                  {ev.status === 'reversed' && ev.reverse_reason && (
                    <p className="text-xs text-red-400 mt-1">{ev.reverse_reason}</p>
                  )}
                  {ev.status === 'done' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { setRecalcEventId(ev.id); setRecalcDate(''); setRecalcStaffIds([]) }}
                        className="text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {ru.admin.apartments.recalculate}
                      </button>
                      <button
                        onClick={() => setReverseEventId(ev.id)}
                        className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5"
                      >
                        {ru.admin.apartments.reverse}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Reverse modal */}
      {reverseEventId && (
        <Modal title={ru.admin.apartments.reverseConfirm} onClose={() => setReverseEventId(null)}>
          <input
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder={ru.admin.apartments.reverseReason}
            className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none mb-4"
          />
          <div className="flex gap-3">
            <button onClick={() => setReverseEventId(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">
              {ru.cleaning.cancel}
            </button>
            <button onClick={handleReverse} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-medium">
              {ru.admin.apartments.reverse}
            </button>
          </div>
        </Modal>
      )}

      {/* Recalc modal */}
      {recalcEventId && (
        <Modal title={ru.admin.apartments.recalcConfirm} onClose={() => { setRecalcEventId(null); setRecalcDate(''); setRecalcStaffIds([]) }}>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">{ru.admin.apartments.recalcDate}</label>
              <input
                type="datetime-local"
                value={recalcDate}
                onChange={(e) => setRecalcDate(e.target.value)}
                className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{ru.admin.apartments.recalcStaff}</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {staffList.filter((s) => s.active).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recalcStaffIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRecalcStaffIds((prev) => [...prev, s.id])
                        } else {
                          setRecalcStaffIds((prev) => prev.filter((id) => id !== s.id))
                        }
                      }}
                      className="w-4 h-4 accent-sky-600"
                    />
                    <span className="text-sm text-slate-700">
                      {s.full_name}
                      {recalcStaffIds[0] === s.id && ` ${ru.admin.apartments.recalcLead}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRecalcEventId(null); setRecalcDate(''); setRecalcStaffIds([]) }} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">
              {ru.cleaning.cancel}
            </button>
            <button onClick={handleRecalc} className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium">
              {ru.admin.apartments.recalculate}
            </button>
          </div>
        </Modal>
      )}

      {/* Norm editor */}
      {editingNorm && (
        <NormEditor
          norm={editingNorm}
          items={stock}
          onClose={() => { setEditingNorm(null); setAddingNorm(false) }}
          onSave={async (normType, itemId, qty, note) => {
            try {
              await upsertNormRule({
                id: editingNorm.id || undefined,
                norm_type: normType,
                apartment_id: aptId,
                apt_type: null,
                item_id: itemId,
                qty,
                note: note ?? null,
              })
              setEditingNorm(null)
              setAddingNorm(false)
              loadAll()
            } catch (e) {
              toast(String(e), 'error')
            }
          }}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${active ? 'border-sky-600 text-sky-600 font-medium' : 'border-transparent text-slate-400'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <h3 className="text-base font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function NormEditor({
  norm,
  items,
  onClose,
  onSave,
}: {
  norm: NormRuleRow
  items: WarehouseStockRow[]
  onClose: () => void
  onSave: (normType: string, itemId: number, qty: number, note: string | null) => void
}) {
  const [normType, setNormType] = useState(norm.norm_type)
  const [itemId, setItemId] = useState(norm.item_id || 0)
  const [qty, setQty] = useState(String(norm.qty))
  const [note, setNote] = useState(norm.note ?? '')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{norm.id ? ru.admin.apartments.editNorm : ru.admin.apartments.addNorm}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.incidents.kind}</label>
            <select value={normType} onChange={(e) => setNormType(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
              {normTypeOrder.map((nt) => <option key={nt} value={nt}>{normTypeLabels[nt]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.apartments.item}</label>
            <select value={itemId} onChange={(e) => setItemId(Number(e.target.value))} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="0">—</option>
              {items.map((i) => <option key={i.item_id} value={i.item_id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{ru.admin.apartments.qty}</label>
            <input type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
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
            {ru.admin.apartments.save}
          </button>
        </div>
      </div>
    </div>
  )
}
