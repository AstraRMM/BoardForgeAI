import type { BoardForgeDashboardCard } from '../lib/boardforge-manifest'
import { normalizePublishState } from '../lib/boardforge-manifest'

export function ProjectStatusCard({ project }: { project: BoardForgeDashboardCard }) {
  const publish = normalizePublishState(project)
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
        <Metric label="Routeability" value={project.routeabilityScore ?? 'n/a'} />
        <Metric label="Forbidden vias" value={project.validation.forbiddenVias ?? 0} />
      </dl>
      <div className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-300">
        <p>Manufacturing: {project.manufacturing.ready ? 'ready' : project.manufacturing.blockedReason || 'blocked'}</p>
        <p>ZIP: {project.manufacturing.zip || 'not exported'}</p>
        <p>Sourcing: {project.validation.schematicGraphStatus || 'manifest evidence required'}</p>
        <p>Publish: {publish.projectState} / {publish.dashboardVisible ? 'dashboard visible' : 'local only'}</p>
        <p>Sync: {publish.syncStatus}</p>
        <p>Next: {project.nextAction}</p>
        {project.criticalBlockers.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-red-300">
            {project.criticalBlockers.map((blocker) => (
              <li key={blocker.code}>{blocker.code}: {blocker.count}</li>
            ))}
          </ul>
        )}
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
