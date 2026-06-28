import type { ReactNode } from 'react'

type BadgeVariant = 'verified' | 'unverified' | 'default'

const VARIANTS: Record<BadgeVariant, string> = {
  // Subtle green / amber / grey — quiet status pills, never loud.
  verified: 'bg-green-50 text-green-700 border-green-200',
  unverified: 'bg-amber-50 text-amber-700 border-amber-200',
  default: 'bg-fill text-secondary border-hairline',
}

/** Small pill for status / metadata. */
export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
