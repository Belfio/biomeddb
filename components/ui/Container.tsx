import type { ReactNode } from 'react'

/** Centered max-width (~1080px) wrapper with responsive horizontal padding. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1080px] px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  )
}
