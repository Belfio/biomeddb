import { expect, test } from 'vitest'
import { rankScore } from '@/lib/ranking'

test('verified datasets get a boost', () => {
  expect(rankScore(0.5, 3, true)).toBeGreaterThan(rankScore(0.5, 3, false))
})
test('higher text rank wins ties on votes', () => {
  expect(rankScore(0.9, 1, false)).toBeGreaterThan(rankScore(0.1, 1, false))
})
