export function OneClickDemoButton() {
  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <h2 className="text-xl font-semibold text-emerald-50">One-click public demo mode</h2>
      <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-sm text-emerald-100">npm run boardforge:demo</pre>
      <p className="mt-2 text-sm text-emerald-100">Creates a safe local demo package with no supplier-stock claims.</p>
    </section>
  )
}
