'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, FileDown, FileText, Route, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { callBoardForgeLocalEngine, checkBoardForgeLocalEngine, localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'
import type { BoardForgeDashboardCard, BoardForgeDashboardData } from '../../lib/boardforge-manifest'
import { ProjectStatusCard } from '../ProjectStatusCard'

type Envelope = { ok?: boolean; data?: BoardForgeDashboardData; errors?: Array<{ message?: string }> }

export function ProjectWorkspaceLocalContent({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<BoardForgeDashboardCard | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'offline' | 'missing' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setState('loading')
    const health = await checkBoardForgeLocalEngine()
    if (!health?.ok) { setState('offline'); setMessage(localArtifactApiContract.offlineDisplayMessage); return }
    try {
      const response = await callBoardForgeLocalEngine(`/project/${encodeURIComponent(projectId)}/dashboard`) as Envelope
      const candidate = response.data?.projects?.find((entry) => entry.projectId === projectId)
      if (!response.ok) { setState('error'); setMessage(response.errors?.[0]?.message || 'The local engine could not read this project.'); return }
      if (!candidate) { setState('missing'); setMessage('This project is not present in the local workspace or does not have a dashboard artifact.'); return }
      setProject(candidate); setState('ready')
    } catch { setState('offline'); setMessage(localArtifactApiContract.offlineDisplayMessage) }
  }, [projectId])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  if (state !== 'ready' || !project) return <section className="bf-workspace-alert" role={state === 'loading' ? 'status' : 'alert'}><CircleAlert size={20} /><div><strong>{state === 'loading' ? 'Loading local project artifact.' : state === 'missing' ? 'Project not found.' : state === 'offline' ? 'Local engine not connected.' : 'Project data unavailable.'}</strong><span>{state === 'loading' ? 'Reading the canonical project dashboard artifact…' : message}</span></div>{state !== 'loading' && <button type="button" onClick={load}>Retry connection</button>}</section>

  const validation = project.validation
  const reports = Object.entries(project.reports || {})
  return <>
    <div className="bf-project-workspace-actions"><Link href="/projects"><ArrowLeft size={15} />All projects</Link><Link href="/evidence">Validation evidence <ArrowUpRight size={15} /></Link><Link href="/downloads">Manufacturing evidence <ArrowUpRight size={15} /></Link></div>
    <ProjectStatusCard project={project} />
    <section className="bf-workspace-grid bf-project-workspace-grid">
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Validation evidence</p><h2>Current engineering gates</h2></div><ShieldCheck size={20} /></div><dl className="bf-project-evidence-grid"><Datum label="DRC violations" value={validation.drcViolations} /><Datum label="ERC violations" value={validation.ercViolations} /><Datum label="Unconnected" value={validation.unconnected} /><Datum label="Forbidden vias" value={validation.forbiddenVias} /></dl><p className="bf-project-workspace-note">Status is read from the local artifact. Validation actions remain in the desktop engine, not the browser.</p></article>
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Release state</p><h2>{project.manufacturing.ready ? 'Manufacturing evidence ready' : 'Release remains blocked'}</h2></div>{project.manufacturing.ready ? <CheckCircle2 size={20} /> : <Route size={20} />}</div><dl className="bf-project-evidence-grid"><Datum label="Routing completion" value={`${project.routingCompletionPercent}%`} /><Datum label="Routeability score" value={project.routeabilityScore ?? 'Not recorded'} /><Datum label="Next action" value={humanize(project.nextAction)} /><Datum label="Package" value={project.manufacturing.zip ? 'Recorded locally' : humanize(project.manufacturing.blockedReason || 'Not exported')} /></dl><Link className="bf-panel-action" href="/downloads">Review manufacturing artifacts <FileDown size={15} /></Link></article>
    </section>
    <section className="bf-workspace-panel bf-project-workspace-reports"><div className="bf-panel-title"><div><p>Local reports</p><h2>Evidence generated for this project</h2></div><FileText size={20} /></div>{reports.length ? <dl className="bf-project-reports-list">{reports.map(([label]) => <div key={label}><dt>{humanize(label)}</dt><dd>Recorded in the protected local workspace</dd></div>)}</dl> : <p className="bf-project-workspace-note">No report artifacts have been recorded for this project.</p>}</section>
  </>
}

function Datum({ label, value }: { label: string; value: string | number }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function humanize(value: string) { return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) }
