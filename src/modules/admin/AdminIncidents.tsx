import { useState, useEffect, useMemo } from 'react'
import { fetchAllIncidents, approveIncident } from '@/modules/admin/api'
import { fetchApartmentsAdmin } from '@/modules/admin/api'
import type { Incident, Apartment, IncidentStatus, IncidentKind } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/format'
import { toast, errorMessage } from '@/lib/toast'
import { Wrench, Package, CircleAlert as AlertCircle, Check, X, Loader as Loader2 } from 'lucide-react'

const statusLabels: Record<IncidentStatus, string> = {
  new: ru.incidents.statusNew,
  confirmed: ru.incidents.statusConfirmed,
  rejected: ru.incidents.statusRejected,
}

const statusColors: Record<IncidentStatus, string> = {
  new: 'bg-sky-50 text-sky-700',
  confirmed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const kindLabels: Record<IncidentKind, string> = {
  breakdown: ru.incidents.kindBreakdown,
  broken: ru.incidents.kindBroken,
  lost: ru.incidents.kindLost,
  other: ru.incidents.kindOther,
}

const kindIcons: Record<IncidentKind, React.ComponentType<{ className?: string }>> = {
  breakdown: Wrench,
  broken: AlertCircle,
  lost: Package,
  other: AlertCircle,
}

export function AdminIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionIncident, setActionIncident] = useState<{ incident: Incident; decision: 'confirm' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const [force, setForce] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    Promise.all([fetchAllIncidents(), fetchApartmentsAdmin()])
      .then(([inc, apts]) => { setIncidents(inc); setApartments(apts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments])

  const handleAction = async () => {
    if (!actionIncident) return
    setProcessing(true)
    try {
      await approveIncident(actionIncident.incident.id, actionIncident.decision, note.trim() || null, force)
      toast(actionIncident.decision === 'confirm' ? ru.admin.adminIncidents.approved : ru.admin.adminIncidents.rejected, 'success')
      setActionIncident(null)
      setNote('')
      setForce(false)
      const [inc] = await Promise.all([fetchAllIncidents()])
      setIncidents(inc)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{ru.admin.adminIncidents.title}</h1>

      {incidents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center mt-8">{ru.admin.adminIncidents.noIncidents}</p>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const Icon = kindIcons[inc.kind]
            return (
              <div key={inc.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{aptMap.get(inc.apartment_id) ?? `#${inc.apartment_id}`}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inc.status]}`}>{statusLabels[inc.status]}</span>
                    </div>
                    <p className="text-sm text-slate-600">{inc.free_text ?? `#${inc.item_id}`}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{kindLabels[inc.kind]}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{inc.qty} шт</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{formatDateTime(inc.created_at)}</span>
                    </div>
                    {inc.comment && <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">{inc.comment}</p>}
                    {inc.resolution_note && <p className="text-xs text-slate-400 mt-1">{inc.resolution_note}</p>}
                    {inc.status === 'new' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setActionIncident({ incident: inc, decision: 'confirm' }); setNote(''); setForce(false) }}
                          className="text-xs bg-green-50 text-green-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          {ru.admin.adminIncidents.confirm}
                        </button>
                        <button
                          onClick={() => { setActionIncident({ incident: inc, decision: 'reject' }); setNote(''); setForce(false) }}
                          className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                          {ru.admin.adminIncidents.reject}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {actionIncident && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              {actionIncident.decision === 'confirm' ? ru.admin.adminIncidents.confirmTitle : ru.admin.adminIncidents.rejectTitle}
            </h3>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ru.admin.adminIncidents.note}
              className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-3"
            />
            {actionIncident.decision === 'confirm' && actionIncident.incident.item_id && (
              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-600">{ru.admin.adminIncidents.force}</span>
              </label>
            )}
            <div className="flex gap-3">
              <button onClick={() => setActionIncident(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium">{ru.cleaning.cancel}</button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2 ${actionIncident.decision === 'confirm' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {actionIncident.decision === 'confirm' ? ru.admin.adminIncidents.confirm : ru.admin.adminIncidents.reject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
