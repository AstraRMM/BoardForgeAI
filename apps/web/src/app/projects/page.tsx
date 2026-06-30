import dashboard from '../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../components/ProjectStatusCard'

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Projects</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {dashboard.projects.map((project) => <ProjectStatusCard key={project.projectId} project={project as any} />)}
      </div>
    </main>
  )
}
