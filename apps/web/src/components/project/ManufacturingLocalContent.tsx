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
  const ready = projects.filter((project) => project.manufacturing.ready)
  const blocked = projects.filter((project) => !project.manufacturing.ready)

  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {ready.length > 0 && <section className="bf-app-section">
      <h2>Manufacturing packages</h2>
      <div className="bf-app-stack">
        {ready.map((project) => <article key={project.projectId} className="bf-premium-panel">
          <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Release candidate</p><h3>{project.projectName}</h3></div><ManufacturingReadinessBadge state="PCB_FAB_READY" /></div>
          <p>Readiness: {humanize(project.readiness)}. Manufacturing evidence has passed the local release gate.</p>
          <p>Package path: {project.manufacturing.zip ? 'Recorded in the protected local workspace.' : 'No package path was returned by the local artifact.'}</p>
          <Link className="bf-workspace-link" href={`/projects/${encodeURIComponent(project.projectId)}`}>Open release evidence <ArrowUpRight size={15} /></Link>
        </article>)}
      </div>
    </section>}
    {blocked.length > 0 && <section className="bf-app-section">
      <h2>Blocked or review outputs</h2>
      <div className="bf-app-stack">
        {blocked.map((project) => <article key={project.projectId} className="bf-premium-panel">
          <div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Release locked</p><h3>{project.projectName}</h3></div><ManufacturingReadinessBadge state="BLOCKED" /></div>
          <p>Blocked: {humanize(project.manufacturing.blockedReason || 'validation not complete')}</p>
          {project.criticalBlockers.length > 0 && <ul className="bf-project-blockers">{project.criticalBlockers.map((blocker) => <li key={blocker.code}>{humanize(blocker.code)}: {blocker.count}</li>)}</ul>}
          <Link className="bf-workspace-link" href={`/projects/${encodeURIComponent(project.projectId)}`}>Review project evidence <ArrowUpRight size={15} /></Link>
        </article>)}
      </div>
    </section>}
    {state === 'empty' && <section className="bf-app-section"><div className="bf-premium-panel"><h2>No manufacturing artifacts yet</h2><p>Manufacturing packages appear here only after local validation writes release evidence for a project.</p><Link className="bf-workspace-link" href="/projects">Open project library <ArrowUpRight size={15} /></Link></div></section>}
    <section className="bf-app-section bf-readiness-vocabulary">
      <h2>Readiness vocabulary</h2>
      <div className="bf-readiness-grid">{readinessStates.map(([label, description]) => <div key={label}><strong>{label}</strong><span>{description}</span></div>)}</div>
    </section>
  </>
}

function humanize(value: string) {
  return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}
