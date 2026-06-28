import type { ReactNode } from 'react'

/**
 * White surface with hairline border and 16px radius.
 * Adds a subtle hover shadow only when `interactive` (e.g. result cards).
 */
export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-surface ${
        interactive
          ? 'transition-shadow duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
