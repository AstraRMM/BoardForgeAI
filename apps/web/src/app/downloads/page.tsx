import dashboard from '../../sample-manifests/project-dashboard.json'

export default function DownloadsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <div className="mt-6 space-y-3">
        {dashboard.projects.map((project) => (
          <div key={project.projectId} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{project.projectName}</p>
            <p className="mt-1 text-sm text-slate-400">Manufacturing ZIP: {project.manufacturing.zip || 'not exported'}</p>
            <p className="text-sm text-slate-400">User report: {project.reports?.status || project.reports?.routeability || 'not written'}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
