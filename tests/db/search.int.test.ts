import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
const db = getAdminClient()

test('search finds dataset by linked concept synonym text', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: c } = await db.from('concepts')
    .insert({ name: 'Sudden cardiac death', slug: `scd-${Date.now()}`, kind: 'disease', synonyms: ['SADS'] })
    .select('id').single()
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'Holter recordings', description: 'ambulatory ECG', modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/', license: 'ODC-By-1.0', status: 'verified' })
    .select('id').single()
  await db.from('dataset_concepts').insert({ dataset_id: ds!.id, concept_id: c!.id, relationship: 'studies' })

  const { data, error } = await db.rpc('search_datasets', {
    q: 'sudden cardiac death', p_modality: 'ecg', p_access: null, p_hosted_only: false, p_limit: 20, p_offset: 0,
  })
  expect(error).toBeNull()
  expect(data!.map((r: any) => r.id)).toContain(ds!.id)
})
