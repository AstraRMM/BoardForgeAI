import Link from 'next/link'
import { getAuthEnvironment } from '../../apps/web/src/lib/auth'

export const dynamic = 'force-dynamic'

export default function SetupPage() {
  const auth = getAuthEnvironment()
  return <main className="min-h-screen bg-[#050a12] px-6 py-12 text-slate-100"><section className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-semibold text-cyan-300">BoardForge AI</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">Tester setup</p><h1 className="mt-2 text-4xl font-semibold">Prepare a secure BoardForge test environment.</h1><div className="mt-8 grid gap-4"><SetupItem title="Postgres / Neon database" detail="Required for Better Auth users, sessions, pairing codes, device registrations, and revocation records." ready={auth.ready || !auth.missing.includes('DATABASE_URL')} /><SetupItem title="Better Auth environment" detail={auth.ready ? 'Configured.' : `Missing: ${auth.missing.join(', ')}.`} ready={auth.ready} /><SetupItem title="Database migration" detail="Run npx auth@latest migrate only after DATABASE_URL and Better Auth environment variables are set." ready={false} /><SetupItem title="Local engine" detail="Install BoardForge locally, then pair it from Plugin settings. It retains its opaque device token under .boardforge." ready={false} /></div></section></main>
}
function SetupItem({ title, detail, ready }: { title: string; detail: string; ready: boolean }) { return <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-5"><p className={ready ? 'text-sm font-semibold text-emerald-300' : 'text-sm font-semibold text-amber-200'}>{ready ? 'Configured' : 'Action required'}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p></article> }
