'use client'

import { FormEvent, useState } from 'react'
import { authClient } from '../../lib/auth-client'

export function AuthForms({ mode }: { mode: 'login' | 'signup' }) {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || ''), password = String(form.get('password') || ''), name = String(form.get('name') || '')
    setBusy(true); setMessage(null)
    try {
      const result = mode === 'login' ? await authClient.signIn.email({ email, password, callbackURL: '/dashboard' }) : await authClient.signUp.email({ name, email, password, callbackURL: '/dashboard' })
      if (result.error) { setMessage(result.error.message || 'Authentication was not accepted.'); return }
      window.location.assign('/dashboard')
    } catch { setMessage('Sign-in is not configured yet. Complete the database and Better Auth setup first.') } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="mt-8 grid gap-4">
    {mode === 'signup' && <label className="grid gap-2 text-sm font-medium text-slate-200">Name<input required name="name" autoComplete="name" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400" /></label>}
    <label className="grid gap-2 text-sm font-medium text-slate-200">Email<input required name="email" type="email" autoComplete="email" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400" /></label>
    <label className="grid gap-2 text-sm font-medium text-slate-200">Password<input required minLength={8} name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400" /></label>
    {message && <p role="status" className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{message}</p>}
    <button disabled={busy} className="rounded-md bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
  </form>
}
