import { useState, useEffect, useMemo } from 'react'
import { fetchWarehouseStock, fetchStockMoves } from '@/modules/admin/api'
import type { WarehouseStockRow, StockMoveRow } from '@/lib/database.types'
import { useI18n } from '@/i18n'
import { formatQty, formatDateTime } from '@/lib/format'
import { Search } from 'lucide-react'

type KindFilter = 'all' | 'assets' | 'consumables'

function ProgressBar({ value, color }: { value: number; color: string }) {
  const { t, n } = useI18n()
  return (
    <span className="block h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </span>
  )
}

export function WarehousePage() {
  const { t, n } = useI18n()
  const [stock, setStock] = useState<WarehouseStockRow[]>([])
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [moves, setMoves] = useState<StockMoveRow[]>([])
  const [movesLoading, setMovesLoading] = useState(false)

  useEffect(() => {
    fetchWarehouseStock()
      .then(setStock)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const s of stock) set.add(s.category)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [stock])

  const filtered = useMemo(() => {
    return stock.filter((s) => {
      if (kindFilter === 'assets' && s.kind !== 'asset') return false
      if (kindFilter === 'consumables' && s.kind !== 'consumable') return false
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
      if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase().trim())) return false
      return true
    })
  }, [stock, kindFilter, categoryFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, WarehouseStockRow[]>()
    for (const s of filtered) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const toggleExpand = (itemId: number) => {
    if (expandedId === itemId) {
      setExpandedId(null)
      return
    }
    setExpandedId(itemId)
    setMovesLoading(true)
    fetchStockMoves(itemId)
      .then(setMoves)
      .catch(() => setMoves([]))
      .finally(() => setMovesLoading(false))
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-muted">{t.app.loading}</div>
  }

  return (
    <div className="px-4 pt-5 pb-28 lg:px-0 lg:pt-0">
      <h1 className="text-xl font-semibold text-ink mb-4">{t.admin.stock.title}</h1>

      <div className="flex gap-2.5 flex-wrap mb-3.5">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.stock.search}
            className="w-full bg-surface rounded-lg pl-10 pr-4 py-2 text-sm border border-line focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-surface rounded-lg px-3 py-2 text-sm border border-line focus:border-accent focus:outline-none"
        >
          <option value="all">{t.admin.stock.allCategories}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="inline-flex bg-surface border border-line rounded-lg p-0.5">
          {(['all', 'assets', 'consumables'] as KindFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setKindFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                kindFilter === f ? 'bg-accent text-white' : 'text-muted'
              }`}
            >
              {f === 'all' ? t.admin.stock.all : f === 'assets' ? t.admin.stock.assets : t.admin.stock.consumables}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <h2 className="font-semibold text-sm text-ink mb-2 px-1">{category}</h2>
            <div className="bg-surface border border-line rounded-xl overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-muted text-xs px-2.5 py-2 border-b border-line">{t.admin.stock.title}</th>
                    <th className="text-left font-medium text-muted text-xs px-2.5 py-2 border-b border-line whitespace-nowrap">Остаток / {t.admin.stock.min}</th>
                    <th className="text-left font-medium text-muted text-xs px-2.5 py-2 border-b border-line">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const expanded = expandedId === item.item_id
                    const minPct = item.min_stock ? Math.min((item.qty / item.min_stock) * 100, 100) : 100
                    return (
                      <>
                        <tr
                          key={item.item_id}
                          onClick={() => toggleExpand(item.item_id)}
                          className="cursor-pointer transition-colors hover:bg-app"
                        >
                          <td className="px-2.5 py-2.5 border-b border-line">
                            <span className="text-sm text-ink">{item.name}</span>
                          </td>
                          <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap" style={{ minWidth: '140px' }}>
                            <span className={item.below_min ? 'text-bad' : 'text-ink'}>{formatQty(item.qty, item)}</span>
                            <span className="text-muted text-xs"> / {item.min_stock ?? '—'}</span>
                            <ProgressBar value={minPct} color={item.below_min ? 'var(--bad)' : 'var(--ok)'} />
                          </td>
                          <td className="px-2.5 py-2.5 border-b border-line">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              item.below_min ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'
                            }`}>
                              {item.below_min ? t.admin.stock.belowMin : 'в норме'}
                            </span>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={3} className="px-2.5 py-3 border-b border-line bg-app">
                              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t.admin.stock.history}</div>
                              {movesLoading ? (
                                <div className="text-sm text-muted">{t.app.loading}</div>
                              ) : moves.length === 0 ? (
                                <div className="text-sm text-muted">{t.admin.stock.noHistory}</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {moves.map((m) => (
                                    <div key={m.id} className="text-xs flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="text-ink">{m.source_type}</span>
                                        {m.note && <span className="text-muted"> · {m.note}</span>}
                                        <span className="text-muted block">{formatDateTime(m.moved_at)}</span>
                                      </div>
                                      <span className="text-muted shrink-0">{m.qty}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="bg-surface border border-line rounded-xl px-4 py-6 text-center text-muted text-sm">Ничего не найдено</div>
        )}
      </div>
    </div>
  )
}
