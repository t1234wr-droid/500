import { supabase } from '@/lib/supabase'
import type {
  WarehouseStockRow,
  ToOrderRow,
  ApartmentGapRow,
  EventRow,
  StockMoveRow,
  NormRuleRow,
  CleaningEventRow,
  IssueMissingResult,
  Apartment,
  Building,
  Staff,
  Contact,
  Incident,
  Category,
  Item,
  ItemKind,
  BaseUnit,
} from '@/lib/database.types'

// ---- Queries ----

export async function fetchToOrder(): Promise<ToOrderRow[]> {
  const { data, error } = await supabase
    .from('to_order')
    .select('item_id,name,category,base_unit,pack_size,pack_label,qty,min_stock,shortage')
    .order('shortage', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchApartmentGaps(): Promise<ApartmentGapRow[]> {
  const { data, error } = await supabase
    .from('apartment_gap')
    .select('apartment_id,code,item_id,name,norm,actual,gap')
    .gt('gap', 0)
    .order('code')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchShortageEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id,type,payload,created_at')
    .eq('type', 'shortage')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchWarehouseStock(): Promise<WarehouseStockRow[]> {
  const { data, error } = await supabase
    .from('warehouse_stock')
    .select('item_id,name,category,kind,base_unit,pack_size,pack_label,qty,min_stock,below_min')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchStockMoves(itemId: number): Promise<StockMoveRow[]> {
  const { data, error } = await supabase
    .from('stock_moves')
    .select('id,item_id,from_loc,to_loc,qty,unit_cost,source_type,source_id,apartment_id,staff_id,note,moved_at')
    .eq('item_id', itemId)
    .order('moved_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchApartmentsAdmin(): Promise<Apartment[]> {
  const { data, error } = await supabase
    .from('apartments')
    .select('id,building_id,number,code,type,status,created_at')
    .order('code')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id,name')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchNormRules(apartmentId: number): Promise<NormRuleRow[]> {
  const { data, error } = await supabase
    .from('norm_rules')
    .select('id,norm_type,apt_type,apartment_id,item_id,qty,note')
    .eq('apartment_id', apartmentId)
    .order('norm_type')
    .order('item_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchTemplateNorms(aptType: string): Promise<NormRuleRow[]> {
  const { data, error } = await supabase
    .from('norm_rules')
    .select('id,norm_type,apt_type,apartment_id,item_id,qty,note')
    .eq('apt_type', aptType)
    .is('apartment_id', null)
    .order('norm_type')
    .order('item_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchCleaningEvents(apartmentId: number): Promise<CleaningEventRow[]> {
  const { data, error } = await supabase
    .from('cleaning_events')
    .select('id, apartment_id, cleaned_at, status, revision, note, lead_staff_id, reverse_reason, cleaning_event_staff(staff_id, staff(full_name))')
    .eq('apartment_id', apartmentId)
    .order('cleaned_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Array<{
    id: string
    apartment_id: number
    cleaned_at: string
    status: CleaningEventRow['status']
    revision: number
    note: string | null
    lead_staff_id: number | null
    reverse_reason: string | null
    cleaning_event_staff: Array<{
      staff_id: number
      staff: { full_name: string } | { full_name: string }[]
    }>
  }>
  return rows.map((r) => ({
    ...r,
    cleaning_event_staff: (r.cleaning_event_staff ?? []).map((e) => ({
      staff_id: e.staff_id,
      staff: Array.isArray(e.staff) ? e.staff[0] : e.staff,
    })),
  }))
}

export async function fetchAllStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id,full_name,role,phone,active')
    .order('full_name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchAllContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id,group_name,name,role_title,phone_e164,has_whatsapp,sort,active')
    .order('sort')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchAllIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select('id,apartment_id,item_id,free_text,kind,qty,status,photo_paths,comment,created_by,created_at,resolved_by,resolved_at,resolution_note,writeoff_move_id')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

// ---- Mutations (all through RPC) ----

export async function postMove(params: {
  op: string
  item: number
  qty: number
  apartment?: number | null
  staff?: number | null
  unitCost?: number | null
  note?: string | null
}): Promise<number> {
  const { data, error } = await supabase.rpc('post_move', {
    p_op: params.op,
    p_item: params.item,
    p_qty: params.qty,
    p_apartment: params.apartment ?? null,
    p_staff: params.staff ?? null,
    p_unit_cost: params.unitCost ?? null,
    p_note: params.note ?? null,
  })
  if (error) throw new Error(error.message)
  return data as number
}

export async function issueMissing(apartmentId: number): Promise<IssueMissingResult> {
  const { data, error } = await supabase.rpc('issue_missing_to_apartment', {
    p_apartment: apartmentId,
  })
  if (error) throw new Error(error.message)
  return data as IssueMissingResult
}

export async function reverseCleaning(eventId: string, reason: string | null): Promise<unknown> {
  const { data, error } = await supabase.rpc('reverse_cleaning', {
    p_event: eventId,
    p_reason: reason,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function recalculateCleaning(
  eventId: string,
  cleanedAt: string | null,
  staffIds: number[] | null,
  leadStaffId: number | null,
): Promise<unknown> {
  const { data, error } = await supabase.rpc('recalculate_cleaning', {
    p_event: eventId,
    p_cleaned_at: cleanedAt,
    p_staff_ids: staffIds,
    p_lead_staff_id: leadStaffId,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function approveIncident(
  incidentId: string,
  decision: 'confirm' | 'reject',
  note: string | null,
  force: boolean,
): Promise<unknown> {
  const { data, error } = await supabase.rpc('approve_incident', {
    p_incident: incidentId,
    p_decision: decision,
    p_note: note,
    p_force: force,
  })
  if (error) throw new Error(error.message)
  return data
}

// ---- Staff CRUD (admin_all policy) ----

export async function createStaff(name: string, role: string, phone: string): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .insert({ full_name: name, role, phone: phone || null, active: true })
  if (error) throw new Error(error.message)
}

export async function updateStaff(id: number, patch: Partial<Pick<Staff, 'full_name' | 'role' | 'phone' | 'active'>>): Promise<void> {
  const { error } = await supabase.from('staff').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteStaff(id: number): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Contacts CRUD (admin_all policy) ----

export async function createContact(params: {
  name: string
  group_name: string | null
  role_title: string | null
  phone_e164: string
  has_whatsapp: boolean
  sort: number
}): Promise<void> {
  const { error } = await supabase.from('contacts').insert({ ...params, active: true })
  if (error) throw new Error(error.message)
}

export async function updateContact(id: number, patch: Partial<Contact>): Promise<void> {
  const { error } = await supabase.from('contacts').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteContact(id: number): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Norm rules CRUD (admin_all policy) ----

export async function upsertNormRule(params: {
  id?: number
  norm_type: string
  apartment_id: number | null
  apt_type: string | null
  item_id: number
  qty: number
  note?: string | null
}): Promise<void> {
  const payload = {
    norm_type: params.norm_type,
    apartment_id: params.apartment_id,
    apt_type: params.apt_type,
    item_id: params.item_id,
    qty: params.qty,
    note: params.note ?? null,
  }
  if (params.id) {
    const { error } = await supabase.from('norm_rules').update(payload).eq('id', params.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('norm_rules').insert(payload)
    if (error) throw new Error(error.message)
  }
}

export async function deleteNormRule(id: number): Promise<void> {
  const { error } = await supabase.from('norm_rules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Categories CRUD (admin_all policy) ----

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,kind,sort')
    .order('sort')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCategory(name: string, kind: ItemKind, sort: number): Promise<void> {
  const { error } = await supabase.from('categories').insert({ name, kind, sort })
  if (error) throw new Error(error.message)
}

export async function updateCategory(id: number, patch: Partial<Pick<Category, 'name' | 'kind' | 'sort'>>): Promise<void> {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Items CRUD (admin_all policy) ----

export async function fetchItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id,category_id,name,base_unit,pack_size,pack_label,min_stock,track_on_hand,qr_code,photo_path,active,sort')
    .order('sort')
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createItem(params: {
  category_id: number
  name: string
  base_unit: BaseUnit
  pack_size: number
  pack_label: string
  min_stock: number | null
  track_on_hand: boolean
}): Promise<void> {
  const { error } = await supabase.from('items').insert({ ...params, active: true, sort: 0 })
  if (error) throw new Error(error.message)
}

export async function updateItem(id: number, patch: Partial<Pick<Item, 'name' | 'category_id' | 'base_unit' | 'pack_size' | 'pack_label' | 'min_stock' | 'track_on_hand' | 'active'>>): Promise<void> {
  const { error } = await supabase.from('items').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteItem(id: number): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
