import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

const actions = [
  { label: 'Validate board', body: 'Run local ERC, DRC, outline, source-protection, and package-readiness checks.', implemented: true },
  { label: 'Route and review', body: 'Attempt routing, score routeability, and explain exact blockers if the board cannot be routed safely.', implemented: true },
  { label: 'Repair blockers', body: 'Use Make Manufacturable to plan safe fixes and keep unsafe changes gated for review.', implemented: true },
  { label: 'Export package', body: 'Prepare Gerbers, drill, BOM, CPL, reports, and download bundles only when evidence allows it.', implemented: true },
  { label: 'Source BOM', body: 'Use configured supplier data to check availability, alternates, lifecycle risk, and quote readiness.', implemented: true },
  { label: 'Publish safely', body: 'Require explicit approval, source protection, and evidence before a project leaves local review.', implemented: true },
]

export function ProjectActionPanel() {
  return (
    <section className="bf-local-workflow-panel">
      <p className="bf-local-workflow-kicker">Local engine workflow</p>
      <h2>Actions stay evidence-gated.</h2>
      <p className="bf-local-workflow-copy">
        These controls are designed to hand work to the installed BoardForge local engine without exposing raw service routes in the product UI.
        Publish and manufacturing actions stay blocked until the local evidence supports them.
      </p>
      <div className="bf-local-workflow-grid">
        {actions.map((action) => (
          <div key={action.label} className="bf-local-workflow-card">
            <p>{action.label}</p>
            <span>{action.body}</span>
            <strong>{action.implemented ? 'Local-engine backed' : 'Coming soon'}</strong>
          </div>
        ))}
      </div>
      <p className="bf-local-workflow-note">{localArtifactApiContract.offlineDisplayMessage}</p>
    </section>
  )
}
