import { expect, test } from 'vitest'
import { parseSearchParams, toQueryString } from '@/lib/search-params'

test('parses defaults', () => {
  expect(parseSearchParams({})).toEqual({ q: '', modality: null, access: null, hostedOnly: false, page: 1 })
})

test('parses provided values', () => {
  expect(parseSearchParams({ q: 'ecg', modality: 'ecg', access: 'open', hosted: '1', page: '2' }))
    .toEqual({ q: 'ecg', modality: 'ecg', access: 'open', hostedOnly: true, page: 2 })
})

test('drops invalid access', () => {
  expect(parseSearchParams({ access: 'bogus' }).access).toBeNull()
})

test('round-trips through query string', () => {
  const f = { q: 'mole', modality: null, access: null, hostedOnly: true, page: 1 }
  expect(parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(f))))).toEqual(f)
})
