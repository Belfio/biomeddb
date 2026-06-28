import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Instant perceived load: a hero header bar plus a column of result-card
 * skeletons matching the real DatasetCard layout.
 */
export default function Loading() {
  return (
    <main className="flex flex-col">
      <section className="border-b border-hairline">
        <Container className="py-16 sm:py-24">
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-4 h-12 w-full max-w-xl" />
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  )
}
