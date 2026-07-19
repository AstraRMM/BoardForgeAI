'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, FileDown, FileText, Route, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProjectStatusCard } from '../ProjectStatusCard'
import { useLocalProjectDashboard } from './LocalProjectDashboard'
import { removeBrowserProject, saveBrowserProject } from '../../lib/browser-project-registry'

export function ProjectWorkspaceLocalContent({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { state: registryState, data, message: registryMessage, refresh } = useLocalProjectDashboard()
  const project = data?.projects.find((entry) => entry.projectId === projectId) || null
  const [draftName, setDraftName] = useState('')
  const [browserNotice, setBrowserNotice] = useState('')
  const isBrowserDraft = Boolean(project?.status.startsWith('BROWSER_'))
  useEffect(() => { setDraftName(project?.projectName || '') }, [project?.projectName])
  const state = registryState === 'empty' && !project ? 'missing' : registryState
  const message = state === 'missing' ? 'This project ID is not present in the paired helper registry or among projects saved in this browser.' : registryMessage
  const load = refresh

  if (state !== 'ready' || !project) return <section className="bf-workspace-alert" role={state === 'loading' ? 'status' : 'alert'}><CircleAlert size={20} /><div><strong>{state === 'loading' ? 'Loading project registry.' : state === 'missing' ? 'Project not found.' : state === 'offline' ? 'Paired helper not connected.' : 'Project data unavailable.'}</strong><span>{state === 'loading' ? 'Checking browser-saved projects and the paired helper registry…' : message}</span></div>{state !== 'loading' && <button type="button" onClick={load}>Retry connection</button>}</section>

  const validation = project.validation
  const reports = Object.entries(project.reports || {}).filter(([label]) => label !== 'browserDraft')
  const saveBrowserName = () => {
    const projectName = draftName.trim()
    if (!projectName) {
      setBrowserNotice('Enter a project name before saving.')
      return
    }
    saveBrowserProject({ ...project, projectName })
    setBrowserNotice('Saved in this browser. This does not change a KiCad project or its engineering evidence.')
    refresh()
  }
  const deleteBrowserDraft = () => {
    if (!window.confirm(`Remove “${project.projectName}” from this browser? This does not remove any KiCad files.`)) return
    removeBrowserProject(project.projectId)
    router.replace('/projects')
  }
  return <>
    <div className="bf-project-workspace-actions"><Link href="/projects"><ArrowLeft size={15} />All projects</Link><Link href="/evidence">Validation evidence <ArrowUpRight size={15} /></Link><Link href="/downloads">Manufacturing evidence <ArrowUpRight size={15} /></Link></div>
    <ProjectStatusCard project={project} />
    {isBrowserDraft && <section className="bf-workspace-panel bf-browser-project-controls">
      <div className="bf-panel-title"><div><p>Browser project controls</p><h2>Organize this local draft</h2></div><FileText size={20} /></div>
      <p className="bf-project-workspace-note">These controls change only the project record saved in this browser. They never rename, edit, or delete KiCad files.</p>
      <label className="bf-browser-project-name"><span>Project name</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={120} /></label>
      <div className="bf-browser-project-actions"><button type="button" onClick={saveBrowserName}>Save browser name</button><button type="button" className="is-danger" onClick={deleteBrowserDraft}>Remove browser draft</button></div>
      {browserNotice && <p className="bf-project-workspace-note" aria-live="polite">{browserNotice}</p>}
    </section>}
    <section className="bf-workspace-grid bf-project-workspace-grid">
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Validation evidence</p><h2>Current engineering gates</h2></div><ShieldCheck size={20} /></div><dl className="bf-project-evidence-grid"><Datum label="DRC violations" value={validation.drcViolations} /><Datum label="ERC violations" value={validation.ercViolations} /><Datum label="Unconnected" value={validation.unconnected} /><Datum label="Forbidden vias" value={validation.forbiddenVias} /></dl><p className="bf-project-workspace-note">This project is read from the browser registry. “Not run” is not treated as passing; KiCad validation remains a desktop-engine action.</p></article>
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Release state</p><h2>{project.manufacturing.ready ? 'Manufacturing evidence ready' : 'Release remains blocked'}</h2></div>{project.manufacturing.ready ? <CheckCircle2 size={20} /> : <Route size={20} />}</div><dl className="bf-project-evidence-grid"><Datum label="Routing completion" value={`${project.routingCompletionPercent}%`} /><Datum label="Routeability score" value={project.routeabilityScore ?? 'Not recorded'} /><Datum label="Next action" value={humanize(project.nextAction)} /><Datum label="Package" value={project.manufacturing.zip ? 'Recorded locally' : humanize(project.manufacturing.blockedReason || 'Not exported')} /></dl><Link className="bf-panel-action" href="/downloads">Review manufacturing artifacts <FileDown size={15} /></Link></article>
    </section>
    <section className="bf-workspace-panel bf-project-workspace-reports"><div className="bf-panel-title"><div><p>Recorded reports</p><h2>Evidence generated for this project</h2></div><FileText size={20} /></div>{reports.length ? <dl className="bf-project-reports-list">{reports.map(([label]) => <div key={label}><dt>{humanize(label)}</dt><dd>Recorded in the merged browser and paired-helper registry</dd></div>)}</dl> : <p className="bf-project-workspace-note">No validation or report artifacts have been recorded for this project.</p>}</section>
  </>
}

function Datum({ label, value }: { label: string; value: string | number | null }) { return <div><dt>{label}</dt><dd>{value ?? 'Not run'}</dd></div> }
function humanize(value: string) { return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) }
