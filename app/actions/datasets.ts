'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createDataset, setDatasetStatus } from '@/lib/queries/datasets'
import { datasetInputSchema } from '@/lib/validation'
import type { DatasetStatus } from '@/lib/types'

export async function createDatasetAction(input: unknown) {
  const parsed = datasetInputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in to contribute' }
  const id = await createDataset(sb, parsed.data, user.id)
  revalidatePath('/')
  redirect(`/datasets/${id}`)
}

export async function setStatusAction(id: string, status: DatasetStatus) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in' }
  await setDatasetStatus(sb, id, status)   // RLS enforces moderator-only for status change
  revalidatePath(`/datasets/${id}`)
  return { ok: true as const }
}
