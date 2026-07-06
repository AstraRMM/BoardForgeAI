import type { BoardForgeDashboardCard } from '../lib/boardforge-manifest'
import { normalizePublishState } from '../lib/boardforge-manifest'

export function ProjectStatusCard({ project }: { project: BoardForgeDashboardCard }) {
  const publish = normalizePublishState(project)
  return (
    <article className="bf-project-card">
      <div className="bf-project-card-head">
        <div>
          <h3>{project.projectName}</h3>
          <p>{project.projectId}</p>
        </div>
        <span className={badgeClass(project.readiness)}>{project.readiness}</span>
      </div>
      <dl className="bf-project-metrics">
        <Metric label="DRC" value={project.validation.drcViolations ?? 0} />
        <Metric label="ERC" value={project.validation.ercViolations ?? 0} />
        <Metric label="Unconnected" value={project.validation.unconnected ?? 0} />
        <Metric label="Routed" value={`${project.routingCompletionPercent}%`} />
        <Metric label="Routeability" value={project.routeabilityScore ?? 'n/a'} />
        <Metric label="Forbidden vias" value={project.validation.forbiddenVias ?? 0} />
      </dl>
      <div className="bf-project-evidence">
        <p>Manufacturing: {project.manufacturing.ready ? 'ready' : project.manufacturing.blockedReason || 'blocked'}</p>
        <p>ZIP: {project.manufacturing.zip || 'not exported'}</p>
        <p>Sourcing: {project.validation.schematicGraphStatus || 'manifest evidence required'}</p>
        <p>Publish: {publish.projectState} / {publish.dashboardVisible ? 'dashboard visible' : 'local only'}</p>
        <p>Sync: {publish.syncStatus}</p>
        <p>Next: {project.nextAction}</p>
        {project.criticalBlockers.length > 0 && (
          <ul className="bf-project-blockers">
            {project.criticalBlockers.map((blocker) => (
              <li key={blocker.code}>{blocker.code}: {blocker.count}</li>
            ))}
          </ul>
        )}
        <p className="bf-project-command">{project.replayCommand || 'No replay command written'}</p>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function badgeClass(readiness: string) {
  if (readiness === 'ready') return 'bf-project-badge ready'
  if (readiness === 'review') return 'bf-project-badge review'
  return 'bf-project-badge blocked'
}
