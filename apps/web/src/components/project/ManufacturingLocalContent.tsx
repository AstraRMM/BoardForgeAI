'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ManufacturingReadinessBadge } from './StatusBadges'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

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

export function ManufacturingLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  const released = projects.filter((project) => project.manufacturing.ready && Boolean(project.manufacturing.zip))
  const recordedButUnreleased = projects.filter((project) => !project.manufacturing.ready && Boolean(project.manufacturing.zip))
  const awaitingPackage = projects.filter((project) => !project.manufacturing.zip)

  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {released.length > 0 && <section className="bf-app-section">
      <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Release evidence</p><h2>Released manufacturing packages</h2><p>Each release below has a recorded package and a passed manufacturing-ready state.</p></div></div>
      <div className="bf-app-stack">
        {released.map((project) => <article key={project.projectId} className="bf-premium-panel">
          <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Release candidate</p><h3>{project.projectName}</h3></div><ManufacturingReadinessBadge state="PCB_FAB_READY" /></div>
          <p>Readiness: {humanize(project.readiness)}. A package location is recorded in the paired project artifact.</p>
          <p>Browser download remains unavailable until the local helper exposes an explicit artifact-transfer route.</p>
          <Link className="bf-workspace-link" href={`/projects/${encodeURIComponent(project.projectId)}`}>Open release evidence <ArrowUpRight size={15} /></Link>
        </article>)}
      </div>
    </section>}
    {recordedButUnreleased.length > 0 && <section className="bf-app-section">
      <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Release blocked</p><h2>Packages requiring review</h2><p>A package path alone is not a release. These projects retain their recorded artifact while the engineering gate remains incomplete.</p></div></div>
      <div className="bf-app-stack">
        {recordedButUnreleased.map((project) => <article key={project.projectId} className="bf-premium-panel">
          <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Package recorded, not released</p><h3>{project.projectName}</h3></div><ManufacturingReadinessBadge state="REVIEW" /></div>
          <p>Release is not approved: {humanize(project.manufacturing.blockedReason || project.nextAction || 'engineering review is incomplete')}.</p>
          {project.criticalBlockers.length > 0 && <ul className="bf-project-blockers">{project.criticalBlockers.map((blocker) => <li key={blocker.code}>{humanize(blocker.code)}: {blocker.count}</li>)}</ul>}
          <Link className="bf-workspace-link" href={`/projects/${encodeURIComponent(project.projectId)}`}>Review release blockers <ArrowUpRight size={15} /></Link>
        </article>)}
      </div>
    </section>}
    {awaitingPackage.length > 0 && <section className="bf-app-section">
      <h2>Projects without a manufacturing package</h2>
      <div className="bf-app-stack">
        {awaitingPackage.map((project) => <article key={project.projectId} className="bf-premium-panel">
          <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Package not recorded</p><h3>{project.projectName}</h3></div><ManufacturingReadinessBadge state={project.manufacturing.ready ? 'REVIEW' : project.status.startsWith('BROWSER_') ? 'NOT_CHECKED' : 'BLOCKED'} /></div>
          <p>{project.manufacturing.ready ? 'The release state is recorded, but no package location is available to this browser.' : project.status.startsWith('BROWSER_') ? 'Browser draft only. No Gerbers, drills, BOM, CPL, package, or manufacturing validation has been recorded.' : `Not eligible for release: ${humanize(project.manufacturing.blockedReason || 'validation not complete')}.`}</p>
          {project.criticalBlockers.length > 0 && <ul className="bf-project-blockers">{project.criticalBlockers.map((blocker) => <li key={blocker.code}>{humanize(blocker.code)}: {blocker.count}</li>)}</ul>}
          <div className="bf-workspace-actions"><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Review project evidence <ArrowUpRight size={15} /></Link>{project.status.startsWith('BROWSER_') && <Link className="is-secondary" href="/settings/plugin">Pair for KiCad validation</Link>}</div>
        </article>)}
      </div>
    </section>}
    {state === 'empty' && <section className="bf-app-section"><div className="bf-premium-panel"><h2>No manufacturing packages recorded</h2><p>Browser projects do not imply Gerbers, drills, BOM, CPL, or ZIP files. Those artifacts appear here only after a local workflow records them.</p><Link className="bf-workspace-link" href="/projects">Open project library <ArrowUpRight size={15} /></Link></div></section>}
    <section className="bf-app-section bf-readiness-vocabulary">
      <h2>Readiness vocabulary</h2>
      <div className="bf-readiness-grid">{readinessStates.map(([label, description]) => <div key={label}><strong>{label}</strong><span>{description}</span></div>)}</div>
    </section>
  </>
}

function humanize(value: string) {
  return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}
