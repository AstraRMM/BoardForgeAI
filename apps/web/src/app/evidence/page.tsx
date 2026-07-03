import { EvidenceDashboard } from '../../components/evidence/EvidenceDashboard'

export default function EvidencePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-emerald-300">Competitive evidence</p>
        <h1 className="mt-2 text-3xl font-semibold">BoardForge Evidence Dashboard</h1>
        <p className="mt-3 max-w-3xl text-slate-400">Proof cards for investors, engineers, and users. Supplier verification remains explicitly blocked until API keys exist.</p>
      </section>
      <section className="mx-auto mt-8 max-w-6xl"><EvidenceDashboard /></section>
    </main>
  )
}
