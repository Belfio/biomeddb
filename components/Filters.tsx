'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const MODALITIES = [
  { slug: '', name: 'Any modality' },
  { slug: 'ecg', name: 'ECG' },
  { slug: 'dermoscopy-image', name: 'Dermoscopy image' },
]
const ACCESS = [
  { v: '', name: 'Any access' },
  { v: 'open', name: 'Open' },
  { v: 'registration', name: 'Registration' },
  { v: 'data-use-agreement', name: 'Data use agreement' },
]

const selectClass =
  'rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-text transition-colors hover:border-secondary focus:border-accent'

export function Filters() {
  const router = useRouter()
  const sp = useSearchParams()
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString())
    v ? p.set(k, v) : p.delete(k)
    p.delete('page')
    router.push(`/?${p.toString()}`)
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
      <select
        value={sp.get('modality') ?? ''}
        onChange={(e) => set('modality', e.target.value)}
        aria-label="Filter by modality"
        className={selectClass}
      >
        {MODALITIES.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        value={sp.get('access') ?? ''}
        onChange={(e) => set('access', e.target.value)}
        aria-label="Filter by access level"
        className={selectClass}
      >
        {ACCESS.map((a) => (
          <option key={a.v} value={a.v}>
            {a.name}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center gap-2 select-none">
        <input
          type="checkbox"
          checked={sp.get('hosted') === '1'}
          onChange={(e) => set('hosted', e.target.checked ? '1' : '')}
          className="h-4 w-4 rounded border-hairline text-accent accent-accent"
        />
        Hosted only
      </label>
    </div>
  )
}
