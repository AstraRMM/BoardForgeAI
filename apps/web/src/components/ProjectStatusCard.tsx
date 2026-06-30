import type { BoardForgeDashboardCard } from '../lib/boardforge-manifest'

export function ProjectStatusCard({ project }: { project: BoardForgeDashboardCard }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{project.projectName}</h3>
          <p className="text-sm text-slate-400">{project.projectId}</p>
        </div>
        <span className={badgeClass(project.readiness)}>{project.readiness}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="DRC" value={project.validation.drcViolations ?? 0} />
        <Metric label="ERC" value={project.validation.ercViolations ?? 0} />
        <Metric label="Unconnected" value={project.validation.unconnected ?? 0} />
        <Metric label="Routed" value={`${project.routingCompletionPercent}%`} />
      </dl>
      <div className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-300">
        <p>Manufacturing: {project.manufacturing.ready ? 'ready' : project.manufacturing.blockedReason || 'blocked'}</p>
        <p>Sourcing: {project.validation.schematicGraphStatus || 'manifest evidence required'}</p>
        <p className="mt-2 font-mono text-xs text-slate-400">{project.replayCommand || 'No replay command written'}</p>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-base">{value}</dd>
    </div>
  )
}

function badgeClass(readiness: string) {
  if (readiness === 'ready') return 'rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300'
  if (readiness === 'review') return 'rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-300'
  return 'rounded-md bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300'
}
