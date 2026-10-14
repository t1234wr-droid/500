import { useState, useEffect } from 'react'
import { fetchToOrder, fetchApartmentGaps, fetchShortageEvents } from '@/modules/admin/api'
import type { ToOrderRow, ApartmentGapRow, EventRow } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatQty, formatDateTime } from '@/lib/format'
import { AlertTriangle, TrendingDown, PackageX, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()
  const [toOrder, setToOrder] = useState<ToOrderRow[]>([])
  const [gaps, setGaps] = useState<ApartmentGapRow[]>([])
  const [shortages, setShortages] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchToOrder(), fetchApartmentGaps(), fetchShortageEvents()])
      .then(([to, ga, sh]) => {
        setToOrder(to)
        setGaps(ga)
        setShortages(sh)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const gapApartments = new Map<number, { code: string; items: ApartmentGapRow[] }>()
  for (const g of gaps) {
    const entry = gapApartments.get(g.apartment_id) ?? { code: g.code, items: [] }
    entry.items.push(g)
    gapApartments.set(g.apartment_id, entry)
  }
  const gapList = Array.from(gapApartments.entries()).map(([id, v]) => ({ id, ...v }))

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{ru.admin.nav.home}</h1>

      {/* To order */}
      <Section
        icon={<TrendingDown className="w-4 h-4" />}
        title={ru.admin.dashboard.toOrder}
        emptyText={ru.admin.dashboard.noToOrder}
        count={toOrder.length}
      >
        {toOrder.slice(0, 10).map((r) => (
          <div key={r.item_id} className="px-3 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-slate-700 truncate">{r.name}</p>
              <p className="text-xs text-slate-400">{r.category}</p>
            </div>
            <span className="text-sm text-red-500 font-medium shrink-0 ml-2">
              {ru.admin.dashboard.shortage}: {r.shortage}
            </span>
          </div>
        ))}
      </Section>

      {/* Apartment gaps */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2 px-1">
          <PackageX className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ru.admin.dashboard.gaps}
          </h2>
          {gapList.length > 0 && <span className="text-xs text-amber-600 font-medium">({gapList.length})</span>}
        </div>
        {gapList.length === 0 ? (
          <p className="text-sm text-slate-400 px-3">{ru.admin.dashboard.noGaps}</p>
        ) : (
          <div className="space-y-2">
            {gapList.map((apt) => (
              <button
                key={apt.id}
                onClick={() => navigate(`/admin/apartments/${apt.id}`)}
                className="w-full bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-medium text-slate-800">{apt.code}</span>
                  <span className="text-sm text-amber-600 ml-2">
                    {apt.items.length} {ru.admin.dashboard.gap}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shortage events */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2 px-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ru.admin.dashboard.shortages}
          </h2>
        </div>
        {shortages.length === 0 ? (
          <p className="text-sm text-slate-400 px-3">{ru.admin.dashboard.noShortages}</p>
        ) : (
          <div className="space-y-2">
            {shortages.map((ev) => {
              const payload = ev.payload as { items?: Array<{ item: string; balance: number }> }
              return (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-400 mb-1">{formatDateTime(ev.created_at)}</p>
                  {payload.items?.map((it, i) => (
                    <p key={i} className="text-sm text-red-600">
                      {it.item}: {it.balance}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  emptyText,
  count,
  children,
}: {
  icon: React.ReactNode
  title: string
  emptyText: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
        {count > 0 && <span className="text-xs text-slate-400">({count})</span>}
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-400 px-3">{emptyText}</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
          {children}
        </div>
      )}
    </div>
  )
}
