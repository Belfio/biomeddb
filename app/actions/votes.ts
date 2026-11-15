'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { castVote } from '@/lib/queries/votes'
import { voteSchema } from '@/lib/validation'

export async function castVoteAction(input: unknown) {
  const parsed = voteSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid vote' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in to vote' }
  const { targetType, targetId, value } = parsed.data
  try {
    await castVote(sb, user.id, targetType, targetId, value)
  } catch {
    return { error: 'Could not record your vote. Please try again.' }
  }
  // Refresh the cached detail page. For a dataset target, targetId IS the
  // dataset id. For a dataset_concept target, look up its parent dataset so the
  // detail page's concept score also refreshes.
  if (targetType === 'dataset') {
    revalidateTag(`dataset:${targetId}`, 'max')
  } else {
    const { data: link } = await sb
      .from('dataset_concepts')
      .select('dataset_id')
      .eq('id', targetId)
      .maybeSingle()
    if (link?.dataset_id) revalidateTag(`dataset:${link.dataset_id}`, 'max')
  }
  revalidatePath('/')
  return { ok: true as const }
}
