import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
const db = getAdminClient()

test('voting updates denormalized dataset score', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'S', modality: 'ecg', source_name: 'X', source_url: 'https://x', license: 'CC0-1.0' })
    .select('id').single()
  const { data: user } = await db.auth.admin.createUser({ email: `u${Date.now()}@t.co`, password: 'pw123456', email_confirm: true })
  await db.from('votes').insert({ user_id: user!.user!.id, target_type: 'dataset', target_id: ds!.id, value: 1 })
  const { data: after } = await db.from('datasets').select('score').eq('id', ds!.id).single()
  expect(after!.score).toBe(1)
})
