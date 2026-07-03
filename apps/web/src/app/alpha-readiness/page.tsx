export default function AlphaReadinessPage() {
  const categories = ['engine readiness', 'web UX readiness', 'local engine pairing/security', 'launcher readiness', 'KiCad plugin readiness', 'CLI readiness', 'demo readiness', 'manufacturing export readiness', 'source protection readiness', 'documentation readiness']
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-amber-300">Public alpha launch gate</p>
        <h1 className="mt-2 text-3xl font-semibold">Ready for public alpha with limitations</h1>
        <p className="mt-3 max-w-3xl text-slate-400">BoardForge can be public-alpha ready only with external blockers disclosed: supplier API keys, PoE compliance review, and installer signing.</p>
      </section>
      <section className="mx-auto mt-8 grid max-w-6xl gap-3 md:grid-cols-2">
        {categories.map((category) => <div key={category} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">{category}: evidence-backed</div>)}
      </section>
    </main>
  )
}
