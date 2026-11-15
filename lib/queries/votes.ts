import type { SupabaseClient } from '@supabase/supabase-js'
import type { VoteTarget } from '@/lib/types'

export async function castVote(
  sb: SupabaseClient, userId: string, targetType: VoteTarget, targetId: string, value: 1 | -1,
): Promise<void> {
  const { data: existing } = await sb.from('votes').select('id, value')
    .eq('user_id', userId).eq('target_type', targetType).eq('target_id', targetId).maybeSingle()
  if (!existing) {
    const { error } = await sb.from('votes').insert({ user_id: userId, target_type: targetType, target_id: targetId, value })
    if (error) throw error
  } else if (existing.value === value) {
    const { error } = await sb.from('votes').delete().eq('id', existing.id)   // toggle off
    if (error) throw error
  } else {
    const { error } = await sb.from('votes').update({ value }).eq('id', existing.id)
    if (error) throw error
  }
}
