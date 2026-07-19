'use client'

import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, FileCheck2, FolderKanban, RadioTower, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

const workspaceCards = [
  ['Projects', 'Review local manifests, validation state, and approved publishing gates.', 'Open projects', '/projects'],
  ['New board', 'Capture a board brief or create an Edge.Cuts outline before local KiCad work.', 'Start a board', '/new-board'],
  ['Plugin pairing', 'Pair this browser and the local engine with a short-lived, revocable code.', 'Open pairing', '/settings/plugin'],
  ['Evidence', 'Review local checks, supplier state, reports, and export gates.', 'View evidence', '/evidence'],
]

export function DashboardLocalContent({ authReady }: { authReady: boolean }) {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  const summary = data?.summary
  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    <section className="bf-workspace-metrics" aria-label="Project metrics">
      <Metric icon={<FolderKanban size={19} />} label="Projects tracked" value={summary ? String(summary.totalProjects) : '—'} note={summary ? 'from local artifacts' : 'local engine required'} />
      <Metric icon={<CheckCircle2 size={19} />} label="Clean ERC / DRC" value={summary ? String(summary.cleanDrcErc) : '—'} note="zero reported errors" tone="success" />
      <Metric icon={<FileCheck2 size={19} />} label="Packages validated" value={summary ? String(summary.manufacturingReady) : '—'} note="manufacturing evidence" tone="copper" />
      <Metric icon={<RadioTower size={19} />} label="Project registry" value={state === 'ready' ? 'Available' : state === 'empty' ? 'Empty' : state === 'loading' ? 'Checking' : 'Unavailable'} note="browser drafts or paired local artifacts" />
    </section>
    <section className="bf-workspace-grid">
      <article className="bf-workspace-panel bf-workspace-projects"><div className="bf-panel-title"><div><p>Active projects</p><h2>Evidence-backed project state</h2></div><Link href="/projects">View all <ArrowUpRight size={15} /></Link></div><div className="bf-workspace-project-list">
        {projects.slice(0, 4).map((project) => <Link href={`/projects/${encodeURIComponent(project.projectId)}`} key={project.projectId} className="bf-workspace-project-row"><span className={`bf-project-state ${project.manufacturing.ready ? 'is-ready' : 'is-blocked'}`} /><div><strong>{project.projectName}</strong><small>{project.routingCompletionPercent}% routing completion · {project.validation.drcErrors ?? project.validation.drcViolations} DRC errors</small></div><b>{project.manufacturing.ready ? 'Package checked' : 'Review needed'}</b></Link>)}
        {!projects.length && state !== 'loading' && <p className="bf-project-list-empty">Project cards appear here after the local engine discovers a BoardForge dashboard artifact.</p>}
      </div></article>
      <article className="bf-workspace-panel bf-workspace-readiness"><div className="bf-panel-title"><div><p>Readiness</p><h2>What releases a package</h2></div><ShieldCheck size={20} /></div><ul className="bf-workspace-checklist"><li><span className={projects.length ? 'is-done' : 'is-waiting'} />Project manifest and local workspace recorded</li><li><span className={summary?.cleanDrcErc ? 'is-done' : 'is-waiting'} />ERC and DRC results parsed from evidence</li><li><span className={authReady ? 'is-done' : 'is-waiting'} />Account services {authReady ? 'configured' : 'require setup'}</li><li><span className="is-waiting" />Human review remains required before fabrication</li></ul><Link className="bf-panel-action" href="/evidence">Open evidence dashboard <ArrowUpRight size={15} /></Link></article>
    </section>
    <section className="bf-workspace-tool-grid">{workspaceCards.map(([title, body, action, href]) => <Link href={href} key={title} className="bf-workspace-tool"><strong>{title}</strong><span>{body}</span><b>{action} <ArrowUpRight size={14} /></b></Link>)}</section>
  </>
}

function Metric({ icon, label, value, note, tone = 'cyan' }: { icon: ReactNode; label: string; value: string; note: string; tone?: 'cyan' | 'success' | 'copper' }) {
  return <article className={`bf-workspace-metric is-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>
}
