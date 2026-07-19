import { AppShell } from '../../components/app/AppShell'
import { ProjectsLocalContent } from '../../components/project/ProjectsLocalContent'

export const dynamic = 'force-dynamic'

export default function ProjectsPage() {
  return <AppShell title="Projects" subtitle="Local project manifests with approval-gated publishing."><div className="bf-app-page">
    <section className="bf-app-hero">
      <span className="bf-kicker">Project library</span>
      <h1>Evidence-backed KiCad project library.</h1>
      <p>BoardForge reads validation, routing, sourcing, export readiness, and publish state from your local project artifacts. It never fills this library with sample boards.</p>
    </section>
    <ProjectsLocalContent />
  </div></AppShell>
}
