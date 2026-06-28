'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { autocompleteConcepts } from '@/lib/queries/concepts'
import type { RelationshipType } from '@/lib/types'

export interface SelectedConcept {
  conceptId: string
  name: string
  relationship: RelationshipType
}

/**
 * Debounced concept linker. Each pick defaults to `relationship: 'studies'`
 * and is reported up via `onChange` as `{ conceptId, relationship }[]`.
 * Renders a tokenized input, a hairline dropdown of matches, and removable chips.
 */
export function ConceptAutocomplete({
  onChange,
}: {
  onChange: (concepts: SelectedConcept[]) => void
}) {
  // Browser client is stable across renders.
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (sbRef.current === null) sbRef.current = createClient()

  const [term, setTerm] = useState('')
  const [opts, setOpts] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<SelectedConcept[]>([])
  const [searching, setSearching] = useState(false)

  // Debounce the network call so we don't fire on every keystroke.
  useEffect(() => {
    const t = term.trim()
    if (t.length < 2) {
      setOpts([])
      setSearching(false)
      return
    }
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const res = await autocompleteConcepts(sbRef.current!, t)
        setOpts(res.map((c) => ({ id: c.id, name: c.name })))
      } catch {
        setOpts([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [term])

  const add = (id: string, name: string) => {
    if (selected.some((s) => s.conceptId === id)) {
      setTerm('')
      setOpts([])
      return
    }
    const next: SelectedConcept[] = [
      ...selected,
      { conceptId: id, name, relationship: 'studies' },
    ]
    setSelected(next)
    onChange(next)
    setTerm('')
    setOpts([])
  }

  const remove = (id: string) => {
    const next = selected.filter((s) => s.conceptId !== id)
    setSelected(next)
    onChange(next)
  }

  // Hide already-selected concepts from the dropdown.
  const visibleOpts = opts.filter(
    (o) => !selected.some((s) => s.conceptId === o.id),
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Link a disease, outcome, or marker"
          aria-label="Search concepts to link"
          autoComplete="off"
          className="w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-base text-text placeholder:text-secondary transition-colors focus:border-accent"
        />

        {term.trim().length >= 2 && (
          <ul
            role="listbox"
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-hairline bg-surface py-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.18)]"
          >
            {searching ? (
              <li className="px-4 py-2 text-sm text-secondary">Searching…</li>
            ) : visibleOpts.length === 0 ? (
              <li className="px-4 py-2 text-sm text-secondary">
                No matching concepts.
              </li>
            ) : (
              visibleOpts.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => add(o.id, o.name)}
                    className="block w-full px-4 py-2 text-left text-sm text-text transition-colors hover:bg-fill focus:bg-fill"
                  >
                    {o.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.conceptId}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-fill px-2.5 py-1 text-xs text-text"
            >
              {s.name}
              <span className="font-mono text-[0.65rem] uppercase tracking-wide text-secondary">
                {s.relationship}
              </span>
              <button
                type="button"
                onClick={() => remove(s.conceptId)}
                aria-label={`Remove ${s.name}`}
                className="-mr-0.5 ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-secondary transition-colors hover:bg-hairline hover:text-text"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
