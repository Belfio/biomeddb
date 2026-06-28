'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchBar() {
  const router = useRouter()
  const sp = useSearchParams()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams(sp.toString())
        const q = new FormData(e.currentTarget).get('q') as string
        q ? params.set('q', q) : params.delete('q')
        params.delete('page')
        router.push(`/?${params.toString()}`)
      }}
      role="search"
      className="flex w-full gap-2"
    >
      <input
        name="q"
        type="search"
        defaultValue={sp.get('q') ?? ''}
        placeholder="Search datasets, e.g. ECG sudden cardiac death"
        aria-label="Search biomedical datasets"
        className="min-w-0 flex-1 rounded-xl border border-hairline bg-surface px-4 py-3 text-base text-text placeholder:text-secondary shadow-sm transition-colors focus:border-accent"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-accent px-5 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
      >
        Search
      </button>
    </form>
  )
}
