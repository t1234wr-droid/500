import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchApartments } from '@/modules/apartments/api'
import { fetchItems, createIncident, uploadIncidentPhoto } from '@/modules/incidents/api'
import type { SvApartment, SvItem, IncidentKind } from '@/lib/database.types'
import { useAuth } from '@/modules/core/store'
import { ru } from '@/i18n/ru'
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react'

const kinds: { value: IncidentKind; label: string }[] = [
  { value: 'breakdown', label: ru.incidents.kindBreakdown },
  { value: 'broken', label: ru.incidents.kindBroken },
  { value: 'lost', label: ru.incidents.kindLost },
  { value: 'other', label: ru.incidents.kindOther },
]

export function IncidentForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectApt = params.get('apt')
  const profile = useAuth((s) => s.profile)

  const [apartments, setApartments] = useState<SvApartment[]>([])
  const [items, setItems] = useState<SvItem[]>([])
  const [loading, setLoading] = useState(true)
  const [aptId, setAptId] = useState<number | null>(preselectApt ? Number(preselectApt) : null)
  const [itemId, setItemId] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const [kind, setKind] = useState<IncidentKind>('breakdown')
  const [qty, setQty] = useState('1')
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([fetchApartments(), fetchItems()])
      .then(([a, i]) => {
        setApartments(a)
        setItems(i)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photos.length)
    if (files.length === 0) return
    setPhotos((prev) => [...prev, ...files])
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async () => {
    if (!aptId) {
      setError(ru.incidents.apartment)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const photoPaths: string[] = []
      if (photos.length > 0 && profile) {
        for (const file of photos) {
          const path = await uploadIncidentPhoto(profile.id, file)
          photoPaths.push(path)
        }
      }
      await createIncident({
        apartmentId: aptId,
        itemId: itemId,
        freeText: freeText.trim() || null,
        kind,
        qty: Number(qty) || 1,
        comment: comment.trim() || null,
        photoPaths,
      })
      navigate('/sv/incidents')
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="px-4 pt-8 text-center text-slate-400">{ru.app.loading}</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">{ru.incidents.title}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">
        {/* Apartment */}
        <Field label={ru.incidents.apartment}>
          <select
            value={aptId ?? ''}
            onChange={(e) => setAptId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">—</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>{a.code}</option>
            ))}
          </select>
        </Field>

        {/* Item / free text */}
        <Field label={ru.incidents.item}>
          <select
            value={itemId ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setItemId(v ? Number(v) : null)
              if (v) setFreeText('')
            }}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none mb-2"
          >
            <option value="">— {ru.incidents.freeText} —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          {!itemId && (
            <input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={ru.incidents.freeText}
              className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          )}
        </Field>

        {/* Kind */}
        <Field label={ru.incidents.kind}>
          <div className="grid grid-cols-2 gap-2">
            {kinds.map((k) => (
              <button
                key={k.value}
                onClick={() => setKind(k.value)}
                className={`rounded-xl py-2.5 text-sm border transition-colors ${
                  kind === k.value
                    ? 'border-sky-600 bg-sky-50 text-sky-700 font-medium'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Qty */}
        <Field label={ru.incidents.qty}>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </Field>

        {/* Comment */}
        <Field label={ru.incidents.comment}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-slate-200 focus:border-sky-500 focus:outline-none resize-none"
          />
        </Field>

        {/* Photos */}
        <Field label={ru.incidents.photos}>
          <div className="flex gap-2 flex-wrap">
            {photoPreviews.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20">
                <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 hover:border-sky-500"
              >
                <Camera className="w-6 h-6" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-medium"
          >
            {ru.incidents.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-sky-600 text-white rounded-xl py-3 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {ru.incidents.submit}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
