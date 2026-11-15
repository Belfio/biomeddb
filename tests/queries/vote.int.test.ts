import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
import { castVote } from '@/lib/queries/votes'

test('voting same value twice toggles it off (score returns to 0)', async () => {
  const db = getAdminClient()
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'T', modality: 'ecg', source_name: 'x', source_url: 'https://x', license: 'CC0-1.0' })
    .select('id').single()
  const { data: u } = await db.auth.admin.createUser({ email: `v${Date.now()}@t.co`, password: 'pw123456', email_confirm: true })
  await castVote(db, u!.user!.id, 'dataset', ds!.id, 1)
  await castVote(db, u!.user!.id, 'dataset', ds!.id, 1)
  const { data } = await db.from('datasets').select('score').eq('id', ds!.id).single()
  expect(data!.score).toBe(0)
})
