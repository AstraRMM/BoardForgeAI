import Link from 'next/link'
import { getAuthEnvironment } from '../../../apps/web/src/lib/auth'

export default function PluginSettingsPage() {
  const auth = getAuthEnvironment()
  return <main className="min-h-screen bg-[#050a12] px-6 py-12 text-slate-100"><section className="mx-auto max-w-3xl"><Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← Workspace</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">Codex plugin</p><h1 className="mt-2 text-4xl font-semibold">Pair your local BoardForge engine.</h1><p className="mt-4 max-w-2xl leading-7 text-slate-400">Pairing creates a short-lived one-time code. The local engine receives a revocable device token; browser sessions and supplier credentials never leave their respective environments.</p><div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold">Pairing availability</h2><p className="mt-2 text-sm text-slate-400">{auth.ready ? 'Sign in to generate a pairing code and manage trusted devices.' : `Complete authentication configuration first: ${auth.missing.join(', ')}.`}</p><Link href={auth.ready ? '/plugin/connect' : '/setup'} className="mt-5 inline-block rounded-md bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">{auth.ready ? 'Generate pairing code' : 'Open setup'}</Link></div></section></main>
}
