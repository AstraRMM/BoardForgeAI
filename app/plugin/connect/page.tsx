import Link from 'next/link'
import { getAuthEnvironment } from '../../../apps/web/src/lib/auth'

export default function PluginConnectPage() {
  const auth = getAuthEnvironment()
  return <main className="min-h-screen bg-[#050a12] px-6 py-12 text-slate-100"><section className="mx-auto max-w-3xl"><Link href="/settings/plugin" className="text-sm font-semibold text-cyan-300">← Plugin settings</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">Device pairing</p><h1 className="mt-2 text-4xl font-semibold">Connect Codex to this workspace.</h1>{auth.ready ? <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-slate-300">After signing in, generate a one-time code and run:</p><pre className="mt-4 overflow-auto rounded bg-slate-950 p-4 text-sm text-cyan-200">boardforge auth pair --code BF-XXXX-XXXX-XXXX</pre><p className="mt-4 text-sm leading-6 text-slate-400">The code expires after ten minutes, is accepted only once, and is stored server-side only as a hash.</p></div> : <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">Pairing is unavailable until account services are configured. Missing: {auth.missing.join(', ')}.</div>}</section></main>
}
