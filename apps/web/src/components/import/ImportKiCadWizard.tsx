export function ImportKiCadWizard() {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <p className="text-sm uppercase tracking-wide text-cyan-300">Import existing KiCad project</p>
      <h2 className="mt-1 text-xl font-semibold text-cyan-50">Sandbox copy first, source untouched always</h2>
      <ol className="mt-3 space-y-2 text-sm text-cyan-100">
        <li>1. Select project path.</li>
        <li>2. Hash source files.</li>
        <li>3. Copy to sandbox.</li>
        <li>4. Validate sandbox.</li>
        <li>5. Offer Make Manufacturable on sandbox only.</li>
      </ol>
      <p className="mt-3 text-sm text-cyan-100">Original project was not modified. BoardForge works on a sandbox copy.</p>
    </section>
  )
}
