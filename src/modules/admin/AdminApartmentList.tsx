import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApartmentsAdmin, fetchApartmentGaps, fetchBuildings } from '@/modules/admin/api'
import type { Apartment, Building, ApartmentGapRow } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { Search, ChevronRight } from 'lucide-react'

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

  const completenessMap = useMemo(() => {
    const totalNorms = new Map<number, number>()
    const totalGaps = new Map<number, number>()
    for (const g of gaps) {
      totalNorms.set(g.apartment_id, (totalNorms.get(g.apartment_id) ?? 0) + 1)
      if (g.gap > 0) {
        totalGaps.set(g.apartment_id, (totalGaps.get(g.apartment_id) ?? 0) + 1)
      }
    }
    const result = new Map<number, number>()
    for (const [aptId, total] of totalNorms) {
      const gap = totalGaps.get(aptId) ?? 0
      result.set(aptId, Math.round(((total - gap) / total) * 100))
    }
    return result
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
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{ru.admin.apartments.title}</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ru.apartments.search}
          className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="space-y-5">
        {grouped.map(([building, apts]) => (
          <div key={building}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {building}
            </h2>
            <div className="space-y-2">
              {apts.map((apt) => {
                const pct = completenessMap.get(apt.id)
                return (
                  <button
                    key={apt.id}
                    onClick={() => navigate(`/admin/apartments/${apt.id}`)}
                    className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100 hover:border-slate-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800">{apt.code}</span>
                      {pct !== undefined && pct < 100 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {pct}%
                        </span>
                      )}
                      {pct === 100 && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          100%
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
