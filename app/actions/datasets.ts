'use server'
import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
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
  let id: string
  try {
    id = await createDataset(sb, parsed.data, user.id)
  } catch {
    return { error: 'Could not save the dataset. Please try again.' }
  }
  revalidatePath('/')
  redirect(`/datasets/${id}`)
}

export async function setStatusAction(id: string, status: DatasetStatus) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in' }
  await setDatasetStatus(sb, id, status)   // RLS enforces moderator-only for status change
  revalidateTag(`dataset:${id}`, 'max')    // refresh the cached detail page
  revalidatePath(`/datasets/${id}`)
  revalidatePath('/')                       // status badge also shows in the list
  return { ok: true as const }
}
