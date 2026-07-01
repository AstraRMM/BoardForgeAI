import dashboard from '../../sample-manifests/project-dashboard.json'

export default function DownloadsPage() {
  const ready = dashboard.projects.filter((project) => project.manufacturing.ready)
  const blocked = dashboard.projects.filter((project) => !project.manufacturing.ready)
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <p className="mt-2 max-w-3xl text-slate-400">Only validation-backed manufacturing outputs are listed as ready. Blocked projects keep their reports visible but do not pretend to have shippable ZIPs.</p>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Manufacturing Packages</h2>
        <div className="mt-4 space-y-3">
        {ready.map((project) => (
          <div key={project.projectId} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{project.projectName}</p>
            <p className="mt-1 text-sm text-slate-400">Readiness: {project.readiness}</p>
            <p className="mt-1 text-sm text-slate-400">Manufacturing ZIP: {project.manufacturing.zip || 'not exported'}</p>
            <p className="text-sm text-slate-400">BOM/CPL/Gerber/Drill: gated by local manufacturing validator</p>
            <p className="text-sm text-slate-400">User report: {project.reports?.status || project.reports?.routeability || 'not written'}</p>
            <p className="mt-2 font-mono text-xs text-slate-500">{project.replayCommand || 'No replay command'}</p>
          </div>
        ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Blocked / Review Outputs</h2>
        <div className="mt-4 space-y-3">
          {blocked.map((project) => (
            <div key={project.projectId} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-semibold">{project.projectName}</p>
              <p className="mt-1 text-sm text-amber-100">Blocked: {project.manufacturing.blockedReason || 'validation not complete'}</p>
              <pre className="mt-2 overflow-auto text-xs text-amber-100">{JSON.stringify(project.criticalBlockers || [], null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
