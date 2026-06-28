import { createClient as createAnonClient, type SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import type { DatasetDetail, DatasetInput, DatasetStatus, LinkedConcept } from '@/lib/types'

/**
 * Cached PUBLIC read of a dataset, tagged `dataset:${id}` (revalidate hourly,
 * or on-demand when a vote / status change calls `revalidateTag`).
 *
 * GOTCHA: `unstable_cache` callbacks cannot touch request context (`cookies()`),
 * so we deliberately use a plain, cookieless anon client here instead of the
 * request server client. Dataset reads are public (RLS allows anon select), so
 * this returns the same data for every caller — exactly what we want to cache.
 * The signed-in user / moderator lookup is kept OUT of this cache and done with
 * the request client in the page.
 */
export function getCachedDataset(id: string): Promise<DatasetDetail | null> {
  return unstable_cache(
    async () => {
      const anon = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      return getDataset(anon, id)
    },
    ['dataset', id],
    { tags: [`dataset:${id}`], revalidate: 3600 },
  )()
}

export async function getDataset(sb: SupabaseClient, id: string): Promise<DatasetDetail | null> {
  const { data: ds, error: dsErr } = await sb.from('datasets').select('*').eq('id', id).maybeSingle()
  if (dsErr) throw dsErr
  if (!ds) return null
  const { data: links, error: linkErr } = await sb
    .from('dataset_concepts')
    .select('id, concept_id, relationship, score, concepts(name)')
    .eq('dataset_id', id)
  if (linkErr) throw linkErr
  const concepts: LinkedConcept[] = (links ?? []).map((l: any) => ({
    id: l.id, conceptId: l.concept_id, name: l.concepts?.name ?? '', relationship: l.relationship, score: l.score,
  }))
  return { ...(ds as any), concepts }
}

export async function createDataset(sb: SupabaseClient, input: DatasetInput, userId: string): Promise<string> {
  const { data, error } = await sb.from('datasets').insert({
    title: input.title, description: input.description, modality: input.modality,
    source_name: input.sourceName, source_url: input.sourceUrl, host_type: input.hostType,
    license: input.license, access: input.access, n_subjects: input.nSubjects ?? null,
    format: input.format ?? null, submitted_by: userId,
  }).select('id').single()
  if (error) throw error
  const datasetId = data!.id as string
  const rows = input.concepts.map((c) => ({
    dataset_id: datasetId, concept_id: c.conceptId, relationship: c.relationship, proposed_by: userId,
  }))
  const { error: linkErr } = await sb.from('dataset_concepts').insert(rows)
  if (linkErr) throw linkErr
  return datasetId
}

export async function setDatasetStatus(sb: SupabaseClient, id: string, status: DatasetStatus): Promise<void> {
  const { error } = await sb.from('datasets').update({ status }).eq('id', id)
  if (error) throw error
}
