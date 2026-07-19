'use client'

import Link from 'next/link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

export function EvidenceLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {projects.length > 0 && <section className="bf-proof-grid">{projects.map((project) => <article key={project.projectId} className="bf-proof-card"><span>{project.manufacturing.ready ? 'release evidence recorded' : 'review evidence required'}</span><h3>{project.projectName}</h3><p>DRC: {project.validation.drcViolations}; ERC: {project.validation.ercViolations}; unconnected: {project.validation.unconnected}; routing: {project.routingCompletionPercent}%.</p><small>{project.manufacturing.ready ? 'Manufacturing evidence is recorded in the protected local workspace.' : `Next action: ${humanize(project.nextAction)}.`}</small><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Open project evidence <ArrowUpRight size={14} /></Link></article>)}</section>}
    {state === 'empty' && <section className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Evidence registry</p><h2>No local project evidence yet</h2></div><ShieldCheck size={20} /></div><p className="bf-project-workspace-note">Evidence appears only after a local project writes canonical BoardForge artifacts. Create a board brief or import a KiCad project to begin.</p><Link className="bf-panel-action" href="/new-board">Create board brief <ArrowUpRight size={15} /></Link></section>}
  </>
}

function humanize(value: string) { return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
