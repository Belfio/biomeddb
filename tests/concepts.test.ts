import { expect, test } from 'vitest'
import { matchConcepts, normalizeTerm } from '@/lib/concepts'

const concepts = [
  { id: '1', name: 'Sudden cardiac death', synonyms: ['SADS', 'sudden death syndrome', 'SCD'] },
  { id: '2', name: 'Melanoma', synonyms: ['cutaneous melanoma', 'malignant melanoma'] },
]

test('normalizeTerm lowercases and trims', () => {
  expect(normalizeTerm('  Sudden Death  ')).toBe('sudden death')
})

test('matches a concept by synonym', () => {
  expect(matchConcepts('sudden death syndrome', concepts).map(c => c.id)).toEqual(['1'])
})

test('matches by canonical name case-insensitively', () => {
  expect(matchConcepts('MELANOMA', concepts).map(c => c.id)).toEqual(['2'])
})

test('no match returns empty', () => {
  expect(matchConcepts('diabetes', concepts)).toEqual([])
})
