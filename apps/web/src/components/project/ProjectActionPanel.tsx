import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

const actions = [
  { label: 'Start intake', route: 'POST /intake/start', implemented: true },
  { label: 'Answer questions', route: 'POST /intake/answer', implemented: true },
  { label: 'Approve brief', route: 'POST /brief/approve', implemented: true },
  { label: 'Create project', route: 'POST /project/create', implemented: true },
  { label: 'Validate', route: 'POST /project/:id/validate', implemented: true },
  { label: 'Route', route: 'POST /project/:id/route', implemented: true },
  { label: 'Repair', route: 'POST /project/:id/repair', implemented: true },
  { label: 'Export', route: 'POST /project/:id/export', implemented: true },
  { label: 'Publish', route: 'POST /project/:id/publish with confirm=true', implemented: true },
]

export function ProjectActionPanel() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm uppercase tracking-wide text-cyan-300">Local service actions</p>
      <p className="mt-2 text-sm text-slate-400">These actions are backed by the BoardForge localhost service. Publish requires explicit confirmation.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {actions.map((action) => (
          <div key={action.route} className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-sm font-medium text-slate-100">{action.label}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">{action.route}</p>
            <p className="mt-1 text-xs text-emerald-300">{action.implemented ? 'local route wired' : 'coming soon'}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-amber-200">{localArtifactApiContract.offlineMessage}</p>
    </section>
  )
}
