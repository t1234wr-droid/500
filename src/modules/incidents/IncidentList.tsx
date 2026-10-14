import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyIncidents } from '@/modules/incidents/api'
import { fetchApartments } from '@/modules/apartments/api'
import type { Incident, SvApartment, IncidentStatus, IncidentKind } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/format'
import { Plus, Wrench, Package, AlertCircle } from 'lucide-react'

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

export function IncidentList() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [apartments, setApartments] = useState<SvApartment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchMyIncidents(), fetchApartments()])
      .then(([inc, apts]) => {
        setIncidents(inc)
        setApartments(apts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const aptMap = new Map(apartments.map((a) => [a.id, a.code]))

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{ru.incidents.myIncidents}</h1>
        <button
          onClick={() => navigate('/sv/incidents/new')}
          className="bg-sky-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {ru.incidents.title}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 mt-8">{ru.app.loading}</p>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 text-slate-400">
          <Wrench className="w-10 h-10 mb-3" />
          <p className="text-sm">{ru.incidents.noIncidents}</p>
        </div>
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
                      <span className="text-sm font-medium text-slate-800">
                        {aptMap.get(inc.apartment_id) ?? `#${inc.apartment_id}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inc.status]}`}>
                        {statusLabels[inc.status]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {inc.item_id ? `#${inc.item_id}` : inc.free_text ?? '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{kindLabels[inc.kind]}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{inc.qty} шт</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{formatDateTime(inc.created_at)}</span>
                    </div>
                    {inc.comment && (
                      <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
                        {inc.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
