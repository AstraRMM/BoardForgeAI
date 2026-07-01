import dashboard from '../../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../../components/ProjectStatusCard'
import { EngineStatusPanel } from '../../../components/project/EngineStatusPanel'
import { getBoardForgeEngineStatus } from '../../../lib/boardforge-engine-status'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = dashboard.projects.find((item) => item.projectId === params.id) || dashboard.projects[0]
  const engineStatus = getBoardForgeEngineStatus(params.id)
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <ProjectStatusCard project={project as any} />
      <EngineStatusPanel status={engineStatus} />
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Reports</h2>
        <pre className="mt-3 overflow-auto text-xs text-slate-300">{JSON.stringify(project.reports, null, 2)}</pre>
      </section>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Local Replay</h2>
        <p className="mt-2 text-sm text-slate-400">Run locally with BoardForge CLI. The web app does not fake cloud execution.</p>
        <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">{project.replayCommand || 'No replay command available'}</pre>
      </section>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Manufacturing Download</h2>
        <p className="mt-2 text-sm text-slate-300">{project.manufacturing.zip || project.manufacturing.blockedReason || 'No manufacturing package yet'}</p>
      </section>
    </main>
  )
}
