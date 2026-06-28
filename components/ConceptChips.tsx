import type { LinkedConcept } from '@/lib/types'

export function ConceptChips({
  concepts,
}: {
  concepts: Pick<LinkedConcept, 'name' | 'relationship'>[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {concepts.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-hairline bg-fill px-2 py-0.5 text-xs text-secondary"
        >
          {c.name}
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-secondary/70">
            {c.relationship}
          </span>
        </span>
      ))}
    </div>
  )
}
