import type { BaseUnit, Item } from '@/lib/database.types'

const cairoTz = 'Africa/Cairo'

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { timeZone: cairoTz, day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    timeZone: cairoTz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isToday(iso: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.toLocaleDateString('ru-RU', { timeZone: cairoTz }) === now.toLocaleDateString('ru-RU', { timeZone: cairoTz })
}

export function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  if (diffH < 24) return `${diffH} ч назад`
  if (diffD < 7) return `${diffD} дн назад`
  return formatDate(iso)
}

export function formatQty(qty: number, item: Pick<Item, 'base_unit' | 'pack_size' | 'pack_label'>): string {
  const isConsumable = item.pack_size > 1
  if (isConsumable) {
    const packs = qty / item.pack_size
    const packsStr = packs.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
    const baseStr = Math.round(qty).toLocaleString('ru-RU')
    return `${packsStr} ${item.pack_label} (${baseStr} ${unitShort(item.base_unit)})`
  }
  return `${qty.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} ${unitShort(item.base_unit)}`
}

function unitShort(unit: BaseUnit): string {
  switch (unit) {
    case 'pcs': return 'шт'
    case 'g': return 'г'
    case 'ml': return 'мл'
  }
}

const egpFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EGP' })

export function formatEGP(amount: number): string {
  return egpFormatter.format(amount)
}
