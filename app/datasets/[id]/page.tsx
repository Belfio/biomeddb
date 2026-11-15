import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedDataset } from '@/lib/queries/datasets'
import { setStatusAction } from '@/app/actions/datasets'
import { VoteButtons } from '@/components/VoteButtons'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// NOTE: deliberately NO `export const revalidate` — the page reads the current
// user via cookies (dynamic). Speed comes from the tagged DATA cache around the
// public dataset fetch (`getCachedDataset`), not route-level ISR.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const ds = await getCachedDataset(id)
  if (!ds) return { title: 'Dataset not found · biomeddb' }
  return { title: `${ds.title} · biomeddb`, description: ds.description }
}

/** One metadata cell: quiet label over a mono DATA value. */
function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-secondary">{label}</dt>
      <dd className="font-mono text-sm text-text">{value}</dd>
    </div>
  )
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // PUBLIC data: served from the `dataset:${id}` cache (cookieless anon client).
  const ds = await getCachedDataset(id)
  if (!ds) notFound()

  // Current user + role: request-scoped (cookies) and intentionally OUTSIDE the
  // cache. The role gates the moderator control so it isn't shown to ordinary
  // users (for whom the RLS-protected UPDATE would silently no-op). RLS still
  // enforces moderator-only on the server regardless of what the UI shows.
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  let isModerator = false
  if (user) {
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    isModerator = profile?.role === 'moderator'
  }

  // Plain string id for the inline server action to close over (avoids
  // capturing the whole dataset object in the action's closure).
  const datasetId = ds.id
  const isHosted = ds.host_type === 'hosted' && Boolean(ds.file_path)

  return (
    <main className="flex flex-col">
      <Container className="py-12 sm:py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="w-fit text-sm text-secondary transition-colors hover:text-accent"
          >
            ← Back to search
          </Link>

          {/* Title + dataset-level vote */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-text sm:text-4xl">
                {ds.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {ds.status === 'verified' ? (
                  <Badge variant="verified">✓ verified</Badge>
                ) : ds.status === 'flagged' ? (
                  <Badge variant="default">flagged</Badge>
                ) : (
                  <Badge variant="unverified">unverified</Badge>
                )}
                <span className="text-sm text-secondary">{ds.source_name}</span>
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <VoteButtons targetType="dataset" targetId={ds.id} score={ds.score} />
            </div>
          </header>

          {/* Description */}
          {ds.description && (
            <p className="text-base leading-relaxed text-secondary">
              {ds.description}
            </p>
          )}

          {/* Primary action */}
          <div>
            {isHosted ? (
              <a
                href={`/api/download/${ds.id}`}
                className="inline-flex w-fit items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Download dataset
              </a>
            ) : (
              <a
                href={ds.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-full border border-hairline bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
              >
                Go to source <span aria-hidden>↗</span>
              </a>
            )}
          </div>

          {/* Metadata */}
          <Card className="p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <MetaItem label="Modality" value={ds.modality} />
              <MetaItem label="Source" value={ds.source_name} />
              <MetaItem label="Access" value={ds.access} />
              <MetaItem label="License" value={ds.license || '—'} />
              <MetaItem
                label="Subjects"
                value={ds.n_subjects != null ? ds.n_subjects.toLocaleString() : '—'}
              />
              <MetaItem label="Format" value={ds.format || '—'} />
              <MetaItem label="Status" value={ds.status} />
            </dl>
          </Card>

          {/* Linked concepts */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Linked concepts
            </h2>
            {ds.concepts.length === 0 ? (
              <p className="text-sm text-secondary">No concepts linked yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ds.concepts.map((c) => (
                  <li key={c.id}>
                    <Card className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium text-text">
                          {c.name}
                        </span>
                        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-secondary">
                          {c.relationship}
                        </span>
                      </span>
                      <div className="shrink-0">
                        <VoteButtons
                          targetType="dataset_concept"
                          targetId={c.id}
                          score={c.score}
                          size="sm"
                        />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Moderator control — only shown to actual moderators; RLS also
              enforces moderator-only on the server. */}
          {isModerator && ds.status !== 'verified' && (
            <form
              action={async () => {
                'use server'
                await setStatusAction(datasetId, 'verified')
              }}
              className="border-t border-hairline pt-6"
            >
              <button
                type="submit"
                className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Mark verified
                <span className="ml-1 text-secondary">(moderators only)</span>
              </button>
            </form>
          )}
        </div>
      </Container>
    </main>
  )
}
