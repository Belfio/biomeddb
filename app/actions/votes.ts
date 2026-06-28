'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { castVote } from '@/lib/queries/votes'
import { voteSchema } from '@/lib/validation'

export async function castVoteAction(input: unknown) {
  const parsed = voteSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid vote' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in to vote' }
  await castVote(sb, user.id, parsed.data.targetType, parsed.data.targetId, parsed.data.value)
  revalidatePath('/')
  return { ok: true as const }
}
