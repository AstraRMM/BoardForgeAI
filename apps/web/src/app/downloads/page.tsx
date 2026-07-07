import dashboard from '../../sample-manifests/project-dashboard.json'
import { ManufacturingReadinessBadge, SourcingStatusBadge } from '../../components/project/StatusBadges'

export default function DownloadsPage() {
  const ready = dashboard.projects.filter((project) => project.manufacturing.ready)
  const blocked = dashboard.projects.filter((project) => !project.manufacturing.ready)
  const readinessStates = [
    ['Fab package ready', 'DRC/ERC/connectivity and manufacturing files are present.'],
    ['Assembly review required', 'BOM/CPL may exist, but sourcing or placement evidence still needs review.'],
    ['Assembly evidence verified', 'Supplier and placement evidence are available for review.'],
    ['Blocked by DRC', 'The package cannot be released until design-rule errors are resolved.'],
    ['Blocked by ERC', 'The package cannot be released until schematic electrical errors are resolved.'],
    ['Blocked by connectivity', 'Unconnected items remain and require repair or approval.'],
    ['Blocked by sourcing', 'Supplier data is missing, unavailable, or lifecycle-risky.'],
    ['Compliance review required', 'External safety, PoE, RF, or certification review is still required.'],
  ]
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <p className="mt-2 max-w-3xl text-slate-400">Only validation-backed manufacturing outputs are listed as ready. Blocked projects keep their reports visible but do not pretend to have shippable ZIPs.</p>
      <p className="mt-2 max-w-3xl text-cyan-300">Local engine artifact downloads include Gerbers, drill files, BOM, CPL, reports, preview SVG/JSON, and JLCPCB ZIP only after strict gates pass.</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Manufacturing Packages</h2>
        <div className="mt-4 space-y-3">
        {ready.map((project) => (
          <div key={project.projectId} className="bf-premium-panel">
            <p className="font-semibold">{project.projectName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ManufacturingReadinessBadge state="PCB_FAB_READY" />
              <SourcingStatusBadge state="NOT_CHECKED" />
            </div>
            <p className="mt-1 text-sm text-slate-400">Readiness: {humanize(project.readiness)}</p>
            <p className="mt-1 text-sm text-slate-400">Package: Evidence recorded in the protected local workspace.</p>
            <p className="text-sm text-slate-400">Gerbers, drill, BOM, CPL, reports, and package archives stay gated by local manufacturing validation.</p>
            <p className="text-sm text-slate-400">Assembly readiness requires supplier and placement evidence before claims are shown.</p>
            <p className="text-sm text-slate-400">User report: {humanize(project.reports?.status || project.reports?.routeability || 'report pending')}</p>
          </div>
        ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Blocked / Review Outputs</h2>
        <div className="mt-4 space-y-3">
          {blocked.map((project) => (
            <div key={project.projectId} className="bf-premium-panel">
              <p className="font-semibold">{project.projectName}</p>
              <p className="mt-1 text-sm text-amber-100">Blocked: {humanize(project.manufacturing.blockedReason || 'validation not complete')}</p>
              <p className="mt-1 text-sm text-amber-100">Release stays locked until DRC, ERC, connectivity, sourcing, and compliance blockers are resolved.</p>
              {project.criticalBlockers?.length > 0 && (
                <ul className="bf-project-blockers">
                  {project.criticalBlockers.map((blocker) => <li key={blocker.code}>{humanize(blocker.code)}: {blocker.count}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Readiness State Vocabulary</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {readinessStates.map(([state, description]) => (
            <div key={state} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
              <strong className="block text-slate-100">{state}</strong>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function humanize(value: string) {
  return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}
