'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sendLink = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const sb = createClient()
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${location.origin}/` },
      })
      if (error) {
        setError(
          "We couldn't send the link. Check the address and try again.",
        )
        return
      }
      setSent(true)
    })
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 items-center justify-center py-16 sm:py-24">
        <Card className="w-full max-w-md p-8 sm:p-10">
          {sent ? (
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
                Check your email
              </h1>
              <p className="text-sm leading-relaxed text-secondary">
                We sent a sign-in link to{' '}
                <span className="font-mono text-text">{email.trim()}</span>.
                Open it on this device to finish signing in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false)
                  setError(null)
                }}
                className="mt-2 w-fit self-center text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
                  Sign in
                </h1>
                <p className="text-sm leading-relaxed text-secondary">
                  Enter your email and we&rsquo;ll send a magic link &mdash; no
                  password needed.
                </p>
              </div>

              <form onSubmit={sendLink} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium uppercase tracking-wide text-secondary"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@lab.org"
                    className="w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-base text-text placeholder:text-secondary transition-colors focus:border-accent"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-warning">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-accent px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? 'Sending link…' : 'Send magic link'}
                </button>
              </form>
            </div>
          )}
        </Card>
      </Container>
    </main>
  )
}
