import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchApartmentById, fetchNorms, fetchNotes, addNote } from '@/modules/apartments/api'
import type { SvApartment, SvNorm, ApartmentNote, NormType } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { formatDateTime, isToday, formatQty } from '@/lib/format'
import { ArrowLeft, Wrench, Sparkles, ClipboardList, Send, CheckCircle2 } from 'lucide-react'

type Tab = 'norms' | 'comments'

const normTypeLabels: Record<NormType, string> = {
  asset_standing: ru.apartments.normInventory,
  turnover_replenish: ru.apartments.normTurnover,
  cleaning_consumption: ru.apartments.normCleaning,
}

const normTypeOrder: NormType[] = ['asset_standing', 'turnover_replenish', 'cleaning_consumption']

export function ApartmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const aptId = Number(id)
  const [apartment, setApartment] = useState<SvApartment | null>(null)
  const [norms, setNorms] = useState<SvNorm[]>([])
  const [notes, setNotes] = useState<ApartmentNote[]>([])
  const [tab, setTab] = useState<Tab>('norms')
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [sendingNote, setSendingNote] = useState(false)

  useEffect(() => {
    if (!aptId) return
    Promise.all([
      fetchApartmentById(aptId),
      fetchNorms(aptId),
      fetchNotes(aptId),
    ])
      .then(([a, n, no]) => {
        setApartment(a)
        setNorms(n)
        setNotes(no)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aptId])

  const groupedNorms = useMemo(() => {
    const map = new Map<NormType, SvNorm[]>()
    for (const n of norms) {
      const list = map.get(n.norm_type) ?? []
      list.push(n)
      map.set(n.norm_type, list)
    }
    return map
  }, [norms])

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSendingNote(true)
    try {
      await addNote(aptId, noteText.trim())
      setNoteText('')
      setNotes(await fetchNotes(aptId))
    } catch {
      // ignore
    } finally {
      setSendingNote(false)
    }
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  if (!apartment) {
    return <div className="px-4 pt-8 text-center text-slate-400">Не найдено</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/sv')} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">{apartment.code}</h1>
            <p className="text-xs text-slate-500">{apartment.building}</p>
          </div>
          <span className="text-xs text-slate-400">
            {apartment.last_cleaned_at
              ? isToday(apartment.last_cleaned_at)
                ? ru.apartments.cleanedToday
                : `${ru.apartments.lastCleaned}: ${formatDateTime(apartment.last_cleaned_at)}`
              : ru.apartments.noCleaning}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <TabButton active={tab === 'norms'} onClick={() => setTab('norms')} icon={ClipboardList} label={ru.apartments.norms} />
          <TabButton active={tab === 'comments'} onClick={() => setTab('comments')} icon={Sparkles} label={ru.apartments.comments} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-28">
        {tab === 'norms' && (
          <div className="space-y-5">
            {norms.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-8">{ru.apartments.noNorms}</p>
            )}
            {normTypeOrder.map((nt) => {
              const items = groupedNorms.get(nt)
              if (!items || items.length === 0) return null
              return (
                <div key={nt}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {normTypeLabels[nt]}
                  </h3>
                  <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {items.map((n) => (
                      <div key={`${n.item_id}-${n.norm_type}`} className="px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-slate-700">{n.item_name}</span>
                        <span className="text-sm text-slate-500">
                          {formatQty(n.qty, { base_unit: n.base_unit, pack_size: n.pack_label ? 2 : 1, pack_label: n.pack_label })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-8">{ru.apartments.noComments}</p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-700">{note.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(note.created_at)}</p>
              </div>
            ))}
            <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
              <div className="max-w-lg mx-auto flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={ru.apartments.commentPlaceholder}
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !sendingNote) handleAddNote() }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={sendingNote || !noteText.trim()}
                  className="bg-sky-600 text-white rounded-xl px-4 py-2.5 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-2">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => navigate(`/sv/apartments/${aptId}/clean`)}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-sky-500 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            {ru.apartments.cleaned}
          </button>
          <button
            onClick={() => navigate(`/sv/incidents/new?apt=${aptId}`)}
            className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Wrench className="w-5 h-5" />
            {ru.apartments.reportBreakdown}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
        active ? 'border-sky-600 text-sky-600 font-medium' : 'border-transparent text-slate-400'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
