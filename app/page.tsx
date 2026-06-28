import { SearchBar } from '@/components/SearchBar'
import { Filters } from '@/components/Filters'
import { DatasetCard } from '@/components/DatasetCard'
import { GeometricBackdrop } from '@/components/GeometricBackdrop'
import { Container } from '@/components/ui/Container'
import { createClient } from '@/lib/supabase/server'
import { parseSearchParams } from '@/lib/search-params'
import { searchDatasets } from '@/lib/queries/search'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseSearchParams(await searchParams)
  const sb = await createClient()
  const results = await searchDatasets(sb, filters)
  const hasQuery = Boolean(
    filters.q || filters.modality || filters.access || filters.hostedOnly,
  )

  return (
    <main className="flex flex-col">
      {/* Hero — the SearchBar is the focal element; the line-network sits behind it. */}
      <section className="relative isolate overflow-hidden border-b border-hairline">
        <GeometricBackdrop />
        <Container className="relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-text sm:text-5xl">
              Find biomedical datasets by what they measure and the conditions
              they&rsquo;re linked to
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-secondary sm:text-lg">
              Search by modality and linked disease, outcome, or marker. A
              community-curated catalog of open and access-controlled datasets.
            </p>
            <div className="mt-8 flex max-w-xl flex-col gap-4">
              <SearchBar />
              <Filters />
            </div>
          </div>
        </Container>
      </section>

      {/* Results */}
      <Container className="py-10">
        {hasQuery && (
          <p className="mb-4 text-sm text-secondary">
            <span className="font-mono text-text">{results.length}</span>{' '}
            {results.length === 1 ? 'dataset' : 'datasets'}
          </p>
        )}

        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
            <p className="text-base font-medium text-text">
              {hasQuery ? 'No datasets match your search.' : 'Start searching.'}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {hasQuery
                ? 'Try a broader term, a different modality, or clear the filters.'
                : 'Enter a modality, disease, outcome, or marker above to find datasets.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((d) => (
              <DatasetCard key={d.id} dataset={d} />
            ))}
          </div>
        )}
      </Container>
    </main>
  )
}
