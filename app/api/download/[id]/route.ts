import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: ds } = await sb.from('datasets').select('file_path, host_type').eq('id', id).maybeSingle()
  if (!ds || ds.host_type !== 'hosted' || !ds.file_path) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('datasets').createSignedUrl(ds.file_path, 60)
  if (error || !data) return NextResponse.json({ error: 'unavailable' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
