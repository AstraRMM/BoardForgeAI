import Link from 'next/link'
import { AuthForms } from '../../apps/web/src/components/auth/AuthForms'
import { getAuthEnvironment } from '../../apps/web/src/lib/auth'

export default function SignupPage() {
  const auth = getAuthEnvironment()
  return <main className="min-h-screen bg-[#020816] px-6 py-16 text-slate-100"><section className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl shadow-cyan-950/30"><Link href="/" className="text-sm font-semibold text-cyan-300">BoardForge AI</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Tester access</p><h1 className="mt-3 text-3xl font-semibold">Create your BoardForge account.</h1>{auth.ready ? <AuthForms mode="signup" /> : <p className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Account registration is unavailable until the secure authentication environment is configured. Missing: {auth.missing.join(', ')}.</p>}<p className="mt-5 text-sm text-slate-400">Already have an account? <Link href="/login" className="font-semibold text-cyan-300">Sign in</Link></p></section></main>
}
