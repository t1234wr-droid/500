import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApartments } from '@/modules/apartments/api'
import { getPendingOutbox } from '@/lib/outbox'
import type { SvApartment } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { isToday } from '@/lib/format'
import { Search, CheckCircle2, ChevronRight } from 'lucide-react'

export function ApartmentList() {
  const navigate = useNavigate()
  const [apartments, setApartments] = useState<SvApartment[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchApartments()
      .then(setApartments)
      .catch(() => {})
      .finally(() => setLoading(false))
    getPendingOutbox().then((e) => setPendingCount(e.length))
  }, [])

  const grouped = useMemo(() => {
    const filtered = apartments.filter((a) =>
      a.code.toLowerCase().includes(search.toLowerCase().trim()),
    )
    const map = new Map<string, SvApartment[]>()
    for (const a of filtered) {
      const list = map.get(a.building) ?? []
      list.push(a)
      map.set(a.building, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [apartments, search])

  return (
    <div className="px-4 pt-6">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ru.apartments.search}
          className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          {ru.cleaning.pending}: {pendingCount}
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-400 mt-8">{ru.app.loading}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([building, apts]) => (
            <div key={building}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {building}
              </h2>
              <div className="space-y-2">
                {apts.map((apt) => {
                  const cleaned = isToday(apt.last_cleaned_at)
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/sv/apartments/${apt.id}`)}
                      className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100 hover:border-slate-200 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-800">{apt.code}</span>
                        {cleaned && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {ru.apartments.cleanedToday}
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
      )}
    </div>
  )
}
