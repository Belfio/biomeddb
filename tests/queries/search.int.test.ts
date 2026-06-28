import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
import { searchDatasets } from '@/lib/queries/search'

test('searchDatasets returns rows matching filters', async () => {
  const db = getAdminClient()
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  await db.from('datasets').insert({
    title: 'Holter SCD set', description: 'ECG sudden cardiac death',
    modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/',
    license: 'ODC-By-1.0', status: 'verified',
  })
  const rows = await searchDatasets(db, { q: 'sudden cardiac death', modality: 'ecg', access: null, hostedOnly: false, page: 1 })
  expect(rows.length).toBeGreaterThan(0)
  expect(rows[0].modality).toBe('ecg')
})
