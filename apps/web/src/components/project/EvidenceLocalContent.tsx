'use client'

import Link from 'next/link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

export function EvidenceLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  const recorded = projects.filter((project) => hasRecordedEvidence(project))
  const awaiting = projects.filter((project) => !hasRecordedEvidence(project))
  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {recorded.length > 0 && <section className="bf-app-section"><div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Recorded evidence</p><h2>Observed project results</h2></div></div><div className="bf-proof-grid">{recorded.map((project) => <article key={project.projectId} className="bf-proof-card"><span>{project.manufacturing.ready ? 'release state recorded' : 'engineering evidence recorded'}</span><h3>{project.projectName}</h3><p>DRC: {display(project.validation.drcViolations)}; ERC: {display(project.validation.ercViolations)}; unconnected: {display(project.validation.unconnected)}; routing: {project.routingCompletionPercent}%.</p><small>{reportCount(project)} report artifact{reportCount(project) === 1 ? '' : 's'} recorded. {project.manufacturing.zip ? 'A manufacturing package location is recorded.' : 'No manufacturing package location is recorded.'}</small><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Open project evidence <ArrowUpRight size={14} /></Link></article>)}</div></section>}
    {awaiting.length > 0 && <section className="bf-app-section"><div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Evidence pending</p><h2>Browser projects awaiting validation</h2></div></div><div className="bf-proof-grid">{awaiting.map((project) => <article key={project.projectId} className="bf-proof-card"><span>no KiCad evidence recorded</span><h3>{project.projectName}</h3><p>Validation has not been run. This browser-saved project is not represented as ERC, DRC, sourcing, or manufacturing evidence.</p><small>Next: {humanize(project.nextAction)}.</small><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Open project workspace <ArrowUpRight size={14} /></Link></article>)}</div></section>}
    {state === 'empty' && <section className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Evidence registry</p><h2>No saved project evidence yet</h2></div><ShieldCheck size={20} /></div><p className="bf-project-workspace-note">Browser drafts are not evidence. Evidence appears only after a local project writes validation or report artifacts.</p><Link className="bf-panel-action" href="/new-board">Create board brief <ArrowUpRight size={15} /></Link></section>}
  </>
}

function reportCount(project: { reports: Record<string, string> }) { return Object.keys(project.reports).filter((key) => key !== 'browserDraft').length }
function hasRecordedEvidence(project: { reports: Record<string, string>; validation: { drcViolations: number | null; ercViolations: number | null; unconnected: number | null } }) { return reportCount(project) > 0 || [project.validation.drcViolations, project.validation.ercViolations, project.validation.unconnected].some((value) => value !== null) }
function display(value: number | null) { return value ?? 'not run' }
function humanize(value: string) { return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
