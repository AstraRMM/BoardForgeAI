import { AppShell } from '../../components/app/AppShell'
import { ProjectsLocalContent } from '../../components/project/ProjectsLocalContent'

export const dynamic = 'force-dynamic'

export default function ProjectsPage() {
  return <AppShell title="Projects" subtitle="Browser-saved drafts and paired local project manifests, with approval-gated publishing."><div className="bf-app-page">
    <section className="bf-app-hero">
      <span className="bf-kicker">Project library</span>
      <h1>Evidence-backed KiCad project library.</h1>
      <p>BoardForge merges projects saved in this browser with canonical manifests discovered by the paired helper. Browser drafts remain clearly unvalidated; no sample boards are added to this library.</p>
    </section>
    <ProjectsLocalContent />
  </div></AppShell>
}
