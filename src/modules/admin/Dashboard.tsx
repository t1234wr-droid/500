import { useState, useEffect, useMemo } from 'react'
import { fetchToOrder, fetchApartmentGaps, fetchShortageEvents, fetchApartmentsAdmin, fetchBuildings } from '@/modules/admin/api'
import type { ToOrderRow, ApartmentGapRow, EventRow, Apartment, Building } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatQty } from '@/lib/format'
import { AlertTriangle, TrendingDown, PackageX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function pctColor(p: number): string {
  if (p >= 100) return 'var(--ok)'
  if (p >= 75) return 'var(--warn)'
  return 'var(--bad)'
}

function ProgressBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <span className={`block h-1.5 rounded-full overflow-hidden ${className ?? ''}`} style={{ background: 'var(--line)' }}>
      <span
        className="block h-full rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </span>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const [toOrder, setToOrder] = useState<ToOrderRow[]>([])
  const [gaps, setGaps] = useState<ApartmentGapRow[]>([])
  const [shortages, setShortages] = useState<EventRow[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchToOrder(), fetchApartmentGaps(), fetchShortageEvents(), fetchApartmentsAdmin(), fetchBuildings()])
      .then(([to, ga, sh, ap, bl]) => {
        setToOrder(to)
        setGaps(ga)
        setShortages(sh)
        setApartments(ap)
        setBuildings(bl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings])

  const gapApartments = useMemo(() => {
    const map = new Map<number, { code: string; items: ApartmentGapRow[]; totalNorms: number }>()
    for (const g of gaps) {
      const entry = map.get(g.apartment_id) ?? { code: g.code, items: [], totalNorms: 0 }
      entry.totalNorms++
      if (g.gap > 0) entry.items.push(g)
      map.set(g.apartment_id, entry)
    }
    return map
  }, [gaps])

  const apartmentsByBuilding = useMemo(() => {
    const map = new Map<string, Apartment[]>()
    for (const a of apartments) {
      const bName = buildingMap.get(a.building_id) ?? '?'
      const list = map.get(bName) ?? []
      list.push(a)
      map.set(bName, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [apartments, buildingMap])

  if (loading) {
    return <div className="px-4 pt-8 text-center text-muted">{ru.app.loading}</div>
  }

  const incompleteCount = Array.from(gapApartments.values()).filter((a) => a.items.length > 0).length

  return (
    <div className="px-4 pt-5 pb-28 lg:px-0 lg:pt-0">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-semibold text-ink">{ru.admin.nav.home}</h1>
        <button
          onClick={() => navigate('/admin/move')}
          className="ml-auto bg-accent text-white rounded-lg px-3.5 py-2 text-sm font-medium flex items-center gap-1.5 transition-opacity hover:opacity-90"
        >
          {ru.admin.move.title}
        </button>
      </div>

      {/* 3-counter strip */}
      <div className="grid grid-cols-3 bg-surface border border-line rounded-xl mb-5 overflow-hidden">
        <div className="px-4 py-3.5 border-r border-line">
          <b className="text-2xl font-semibold text-ink block">{toOrder.length}</b>
          <span className="text-muted text-xs">{ru.admin.dashboard.toOrder}</span>
        </div>
        <div className="px-4 py-3.5 border-r border-line">
          <b className="text-2xl font-semibold text-ink block">{incompleteCount}</b>
          <span className="text-muted text-xs">{ru.admin.dashboard.gaps}</span>
        </div>
        <div className="px-4 py-3.5">
          <b className="text-2xl font-semibold text-ink block">{shortages.length}</b>
          <span className="text-muted text-xs">{ru.admin.dashboard.shortages}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
        {/* Left: to-order */}
        <section className="bg-surface border border-line rounded-xl p-4">
          <h2 className="text-base font-semibold text-ink mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-bad" />
            {ru.admin.dashboard.toOrder}
          </h2>
          {toOrder.length === 0 ? (
            <p className="text-muted text-sm">{ru.admin.dashboard.noToOrder}</p>
          ) : (
            <>
              {toOrder.slice(0, 10).map((r) => (
                <div key={r.item_id} className="flex items-center gap-3 py-2.5 border-t border-line first:border-t-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{r.name}</div>
                    <div className="text-muted text-xs">{r.category}, {formatQty(r.qty, r)} / {r.min_stock}</div>
                    <ProgressBar value={(r.qty / r.min_stock) * 100} color="var(--bad)" className="mt-1.5" />
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-bad-soft text-bad">
                    {ru.admin.dashboard.shortage}: {r.shortage}
                  </span>
                </div>
              ))}
              <button
                onClick={() => navigate('/admin/move')}
                className="mt-3 bg-surface border border-line text-ink rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-app"
              >
                {ru.admin.move.receipt}
              </button>
            </>
          )}
        </section>

        {/* Right: apartment tiles by building */}
        <section className="bg-surface border border-line rounded-xl p-4">
          <h2 className="text-base font-semibold text-ink mb-3 flex items-center gap-2">
            <PackageX className="w-4 h-4 text-warn" />
            {ru.admin.apartments.completeness}
          </h2>
          {apartmentsByBuilding.map(([building, apts]) => (
            <div key={building}>
              <div className="font-semibold text-sm text-ink mt-4 mb-2 first:mt-0">{building}</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
                {apts.map((apt) => {
                  const gapData = gapApartments.get(apt.id)
                  const total = gapData?.totalNorms ?? 0
                  const missing = gapData?.items.length ?? 0
                  const p = total > 0 ? Math.round(((total - missing) / total) * 100) : 100
                  const missingQty = gapData?.items.reduce((s, x) => s + x.gap, 0) ?? 0
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/admin/apartments/${apt.id}`)}
                      className="text-left bg-surface border border-line rounded-lg px-3 py-2.5 transition-colors hover:border-accent"
                    >
                      <b className="text-base text-ink">{apt.code}</b>
                      <div className="text-muted text-xs">{apt.type}</div>
                      <ProgressBar value={p} color={pctColor(p)} className="mt-1.5" />
                      <div className="text-muted text-xs mt-1">
                        {missingQty > 0 ? `${ru.admin.dashboard.gap} ${missingQty}` : 'полная'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Shortage events */}
      {shortages.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2 px-1">
            <AlertTriangle className="w-4 h-4 text-bad" />
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">{ru.admin.dashboard.shortages}</h2>
          </div>
          <div className="space-y-2">
            {shortages.map((ev) => {
              const payload = ev.payload as { items?: Array<{ item: string; balance: number }> }
              return (
                <div key={ev.id} className="bg-surface rounded-xl border border-line px-4 py-3">
                  {payload.items?.map((it, i) => (
                    <p key={i} className="text-sm text-bad">
                      {it.item}: {it.balance}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
