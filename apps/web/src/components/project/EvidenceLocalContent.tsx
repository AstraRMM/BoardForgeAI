'use client'

import Link from 'next/link'
import { ArrowUpRight, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

export function EvidenceLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  const recorded = projects.filter((project) => hasRecordedEvidence(project))
  const awaiting = projects.filter((project) => !hasRecordedEvidence(project))
  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {recorded.length > 0 && <section className="bf-app-section"><div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Recorded evidence</p><h2>Observed project results</h2><p>These values come from the paired helper&apos;s project artifacts. They are not inferred from a browser draft.</p></div></div><div className="bf-proof-grid">{recorded.map((project) => <article key={project.projectId} className="bf-proof-card"><span>{evidenceState(project)}</span><h3>{project.projectName}</h3><p>DRC: {display(project.validation.drcViolations)}; ERC: {display(project.validation.ercViolations)}; unconnected: {display(project.validation.unconnected)}; routing: {project.routingCompletionPercent}%.</p><small>{reportCount(project)} report artifact{reportCount(project) === 1 ? '' : 's'} recorded. {project.manufacturing.ready ? 'Manufacturing release is recorded.' : project.manufacturing.zip ? 'A package is recorded but not released.' : 'No manufacturing package is recorded.'}</small><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Review project evidence <ArrowUpRight size={14} /></Link></article>)}</div></section>}
    {awaiting.length > 0 && <section className="bf-app-section"><div className="bf-panel-heading"><div><p className="bf-panel-eyebrow">Evidence pending</p><h2>Projects awaiting validation</h2><p>Browser projects stay visible here, but they remain drafts until the paired helper records a real engineering result.</p></div><ClipboardCheck size={20} /></div><div className="bf-proof-grid">{awaiting.map((project) => <article key={project.projectId} className="bf-proof-card"><span>{project.status.startsWith('BROWSER_') ? 'browser draft — validation not run' : 'validation not recorded'}</span><h3>{project.projectName}</h3><p>Validation has not been run. This project is not represented as ERC, DRC, sourcing, or manufacturing evidence.</p><small>Next: {humanize(project.nextAction)}.</small><div className="bf-workspace-actions"><Link href={`/projects/${encodeURIComponent(project.projectId)}`}>Open project <ArrowUpRight size={14} /></Link>{project.status.startsWith('BROWSER_') && <Link className="is-secondary" href="/settings/plugin">Pair desktop helper</Link>}</div></article>)}</div></section>}
    {state === 'empty' && <section className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Evidence registry</p><h2>No saved project evidence yet</h2></div><ShieldCheck size={20} /></div><p className="bf-project-workspace-note">Browser drafts are not evidence. Evidence appears only after a local project writes validation or report artifacts.</p><Link className="bf-panel-action" href="/new-board">Create board brief <ArrowUpRight size={15} /></Link></section>}
  </>
}

function reportCount(project: { reports: Record<string, string> }) { return Object.keys(project.reports).filter((key) => key !== 'browserDraft').length }
function hasRecordedEvidence(project: { reports: Record<string, string>; validation: { drcViolations: number | null; ercViolations: number | null; unconnected: number | null } }) { return reportCount(project) > 0 || [project.validation.drcViolations, project.validation.ercViolations, project.validation.unconnected].some((value) => value !== null) }
function display(value: number | null) { return value ?? 'not run' }
function humanize(value: string) { return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function evidenceState(project: { manufacturing: { ready: boolean; zip: string | null } }) { return project.manufacturing.ready ? 'manufacturing release recorded' : project.manufacturing.zip ? 'package recorded — release pending' : 'engineering evidence recorded' }
