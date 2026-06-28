import type { AccessLevel } from './types'

export interface SearchFilters {
  q: string; modality: string | null; access: AccessLevel | null
  hostedOnly: boolean; page: number
}

const ACCESS: AccessLevel[] = ['open', 'registration', 'data-use-agreement']
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const access = first(sp.access) as AccessLevel
  const page = parseInt(first(sp.page), 10)
  return {
    q: first(sp.q).trim(),
    modality: first(sp.modality) || null,
    access: ACCESS.includes(access) ? access : null,
    hostedOnly: first(sp.hosted) === '1',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toQueryString(f: SearchFilters): string {
  const p = new URLSearchParams()
  const q = f.q.trim()
  if (q) p.set('q', q)
  if (f.modality) p.set('modality', f.modality)
  if (f.access) p.set('access', f.access)
  if (f.hostedOnly) p.set('hosted', '1')
  if (f.page > 1) p.set('page', String(f.page))
  return p.toString()
}
