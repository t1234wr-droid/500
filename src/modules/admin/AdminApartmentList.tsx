import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApartmentsAdmin, fetchApartmentGaps, fetchBuildings } from '@/modules/admin/api'
import type { Apartment, Building, ApartmentGapRow } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { Search } from 'lucide-react'

function pctColor(p: number): string {
  if (p >= 100) return 'var(--ok)'
  if (p >= 75) return 'var(--warn)'
  return 'var(--bad)'
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="block h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </span>
  )
}

export function AdminApartmentList() {
  const navigate = useNavigate()
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [gaps, setGaps] = useState<ApartmentGapRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchApartmentsAdmin(), fetchBuildings(), fetchApartmentGaps()])
      .then(([a, b, g]) => {
        setApartments(a)
        setBuildings(b)
        setGaps(g)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings])

  const gapApartments = useMemo(() => {
    const totalNorms = new Map<number, number>()
    const totalGaps = new Map<number, number>()
    const totalMissingQty = new Map<number, number>()
    for (const g of gaps) {
      totalNorms.set(g.apartment_id, (totalNorms.get(g.apartment_id) ?? 0) + 1)
      if (g.gap > 0) {
        totalGaps.set(g.apartment_id, (totalGaps.get(g.apartment_id) ?? 0) + 1)
        totalMissingQty.set(g.apartment_id, (totalMissingQty.get(g.apartment_id) ?? 0) + g.gap)
      }
    }
    return { totalNorms, totalGaps, totalMissingQty }
  }, [gaps])

  const grouped = useMemo(() => {
    const filtered = apartments.filter((a) =>
      a.code.toLowerCase().includes(search.toLowerCase().trim()),
    )
    const map = new Map<string, Apartment[]>()
    for (const a of filtered) {
      const bName = buildingMap.get(a.building_id) ?? '?'
      const list = map.get(bName) ?? []
      list.push(a)
      map.set(bName, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [apartments, search, buildingMap])

  if (loading) {
    return <div className="px-4 pt-8 text-center text-muted">{ru.app.loading}</div>
  }

  return (
    <div className="px-4 pt-5 pb-28 lg:px-0 lg:pt-0">
      <h1 className="text-xl font-semibold text-ink mb-4">{ru.admin.apartments.title}</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ru.apartments.search}
          className="w-full bg-surface rounded-lg pl-10 pr-4 py-2 text-sm border border-line focus:border-accent focus:outline-none"
        />
      </div>

      {grouped.map(([building, apts]) => (
        <div key={building} className="mb-5">
          <h2 className="font-semibold text-sm text-ink mb-2 px-1">{building}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
            {apts.map((apt) => {
              const total = gapApartments.totalNorms.get(apt.id) ?? 0
              const missing = gapApartments.totalGaps.get(apt.id) ?? 0
              const missingQty = gapApartments.totalMissingQty.get(apt.id) ?? 0
              const p = total > 0 ? Math.round(((total - missing) / total) * 100) : 100
              return (
                <button
                  key={apt.id}
                  onClick={() => navigate(`/admin/apartments/${apt.id}`)}
                  className="text-left bg-surface border border-line rounded-lg px-3 py-2.5 transition-colors hover:border-accent"
                >
                  <b className="text-base text-ink">{apt.code}</b>
                  <div className="text-muted text-xs">{apt.type}</div>
                  <ProgressBar value={p} color={pctColor(p)} />
                  <div className="text-muted text-xs mt-1">
                    {missingQty > 0 ? `${ru.admin.dashboard.gap} ${missingQty}` : 'полная'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
