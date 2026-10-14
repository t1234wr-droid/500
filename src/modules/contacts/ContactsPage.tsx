import { useState, useEffect, useMemo } from 'react'
import { fetchContacts } from '@/modules/contacts/api'
import type { Contact } from '@/lib/database.types'
import { ru } from '@/i18n/ru'
import { Phone, MessageCircle, User } from 'lucide-react'

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>()
    for (const c of contacts) {
      const key = c.group_name ?? 'Без группы'
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [contacts])

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{ru.contacts.title}</h1>

      {loading ? (
        <p className="text-center text-slate-400 mt-8">{ru.app.loading}</p>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 text-slate-400">
          <Phone className="w-10 h-10 mb-3" />
          <p className="text-sm">{ru.contacts.noContacts}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, list]) => (
            <div key={group}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {group}
              </h2>
              <div className="space-y-2">
                {list.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{c.name}</p>
                        {c.role_title && (
                          <p className="text-xs text-slate-400">{c.role_title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-12">
                      <a
                        href={`tel:${c.phone_e164}`}
                        className="flex items-center gap-1.5 bg-sky-50 text-sky-700 rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {ru.contacts.call}
                      </a>
                      {c.has_whatsapp && (
                        <a
                          href={`https://wa.me/${c.phone_e164.replace('+', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-lg px-3 py-1.5 text-xs font-medium"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {ru.contacts.whatsapp}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
