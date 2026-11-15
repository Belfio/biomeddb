import { expect, test } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '../helpers/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

test('anonymous cannot insert datasets but can read them', async () => {
  const admin = getAdminClient()
  await admin.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const anonClient = createClient(url, anon, { auth: { persistSession: false } })
  const { error: insErr } = await anonClient.from('datasets')
    .insert({ title: 'nope', modality: 'ecg', source_name: 'x', source_url: 'https://x', license: 'CC0-1.0' })
  expect(insErr).not.toBeNull()
  const { error: selErr } = await anonClient.from('datasets').select('id').limit(1)
  expect(selErr).toBeNull()
})
