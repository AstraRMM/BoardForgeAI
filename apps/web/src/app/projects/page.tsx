import dashboard from '../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../components/ProjectStatusCard'
import { filterDashboardPublishedProjects, filterLocalDraftProjects } from '../../lib/boardforge-manifest'

export default function ProjectsPage() {
  const publishedProjects = filterDashboardPublishedProjects(dashboard.projects as any)
  const localDrafts = filterLocalDraftProjects(dashboard.projects as any)
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Projects</h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        These cards are generated from BoardForge project manifests. Actions are local-only; use the replay command with the BoardForge CLI.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(publishedProjects.length ? publishedProjects : dashboard.projects).map((project) => <ProjectStatusCard key={project.projectId} project={project as any} />)}
      </div>
      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Local drafts and candidates</h2>
        <p className="mt-2 text-sm text-slate-400">These stay out of the main dashboard until the user approves publishing.</p>
        <p className="mt-3 font-mono text-sm text-slate-300">{localDrafts.length} local-only project artifacts detected in the sample manifest.</p>
      </section>
    </main>
  )
}
