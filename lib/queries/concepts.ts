import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConceptLike } from '@/lib/concepts'

export async function autocompleteConcepts(sb: SupabaseClient, term: string): Promise<ConceptLike[]> {
  const t = term.trim()
  if (!t) return []
  const { data, error } = await sb.from('concepts')
    .select('id, name, synonyms')
    .or(`name.ilike.%${t}%,synonyms.cs.{${t}}`)
    .limit(10)
  if (error) throw error
  return (data ?? []) as ConceptLike[]
}
