import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Detail skeleton mirroring the real page layout: breadcrumb, title bar +
 * vote control, status row, description lines, an action button, the metadata
 * grid card, and a couple of concept rows.
 */
export default function Loading() {
  return (
    <main className="flex flex-col">
      <Container className="py-12 sm:py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {/* Breadcrumb */}
          <Skeleton className="h-4 w-28" />

          {/* Title + vote */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-9 w-72 sm:w-96" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Action button */}
          <Skeleton className="h-10 w-40 rounded-full" />

          {/* Metadata card */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>

          {/* Linked concepts */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-32" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16" />
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}
