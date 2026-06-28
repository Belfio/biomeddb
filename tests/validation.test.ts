import { expect, test } from 'vitest'
import { datasetInputSchema } from '@/lib/validation'

const valid = {
  title: 'X', description: '', modality: 'ecg', sourceName: 'PhysioNet',
  sourceUrl: 'https://physionet.org/content/sddb/', hostType: 'linked',
  license: 'ODC-By-1.0', access: 'open',
  concepts: [{ conceptId: '550e8400-e29b-41d4-a716-446655440000', relationship: 'studies' }],
}

test('accepts a valid linked dataset', () => {
  expect(datasetInputSchema.parse(valid).title).toBe('X')
})

test('rejects hosted dataset without a license', () => {
  expect(() => datasetInputSchema.parse({ ...valid, hostType: 'hosted', license: '' })).toThrow()
})

test('rejects non-url source', () => {
  expect(() => datasetInputSchema.parse({ ...valid, sourceUrl: 'not-a-url' })).toThrow()
})
