export function DemoProjectStep() {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <p className="text-sm uppercase tracking-wide text-cyan-300">One-click demo</p>
      <h2 className="mt-1 text-xl font-semibold text-cyan-50">Generate a safe local demo project</h2>
      <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-sm text-cyan-100">npm run boardforge:demo</pre>
      <p className="mt-2 text-sm text-cyan-100">Supplier API keys are optional for the demo and remain honestly marked NOT_CHECKED.</p>
    </section>
  )
}
