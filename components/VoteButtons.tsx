'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { castVoteAction } from '@/app/actions/votes'
import type { VoteTarget } from '@/lib/types'

/**
 * Optimistic up/down vote control.
 *
 * The displayed score updates IMMEDIATELY (via `useOptimistic`) when the user
 * clicks, then reconciles against the server. The server action may either
 * RETURN `{ error }` (validation / not-signed-in) OR THROW (unexpected DB
 * error); both paths are caught here, the optimistic delta is rolled back
 * (React discards the optimistic value automatically once the transition ends),
 * and a brief inline message is surfaced.
 */
export function VoteButtons({
  targetType,
  targetId,
  score,
  size = 'md',
}: {
  targetType: VoteTarget
  targetId: string
  score: number
  size?: 'sm' | 'md'
}) {
  // `score` is the authoritative server value. `useOptimistic` layers a pending
  // delta on top; when the transition settles it snaps back to `score` (which
  // the revalidated server render keeps fresh).
  const [optimisticScore, applyOptimistic] = useOptimistic(
    score,
    (current, delta: number) => current + delta,
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const vote = (value: 1 | -1) => {
    setError(null)
    startTransition(async () => {
      applyOptimistic(value)
      try {
        const res = await castVoteAction({ targetType, targetId, value })
        // Action returned a handled error → roll back (optimistic value is
        // discarded automatically when the transition ends) + show message.
        if (res && 'error' in res) {
          setError(res.error ?? 'Vote failed. Try again.')
        }
      } catch {
        // Unexpected throw (e.g. DB failure) → same rollback path.
        setError('Vote failed. Try again.')
      }
    })
  }

  const iconSize = size === 'sm' ? 'text-[0.7rem]' : 'text-xs'
  const btn =
    'inline-flex h-5 w-5 items-center justify-center rounded text-secondary ' +
    'transition-colors hover:text-accent hover:bg-fill ' +
    'disabled:cursor-not-allowed disabled:opacity-50 ' +
    iconSize

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => vote(1)}
          aria-label="Upvote"
          className={btn}
        >
          <span aria-hidden>▲</span>
        </button>
        <span
          className="min-w-[1.5rem] text-center font-mono text-sm tabular-nums text-text"
          aria-live="polite"
        >
          {optimisticScore}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => vote(-1)}
          aria-label="Downvote"
          className={btn}
        >
          <span aria-hidden>▼</span>
        </button>
      </span>
      {error && (
        <span role="status" className="text-[0.65rem] leading-tight text-warning">
          {error}
        </span>
      )}
    </span>
  )
}
