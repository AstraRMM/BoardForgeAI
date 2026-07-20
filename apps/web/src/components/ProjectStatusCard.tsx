import type { BoardForgeDashboardCard } from '../lib/boardforge-manifest'
import { normalizePublishState } from '../lib/boardforge-manifest'

export function ProjectStatusCard({ project }: { project: BoardForgeDashboardCard }) {
  const publish = normalizePublishState(project)
  const manufacturingStatus = project.manufacturing.ready
    ? 'Manufacturing evidence ready'
    : humanize(project.manufacturing.blockedReason || 'Blocked pending engineering review')
  const packageStatus = project.manufacturing.zip ? 'Package evidence recorded' : 'Package not exported'
  const publishStatus = publish.dashboardVisible ? 'Published to dashboard' : 'Local review only'
  const syncStatus = humanize(publish.syncStatus || 'Waiting for review')
  const nextAction = humanize(project.nextAction || 'Engineering review')
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
        <p>Manufacturing: {manufacturingStatus}</p>
        <p>Package: {packageStatus}</p>
        <p>Sourcing: {humanize(project.validation.schematicGraphStatus || 'Evidence required')}</p>
        <p>Publish: {publishStatus}</p>
        <p>Sync: {syncStatus}</p>
        <p>Next: {nextAction}</p>
        {project.artifacts?.preview3d?.available && <p>3D render: helper artifact recorded ({project.artifacts.preview3d.mimeType})</p>}
        {project.criticalBlockers.length > 0 && (
          <ul className="bf-project-blockers">
            {project.criticalBlockers.map((blocker) => (
              <li key={blocker.code}>{humanize(blocker.code)}: {blocker.count}</li>
            ))}
          </ul>
        )}
        <p className="bf-project-command">Re-run available from the protected local workflow.</p>
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

function humanize(value: string) {
  return value
    .replace(/[A-Z]:\\[^ ]+/g, 'local project workspace')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
