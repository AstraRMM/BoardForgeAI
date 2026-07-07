import dashboard from '../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../components/ProjectStatusCard'
import { filterDashboardPublishedProjects, filterLocalDraftProjects } from '../../lib/boardforge-manifest'

export default function ProjectsPage() {
  const publishedProjects = filterDashboardPublishedProjects(dashboard.projects as any)
  const localDrafts = filterLocalDraftProjects(dashboard.projects as any)
  const projects = publishedProjects.length ? publishedProjects : dashboard.projects

  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Projects dashboard</span>
        <h1>Evidence-backed KiCad project library.</h1>
        <p>
          BoardForge project cards summarize validation, routing, sourcing, export readiness, and publish status from project manifests. Actions remain local-first and review-gated.
        </p>
      </section>
      <section className="bf-project-grid">
        {projects.map((project) => <ProjectStatusCard key={project.projectId} project={project as any} />)}
      </section>
      <section className="bf-app-section">
        <div className="bf-premium-panel">
          <h2>Local drafts and candidates</h2>
          <p>Drafts stay out of the main public dashboard until the user approves publishing.</p>
          <span className="bf-mini-badge">{localDrafts.length} local-only candidates awaiting approval</span>
        </div>
      </section>
    </main>
  )
}
