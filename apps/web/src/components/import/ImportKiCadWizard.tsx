import Link from 'next/link'

export function ImportKiCadWizard() {
  return (
    <section className="bf-premium-panel" aria-labelledby="import-launch-state">
      <p className="bf-kicker">Desktop action required</p>
      <h2 id="import-launch-state" className="mt-3 text-xl font-semibold text-slate-100">Sandbox import is not available from this browser session</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        The browser has no project-path permission and the paired local engine does not expose an import launch endpoint.
        Consequently, no source hash, sandbox copy, validation result, or Make Manufacturable action exists yet.
      </p>
      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-950 p-3 text-slate-300"><strong className="block text-slate-100">1. Choose locally</strong><span className="mt-1 block">Select the source project through the desktop workflow.</span></div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3 text-slate-300"><strong className="block text-slate-100">2. Copy and hash</strong><span className="mt-1 block">The local engine creates a sandbox copy and records source hashes.</span></div>
        <div className="rounded border border-slate-800 bg-slate-950 p-3 text-slate-300"><strong className="block text-slate-100">3. Inspect evidence</strong><span className="mt-1 block">Review only the resulting local evidence before approving any repair.</span></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/settings/plugin" className="bf-panel-action">Review desktop pairing</Link>
        <Link href="/upload-kicad" className="bf-panel-action">Open KiCad inspection</Link>
      </div>
    </section>
  )
}
