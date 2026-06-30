import dashboard from '../../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../../components/ProjectStatusCard'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = dashboard.projects.find((item) => item.projectId === params.id) || dashboard.projects[0]
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <ProjectStatusCard project={project as any} />
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Reports</h2>
        <pre className="mt-3 overflow-auto text-xs text-slate-300">{JSON.stringify(project.reports, null, 2)}</pre>
      </section>
    </main>
  )
}
