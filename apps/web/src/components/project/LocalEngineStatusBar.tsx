import { BOARDFORGE_LOCAL_ENGINE_URL, localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export function LocalEngineStatusBar() {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-cyan-300">BoardForge Local Engine</p>
          <p className="mt-1 text-sm text-cyan-100">Service endpoint: {BOARDFORGE_LOCAL_ENGINE_URL}</p>
          <p className="mt-1 text-xs text-slate-300">{localArtifactApiContract.offlineMessage}</p>
        </div>
        <code className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-300">npm run boardforge:local-server</code>
      </div>
    </section>
  )
}
