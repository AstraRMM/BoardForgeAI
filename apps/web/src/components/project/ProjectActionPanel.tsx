import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

const actions = [
  { label: 'Validate', route: 'POST /jobs/start type=validate', implemented: true },
  { label: 'Route', route: 'POST /jobs/start type=route', implemented: true },
  { label: 'Repair', route: 'POST /jobs/start type=repair', implemented: true },
  { label: 'Export Manufacturing', route: 'POST /jobs/start type=export', implemented: true },
  { label: 'Run Board Review', route: 'POST /jobs/start type=run_board_review', implemented: true },
  { label: 'Run Health Score', route: 'POST /jobs/start type=health', implemented: true },
  { label: 'Run Manufacturability Risk', route: 'POST /jobs/start type=risk', implemented: true },
  { label: 'Run Routeability Explanation', route: 'POST /jobs/start type=routeability', implemented: true },
  { label: 'Generate Board Diff', route: 'POST /jobs/start type=diff', implemented: true },
  { label: 'Generate Preview', route: 'POST /jobs/start type=generate_preview', implemented: true },
  { label: 'Applied Lessons', route: 'POST /jobs/start type=lessons', implemented: true },
  { label: 'Generate Blocker Report', route: 'POST /jobs/start type=blockers', implemented: true },
  { label: 'Refresh Project Status', route: 'GET /project/:id/status', implemented: true },
  { label: 'Publish', route: 'POST /project/:id/publish confirm=true', implemented: true },
  { label: 'Archive', route: 'POST /project/:id/archive', implemented: true },
  { label: 'Keep Local', route: 'POST /project/:id/keep-local', implemented: true },
]

export function ProjectActionPanel() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm uppercase tracking-wide text-cyan-300">Local service actions</p>
      <p className="mt-2 text-sm text-slate-400">These live website actions start jobs through the installed local BoardForge engine bridge. Publish requires explicit confirmation.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {actions.map((action) => (
          <div key={action.route} className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-sm font-medium text-slate-100">{action.label}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">{action.route}</p>
            <p className="mt-1 text-xs text-emerald-300">{action.implemented ? 'job-backed local route wired' : 'coming soon'}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-amber-200">{localArtifactApiContract.offlineMessage}</p>
    </section>
  )
}
