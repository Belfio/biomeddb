import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatasetRow } from '@/lib/types'
import type { SearchFilters } from '@/lib/search-params'

export async function searchDatasets(sb: SupabaseClient, f: SearchFilters, pageSize = 20): Promise<DatasetRow[]> {
  const { data, error } = await sb.rpc('search_datasets', {
    q: f.q, p_modality: f.modality, p_access: f.access,
    p_hosted_only: f.hostedOnly, p_limit: pageSize, p_offset: (f.page - 1) * pageSize,
  })
  if (error) throw error
  return (data ?? []) as DatasetRow[]
}
