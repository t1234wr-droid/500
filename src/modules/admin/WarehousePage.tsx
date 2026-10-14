import { useState, useEffect, useMemo } from 'react'
import { fetchWarehouseStock, fetchStockMoves } from '@/modules/admin/api'
import type { WarehouseStockRow, StockMoveRow, ItemKind } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatQty, formatDateTime } from '@/lib/format'
import { Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

type Filter = 'all' | 'assets' | 'consumables'

export function WarehousePage() {
  const [stock, setStock] = useState<WarehouseStockRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [moves, setMoves] = useState<StockMoveRow[]>([])
  const [movesLoading, setMovesLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchWarehouseStock()
      .then(setStock)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    stock.forEach((s) => set.add(s.category))
    return Array.from(set).sort()
  }, [stock])

  const filtered = useMemo(() => {
    return stock.filter((s) => {
      if (filter === 'assets' && s.kind !== 'asset') return false
      if (filter === 'consumables' && s.kind !== 'consumable') return false
      if (selectedCategory && s.category !== selectedCategory) return false
      if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase().trim())) return false
      return true
    })
  }, [stock, filter, search])

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
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{ru.admin.stock.title}</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ru.admin.stock.search}
          className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2 mb-4">
        {(['all', 'assets', 'consumables'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {f === 'all' ? ru.admin.stock.all : f === 'assets' ? ru.admin.stock.assets : ru.admin.stock.consumables}
          </button>
        ))}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {ru.admin.stock.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const expanded = expandedId === item.item_id
          return (
            <div key={item.item_id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => toggleExpand(item.item_id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${item.below_min ? 'text-red-500' : 'text-slate-700'}`}>
                      {formatQty(item.qty, item)}
                    </p>
                    {item.min_stock !== null && (
                      <p className="text-xs text-slate-400">
                        {ru.admin.stock.min}: {item.min_stock}
                      </p>
                    )}
                  </div>
                  {item.below_min && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                </div>
              </button>
              {expanded && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {ru.admin.stock.history}
                  </p>
                  {movesLoading ? (
                    <p className="text-sm text-slate-400">{ru.app.loading}</p>
                  ) : moves.length === 0 ? (
                    <p className="text-sm text-slate-400">{ru.admin.stock.noHistory}</p>
                  ) : (
                    <div className="space-y-2">
                      {moves.map((m) => (
                        <div key={m.id} className="text-xs flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-slate-600">{m.source_type}</span>
                            {m.note && <span className="text-slate-400"> · {m.note}</span>}
                            <span className="text-slate-400 block">{formatDateTime(m.moved_at)}</span>
                          </div>
                          <span className="text-slate-500 shrink-0">{m.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
