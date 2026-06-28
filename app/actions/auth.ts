'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Ends the current session and returns the visitor to the homepage.
 * The server client clears the auth cookies via its `setAll` handler.
 */
export async function signOutAction() {
  const sb = await createClient()
  await sb.auth.signOut()
  redirect('/')
}
