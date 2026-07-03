import { demoJobStatus, localJobRoutes } from '../../lib/boardforge-job-client'

export function JobStatusPanel() {
  const job = demoJobStatus()
  return (
    <section className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-indigo-100">Local Job Queue</h2>
          <p className="mt-1 text-sm text-indigo-100/80">Actions start localhost jobs and poll status. This is local engine artifact state, not cloud execution.</p>
        </div>
        <span className="rounded border border-indigo-300/50 px-2 py-1 text-xs font-semibold text-indigo-100">{job.status} · {job.progress}%</span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-indigo-100 md:grid-cols-2">
        {Object.entries(localJobRoutes).map(([name, route]) => (
          <div key={name} className="rounded bg-slate-950/40 px-2 py-1 font-mono">{name}: {route}</div>
        ))}
      </div>
    </section>
  )
}
