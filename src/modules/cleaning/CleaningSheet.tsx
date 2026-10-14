import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchNorms, fetchStaff } from '@/modules/apartments/api'
import { completeCleaning, queueCleaningOffline } from '@/modules/cleaning/api'
import type { SvNorm, SvStaff, NormType, CleaningResult } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatQty } from '@/lib/format'
import { X, Check, Loader2, AlertTriangle, Star } from 'lucide-react'

const writeoffTypes: NormType[] = ['turnover_replenish', 'cleaning_consumption']

export function CleaningSheet() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const aptId = Number(id)
  const [norms, setNorms] = useState<SvNorm[]>([])
  const [staff, setStaff] = useState<SvStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<number[]>([])
  const [leadStaffId, setLeadStaffId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CleaningResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const clientOpIdRef = useRef<string>(crypto.randomUUID())

  useEffect(() => {
    if (!aptId) return
    Promise.all([fetchNorms(aptId), fetchStaff()])
      .then(([n, s]) => {
        setNorms(n)
        setStaff(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aptId])

  const writeoffItems = useMemo(
    () => norms.filter((n) => writeoffTypes.includes(n.norm_type)),
    [norms],
  )

  const needsStaff = writeoffItems.length > 0

  const toggleStaff = (staffId: number) => {
    setSelectedStaff((prev) => {
      if (prev.includes(staffId)) {
        const next = prev.filter((s) => s !== staffId)
        if (leadStaffId === staffId) {
          setLeadStaffId(next[0] ?? null)
        }
        return next
      }
      const next = [...prev, staffId]
      if (next.length === 1) {
        setLeadStaffId(staffId)
      }
      return next
    })
  }

  const setLead = (staffId: number) => {
    if (selectedStaff.includes(staffId)) {
      setLeadStaffId(staffId)
    }
  }

  const handleConfirm = async () => {
    if (needsStaff && selectedStaff.length === 0) {
      setError(ru.cleaning.needLead)
      return
    }
    setSubmitting(true)
    setError(null)
    const cleanedAt = new Date().toISOString()
    const params = {
      apartmentId: aptId,
      cleanedAt,
      clientOpId: clientOpIdRef.current,
      staffIds: selectedStaff,
      leadStaffId: leadStaffId ?? selectedStaff[0] ?? null,
      note: note.trim() || null,
    }
    try {
      if (!navigator.onLine) {
        await queueCleaningOffline(params)
        setOffline(true)
        setTimeout(() => navigate(`/sv/apartments/${aptId}`), 1500)
        return
      }
      const res = await completeCleaning(params)
      setResult(res)
      if (res.duplicate) {
        setError(ru.cleaning.duplicate)
      }
      setTimeout(() => navigate(`/sv/apartments/${aptId}`), 1200)
    } catch (e) {
      try {
        await queueCleaningOffline(params)
        setOffline(true)
        setTimeout(() => navigate(`/sv/apartments/${aptId}`), 1500)
      } catch {
        setError(String(e))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{ru.cleaning.title}</h2>
          <button onClick={() => navigate(`/sv/apartments/${aptId}`)} className="p-1">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Staff selection */}
          {needsStaff && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ru.cleaning.whoCleaned}
              </label>
              <p className="text-xs text-slate-400 mb-2">{ru.cleaning.whoCleanedHint}</p>
              <div className="space-y-2">
                {staff.map((s) => {
                  const selected = selectedStaff.includes(s.id)
                  const isLead = leadStaffId === s.id
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleStaff(s.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          selected ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className="flex-1 text-sm text-slate-700">{s.full_name}</span>
                      {selected && (
                        <button
                          onClick={() => setLead(s.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                            isLead ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-amber-600'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isLead ? 'fill-amber-500 text-amber-500' : ''}`} />
                          {ru.cleaning.leadStaff}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Writeoff preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {ru.cleaning.writeoff}
            </label>
            {writeoffItems.length === 0 ? (
              <p className="text-sm text-slate-400">{ru.cleaning.noWriteoff}</p>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                {writeoffItems.map((n) => (
                  <div key={`${n.item_id}-${n.norm_type}`} className="px-3 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-slate-600">{n.item_name}</span>
                    <span className="text-sm text-slate-500">
                      {formatQty(n.qty, { base_unit: n.base_unit, pack_size: n.pack_label ? 2 : 1, pack_label: n.pack_label })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {ru.cleaning.note}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ru.cleaning.notePlaceholder}
              rows={2}
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none resize-none"
            />
          </div>

          {/* Error / success */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {result && !result.duplicate && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">{ru.cleaning.success}</p>
            </div>
          )}
          {offline && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-amber-700">{ru.cleaning.pending}</p>
            </div>
          )}
          {result?.shortages && result.shortages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-sm font-medium text-amber-700 mb-1">{ru.cleaning.shortages}</p>
              {result.shortages.map((s) => (
                <p key={s.item_id} className="text-xs text-amber-600">
                  {s.item}: {s.balance}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3 flex gap-3">
          <button
            onClick={() => navigate(`/sv/apartments/${aptId}`)}
            className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium"
          >
            {ru.cleaning.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || (needsStaff && selectedStaff.length === 0)}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {ru.cleaning.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
