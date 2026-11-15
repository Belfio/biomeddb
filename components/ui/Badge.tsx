import type { ReactNode } from 'react'

type BadgeVariant = 'verified' | 'unverified' | 'default'

const VARIANTS: Record<BadgeVariant, string> = {
  // Subtle green / amber / grey — quiet status pills, never loud. Colors come
  // from tokenized status vars (see globals.css @theme), not ad-hoc utilities.
  verified: 'bg-verified-bg text-verified border-verified/20',
  unverified: 'bg-warning-bg text-warning border-warning/20',
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
