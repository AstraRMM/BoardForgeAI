import dashboard from '../../sample-manifests/project-dashboard.json'
import { ManufacturingReadinessBadge, SourcingStatusBadge } from '../../components/project/StatusBadges'

export default function DownloadsPage() {
  const ready = dashboard.projects.filter((project) => project.manufacturing.ready)
  const blocked = dashboard.projects.filter((project) => !project.manufacturing.ready)
  const readinessStates = ['PCB_FAB_READY', 'ASSEMBLY_READY_NOT_VERIFIED', 'ASSEMBLY_READY_VERIFIED', 'BLOCKED_DRC', 'BLOCKED_ERC', 'BLOCKED_UNCONNECTED', 'BLOCKED_SOURCING', 'BLOCKED_COMPLIANCE_REVIEW']
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <p className="mt-2 max-w-3xl text-slate-400">Only validation-backed manufacturing outputs are listed as ready. Blocked projects keep their reports visible but do not pretend to have shippable ZIPs.</p>
      <p className="mt-2 max-w-3xl text-cyan-300">Local engine artifact downloads include Gerbers, drill files, BOM, CPL, reports, preview SVG/JSON, and JLCPCB ZIP only after strict gates pass.</p>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Manufacturing Packages</h2>
        <div className="mt-4 space-y-3">
        {ready.map((project) => (
          <div key={project.projectId} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{project.projectName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ManufacturingReadinessBadge state="PCB_FAB_READY" />
              <SourcingStatusBadge state="NOT_CHECKED" />
            </div>
            <p className="mt-1 text-sm text-slate-400">Readiness: {project.readiness}</p>
            <p className="mt-1 text-sm text-slate-400">Manufacturing ZIP: {project.manufacturing.zip || 'not exported'}</p>
            <p className="text-sm text-slate-400">Gerbers / drill / BOM / CPL / JLCPCB ZIP: gated by local manufacturing validator</p>
            <p className="text-sm text-slate-400">PCB fab readiness: PCB_FAB_READY when DRC/ERC/connectivity/manufacturing files pass</p>
            <p className="text-sm text-slate-400">Assembly readiness: ASSEMBLY_READY_NOT_VERIFIED until sourcing/provider APIs verify stock and placement availability</p>
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
              <p className="mt-1 text-sm text-amber-100">Blocked states: BLOCKED_DRC / BLOCKED_ERC / BLOCKED_UNCONNECTED / BLOCKED_SOURCING / BLOCKED_COMPLIANCE_REVIEW</p>
              <pre className="mt-2 overflow-auto text-xs text-amber-100">{JSON.stringify(project.criticalBlockers || [], null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Readiness State Vocabulary</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {readinessStates.map((state) => <div key={state} className="rounded border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-slate-300">{state}</div>)}
        </div>
      </section>
    </main>
  )
}
