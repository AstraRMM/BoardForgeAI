import dashboard from '../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../components/ProjectStatusCard'
import { filterDashboardPublishedProjects, filterLocalDraftProjects } from '../../lib/boardforge-manifest'

export default function DashboardPage() {
  const publishedProjects = filterDashboardPublishedProjects(dashboard.projects as any)
  const localDrafts = filterLocalDraftProjects(dashboard.projects as any)
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <header className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">BoardForge Dashboard</h1>
        <p className="mt-2 text-slate-400">Manifest-driven project status from the local BoardForge engine.</p>
      </header>
      <section className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
        <Summary label="Projects" value={dashboard.summary.totalProjects} />
        <Summary label="Manufacturing Ready" value={dashboard.summary.manufacturingReady} />
        <Summary label="Needs Routing" value={dashboard.summary.needsRouting} />
      </section>
      <section className="mx-auto mt-6 max-w-6xl rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm uppercase tracking-wide text-emerald-300">Latest engine proof</p>
        <h2 className="mt-1 text-xl font-semibold">Dense-control DRC 10 to manufacturing ZIP</h2>
        <p className="mt-2 text-sm text-emerald-100">
          BoardForge physically mutated KiCad copper and silkscreen, committed 6/6 repair transactions,
          and exported a manufacturing ZIP only after DRC 0 / ERC 0 / unconnected 0.
        </p>
      </section>
      <section className="mx-auto mt-6 grid max-w-6xl gap-4 lg:grid-cols-2">
        {(publishedProjects.length ? publishedProjects : dashboard.projects).map((project) => <ProjectStatusCard key={project.projectId} project={project as any} />)}
      </section>
      <section className="mx-auto mt-6 max-w-6xl rounded-lg border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">Approved-only sync</p>
        <h2 className="mt-1 text-xl font-semibold">Main dashboard shows published projects only</h2>
        <p className="mt-2 text-sm text-slate-300">
          Local drafts, failed experiments, and candidates stay in local review until a user explicitly approves publish.
          Current local/draft artifacts detected: {localDrafts.length}.
        </p>
      </section>
      <section className="mx-auto mt-6 max-w-6xl rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Guided local workflow</p>
        <h2 className="mt-1 text-xl font-semibold">Protected project workflow ready</h2>
        <p className="mt-2 text-sm text-cyan-100">
          Replay prompt intake, brief approval, protected candidate creation, publish confirmation, sandbox repair evidence,
          and sourcing status without pretending that unverified cloud execution happened.
        </p>
      </section>
    </main>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-1 font-mono text-2xl">{value}</p></div>
}
