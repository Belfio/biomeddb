import Link from 'next/link'
import type { DatasetRow } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function DatasetCard({ dataset }: { dataset: DatasetRow }) {
  return (
    <Card interactive className="p-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/datasets/${dataset.id}`}
            className="text-base font-semibold leading-snug tracking-[-0.01em] text-text hover:text-accent"
          >
            {dataset.title}
          </Link>
          <span
            className="shrink-0 font-mono text-xs text-secondary"
            title="Community score"
          >
            ▲ {dataset.score}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-secondary">
          <span className="font-mono text-text">{dataset.modality}</span>
          <span aria-hidden>·</span>
          <span>{dataset.source_name}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{dataset.access}</span>
          {dataset.status === 'verified' && (
            <Badge variant="verified">✓ verified</Badge>
          )}
          {dataset.status === 'unverified' && (
            <Badge variant="unverified">unverified</Badge>
          )}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-secondary">
          {dataset.description}
        </p>
      </div>
    </Card>
  )
}
