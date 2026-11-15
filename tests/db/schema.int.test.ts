import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'

const db = getAdminClient()

test('core tables exist and accept a linked dataset', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data, error } = await db
    .from('datasets')
    .insert({
      title: 'Test DS', modality: 'ecg', source_name: 'X',
      source_url: 'https://x', license: 'CC0-1.0',
    })
    .select('id, status, score')
    .single()
  expect(error).toBeNull()
  expect(data!.status).toBe('unverified')
  expect(data!.score).toBe(0)
})
