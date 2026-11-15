/**
 * Grey shimmer block. The shimmer animation is defined in globals.css and is
 * automatically disabled under `prefers-reduced-motion` (falls back to a flat
 * grey fill).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-md bg-fill bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.6)_50%,transparent_70%)] bg-[length:200%_100%] [animation:biomeddb-shimmer_1.6s_ease-in-out_infinite] ${className}`}
    />
  )
}
