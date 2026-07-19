'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert, FileDown, FileText, History, Route, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { ProjectStatusCard } from '../ProjectStatusCard'
import { useLocalProjectDashboard } from './LocalProjectDashboard'
import { readBrowserProjectActivity, recordBrowserProjectActivity, removeBrowserProject, saveBrowserProject, type BrowserProjectActivity } from '../../lib/browser-project-registry'
import { callBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'
import type { BoardForgeBrowserDraft } from '../../lib/boardforge-manifest'
import { ProjectEngineeringCopilot } from './ProjectEngineeringCopilot'

type HelperArtifacts = {
  reports: Array<{ id: string; available: boolean }>
  downloads: {
    readinessEvidenceRecorded: boolean
    assemblyEvidenceRecorded: boolean
    artifacts: Record<'gerbers' | 'drill' | 'bom' | 'cpl' | 'package', boolean>
    browserTransferAvailable: boolean
  }
}

/**
 * Fragment navigation scrolls correctly in browsers, but it does not
 * consistently move keyboard or screen-reader focus to a non-focusable
 * section. Keep the native URL fragment and move focus after it is applied.
 */
function focusProjectSection(event: MouseEvent<HTMLAnchorElement>) {
  const sectionId = event.currentTarget.getAttribute('href')?.slice(1)
  if (!sectionId) return
  window.setTimeout(() => document.getElementById(sectionId)?.focus({ preventScroll: true }), 0)
}

export function ProjectWorkspaceLocalContent({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { state: registryState, data, message: registryMessage, refresh } = useLocalProjectDashboard()
  const project = data?.projects.find((entry) => entry.projectId === projectId) || null
  const [draftName, setDraftName] = useState('')
  const [browserNotice, setBrowserNotice] = useState('')
  const [browserActivity, setBrowserActivity] = useState<BrowserProjectActivity[]>([])
  const [helperArtifacts, setHelperArtifacts] = useState<HelperArtifacts | null>(null)
  const [artifactState, setArtifactState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  // Early browser drafts used a human-readable status. `localOnly` is the
  // durable ownership boundary, while the prefix keeps older stored records
  // compatible.
  const isBrowserDraft = Boolean(project?.localOnly) || Boolean(project?.status.startsWith('BROWSER_'))
  useEffect(() => { setDraftName(project?.projectName || '') }, [project?.projectName])
  useEffect(() => { setBrowserActivity(isBrowserDraft && project ? readBrowserProjectActivity(project.projectId) : []) }, [isBrowserDraft, project?.projectId])
  const state = registryState === 'empty' && !project ? 'missing' : registryState
  const message = state === 'missing' ? 'This project ID is not present in the paired helper registry or among projects saved in this browser.' : registryMessage
  const load = refresh

  useEffect(() => {
    if (!project || isBrowserDraft) {
      setHelperArtifacts(null)
      setArtifactState('idle')
      return
    }
    let current = true
    setArtifactState('loading')
    const encodedProjectId = encodeURIComponent(project.projectId)
    void Promise.all([
      callBoardForgeLocalEngine(`/project/${encodedProjectId}/reports`),
      callBoardForgeLocalEngine(`/project/${encodedProjectId}/downloads`),
    ]).then(([reportsResponse, downloadsResponse]) => {
      if (!current) return
      if (!reportsResponse?.ok || !downloadsResponse?.ok) {
        setHelperArtifacts(null)
        setArtifactState('unavailable')
        return
      }
      const reports = reportsResponse.data?.reports
      const downloads = downloadsResponse.data
      if (!Array.isArray(reports) || !downloads?.artifacts) {
        setHelperArtifacts(null)
        setArtifactState('unavailable')
        return
      }
      setHelperArtifacts({ reports, downloads })
      setArtifactState('ready')
    }).catch(() => {
      if (!current) return
      setHelperArtifacts(null)
      setArtifactState('unavailable')
    })
    return () => { current = false }
  }, [isBrowserDraft, project?.projectId])

  if (state !== 'ready' || !project) return <section className="bf-workspace-alert" role={state === 'loading' ? 'status' : 'alert'}><CircleAlert size={20} /><div><strong>{state === 'loading' ? 'Loading project registry.' : state === 'missing' ? 'Project not found.' : state === 'offline' ? 'Paired helper not connected.' : 'Project data unavailable.'}</strong><span>{state === 'loading' ? 'Checking browser-saved projects and the paired helper registry…' : message}</span></div>{state !== 'loading' && <button type="button" onClick={load}>Retry connection</button>}</section>

  const validation = project.validation
  const reports = Object.entries(project.reports || {}).filter(([label]) => label !== 'browserDraft')
  // Browser workspaces intentionally accept any browser-local project ID.
  // Existing saved work reopens; otherwise the workspace starts a new
  // browser-only draft attached to this project record. Helper projects never
  // receive these launch controls.
  const savedPcbDraft = isBrowserDraft && project.browserDraft?.kind === 'pcb' && Boolean(project.browserDraft.pcb)
  const savedSchematicPlan = isBrowserDraft && Boolean(project.browserDraft?.schematicPlan)
  const savedOutlineDraft = isBrowserDraft && project.browserDraft?.kind === 'outline' && Boolean(project.browserDraft.outline)
  const browserWork = isBrowserDraft ? summarizeBrowserWork(project.browserDraft) : []
  const saveBrowserName = () => {
    const projectName = draftName.trim()
    if (!projectName) {
      setBrowserNotice('Enter a project name before saving.')
      return
    }
    const renamed = projectName !== project.projectName
    saveBrowserProject({ ...project, projectName })
    if (renamed) {
      recordBrowserProjectActivity(project.projectId, 'renamed', projectName)
      setBrowserActivity(readBrowserProjectActivity(project.projectId))
    }
    setBrowserNotice('Saved in this browser. This does not change a KiCad project or its engineering evidence.')
    refresh()
  }
  const deleteBrowserDraft = () => {
    if (!window.confirm(`Remove “${project.projectName}” from this browser? This does not remove any KiCad files.`)) return
    removeBrowserProject(project.projectId)
    router.replace('/projects')
  }
  return <>
    <div className="bf-project-workspace-actions"><Link href="/projects"><ArrowLeft size={15} />All projects</Link><Link href="/evidence">Evidence registry <ArrowUpRight size={15} /></Link><Link href="/downloads">Manufacturing registry <ArrowUpRight size={15} /></Link></div>
    <nav className="bf-project-section-nav" aria-label="Project workspace sections">
      <a href="#overview" onClick={focusProjectSection}>Overview</a><a href="#evidence" onClick={focusProjectSection}>Evidence</a><a href="#release" onClick={focusProjectSection}>Release</a><a href="#activity" onClick={focusProjectSection}>Activity</a>
    </nav>
    <section id="overview" className="bf-project-workspace-section" aria-labelledby="overview-title" tabIndex={-1}>
      <div className="bf-project-section-heading"><p>Project context</p><h2 id="overview-title">Overview</h2><span>{isBrowserDraft ? 'Browser-local draft' : 'Paired-helper project record'}</span></div>
      <ProjectStatusCard project={project} />
      {browserWork.length > 0 && <section className="bf-workspace-panel bf-browser-work-summary" aria-labelledby="browser-work-summary-title">
        <div className="bf-panel-title"><div><p>Saved browser work</p><h2 id="browser-work-summary-title">Draft contents</h2></div><FileText size={20} /></div>
        <dl className="bf-browser-work-list">
          {browserWork.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.detail}</dd></div>)}
        </dl>
        <p className="bf-project-workspace-note">These are browser-local working records. They are not KiCad files, validation evidence, or manufacturing output.</p>
      </section>}
      {isBrowserDraft && <section className="bf-workspace-panel bf-browser-project-controls">
        <div className="bf-panel-title"><div><p>Browser project controls</p><h2>Organize this local draft</h2></div><FileText size={20} /></div>
        <p className="bf-project-workspace-note">These controls change only the project record saved in this browser. They never rename, edit, or delete KiCad files.</p>
        <label className="bf-browser-project-name"><span>Project name</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={120} /></label>
        <div className="bf-browser-project-actions" aria-label="Start or reopen browser engineering work">
          <Link href={`/pcb-workspace?project=${encodeURIComponent(project.projectId)}`}>{savedPcbDraft ? 'Open saved browser PCB' : 'Start browser PCB draft'}</Link>
          <Link href={`/schematic-workspace?project=${encodeURIComponent(project.projectId)}`}>{savedSchematicPlan ? 'Open saved schematic plan' : 'Start browser schematic plan'}</Link>
          {savedOutlineDraft && <Link href={`/custom-board-generator?project=${encodeURIComponent(project.projectId)}`}>Open saved board outline</Link>}
        </div>
        <div className="bf-browser-project-actions"><button type="button" onClick={saveBrowserName}>Save browser name</button><button type="button" className="is-danger" onClick={deleteBrowserDraft}>Remove browser draft</button></div>
        {browserNotice && <p className="bf-project-workspace-note" aria-live="polite">{browserNotice}</p>}
      </section>}
    </section>
    <section id="evidence" className="bf-project-workspace-section" aria-labelledby="evidence-title" tabIndex={-1}>
      <div className="bf-project-section-heading"><p>Recorded engineering state</p><h2 id="evidence-title">Evidence</h2><span>Only saved results appear here</span></div>
      <section className="bf-workspace-grid bf-project-workspace-grid">
        <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Validation evidence</p><h2>Current engineering gates</h2></div><ShieldCheck size={20} /></div><dl className="bf-project-evidence-grid"><Datum label="DRC violations" value={validation.drcViolations} /><Datum label="ERC violations" value={validation.ercViolations} /><Datum label="Unconnected" value={validation.unconnected} /><Datum label="Forbidden vias" value={validation.forbiddenVias} /></dl><p className="bf-project-workspace-note">“Not run” is not treated as passing; KiCad validation remains a desktop-engine action.</p></article>
        <section className="bf-workspace-panel bf-project-workspace-reports"><div className="bf-panel-title"><div><p>Recorded reports</p><h2>Evidence generated for this project</h2></div><FileText size={20} /></div>{reports.length ? <dl className="bf-project-reports-list">{reports.map(([label]) => <div key={label}><dt>{humanize(label)}</dt><dd>Recorded in the merged browser and paired-helper registry</dd></div>)}</dl> : <p className="bf-project-workspace-note">No validation or report artifacts have been recorded for this project.</p>}</section>
      </section>
      {!isBrowserDraft && <ProjectArtifactAvailability state={artifactState} artifacts={helperArtifacts} />}
      {!isBrowserDraft && <ProjectEngineeringCopilot projectId={project.projectId} />}
    </section>
    <section id="release" className="bf-project-workspace-section" aria-labelledby="release-title" tabIndex={-1}>
      <div className="bf-project-section-heading"><p>Manufacturing readiness</p><h2 id="release-title">Release</h2><span>Review remains required before fabrication</span></div>
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Release state</p><h2>{project.manufacturing.ready ? 'Manufacturing evidence ready' : 'Release remains blocked'}</h2></div>{project.manufacturing.ready ? <CheckCircle2 size={20} /> : <Route size={20} />}</div><dl className="bf-project-evidence-grid"><Datum label="Routing completion" value={`${project.routingCompletionPercent}%`} /><Datum label="Routeability score" value={project.routeabilityScore ?? 'Not recorded'} /><Datum label="Next action" value={humanize(project.nextAction)} /><Datum label="Package" value={project.manufacturing.zip ? 'Recorded locally' : humanize(project.manufacturing.blockedReason || 'Not exported')} /></dl><Link className="bf-panel-action" href="/downloads">Review manufacturing artifacts <FileDown size={15} /></Link></article>
    </section>
    <section id="activity" className="bf-project-workspace-section" aria-labelledby="activity-title" tabIndex={-1}>
      <div className="bf-project-section-heading"><p>{isBrowserDraft ? 'Browser-only record' : 'Project history'}</p><h2 id="activity-title">Activity</h2><span>{isBrowserDraft ? 'Saved in this browser only' : 'No helper activity feed is exposed'}</span></div>
      {isBrowserDraft ? <section className="bf-workspace-panel bf-project-workspace-reports">
        <div className="bf-panel-title"><div><p>Browser activity</p><h2>Local project record history</h2></div><History size={20} /></div>
        <p className="bf-project-workspace-note">This history records only changes saved in this browser. It is not KiCad, validation, manufacturing, or helper activity.</p>
        {browserActivity.length ? <dl className="bf-project-reports-list">{browserActivity.map((event) => <div key={event.id}><dt>{activityLabel(event.action)}</dt><dd>{new Date(event.at).toLocaleString()}{event.detail ? ` — ${event.detail}` : ''}</dd></div>)}</dl> : <p className="bf-project-workspace-note">No browser-record activity has been retained for this project.</p>}
      </section> : <section className="bf-workspace-panel bf-project-workspace-reports"><div className="bf-panel-title"><div><p>Helper activity</p><h2>No project activity feed recorded</h2></div><History size={20} /></div><p className="bf-project-workspace-note">The paired helper currently exposes project evidence and artifact availability, not an auditable per-project activity timeline. This workspace does not infer one from file timestamps.</p></section>}
    </section>
  </>
}

function ProjectArtifactAvailability({ state, artifacts }: { state: 'idle' | 'loading' | 'ready' | 'unavailable'; artifacts: HelperArtifacts | null }) {
  const availableReports = artifacts?.reports.filter((report) => report.available) || []
  const availableFiles = artifacts ? Object.entries(artifacts.downloads.artifacts).filter(([, available]) => available).map(([name]) => name) : []
  return <section className="bf-workspace-panel bf-project-workspace-reports">
    <div className="bf-panel-title"><div><p>Local helper artifacts</p><h2>Project-scoped availability</h2></div><FileDown size={20} /></div>
    {state === 'loading' && <p className="bf-project-workspace-note">Reading this project’s recorded artifact availability from the paired helper…</p>}
    {state === 'unavailable' && <p className="bf-project-workspace-note">Artifact availability could not be read from the paired helper. No download or release claim is shown.</p>}
    {state === 'ready' && artifacts && <>
      <dl className="bf-project-reports-list">
        <div><dt>Recorded reports</dt><dd>{availableReports.length ? availableReports.map((report) => humanize(report.id)).join(', ') : 'None recorded'}</dd></div>
        <div><dt>Release evidence</dt><dd>{artifacts.downloads.readinessEvidenceRecorded ? 'Recorded locally' : 'Not recorded'}</dd></div>
        <div><dt>Assembly evidence</dt><dd>{artifacts.downloads.assemblyEvidenceRecorded ? 'Recorded locally' : 'Not recorded'}</dd></div>
        <div><dt>Manufacturing files</dt><dd>{availableFiles.length ? availableFiles.map(humanize).join(', ') : 'None recorded'}</dd></div>
        <div><dt>Browser transfer</dt><dd>{artifacts.downloads.browserTransferAvailable ? 'Available' : 'Not available from this browser session'}</dd></div>
      </dl>
      <p className="bf-project-workspace-note">This view reports availability only. Local file paths and package downloads remain protected by the desktop helper.</p>
    </>}
  </section>
}

function Datum({ label, value }: { label: string; value: string | number | null }) { return <div><dt>{label}</dt><dd>{value ?? 'Not run'}</dd></div> }

function summarizeBrowserWork(draft: BoardForgeBrowserDraft | undefined) {
  if (!draft) return [] as Array<{ label: string; detail: string }>
  const entries: Array<{ label: string; detail: string }> = []
  if (draft.pcb) {
    const { footprints, tracks, vias } = draft.pcb.document
    entries.push({ label: 'PCB snapshot', detail: `${footprints.length} footprints · ${tracks.length} tracks · ${vias.length} vias` })
  }
  if (draft.schematicPlan) {
    const { components, connections } = draft.schematicPlan
    entries.push({ label: 'Schematic intent', detail: `${components.length} components · ${connections.length} planned connections` })
  }
  if (draft.outline) {
    const { pointsMm, mountingHolesMm, preset, closed } = draft.outline
    entries.push({ label: 'Board outline', detail: `${pointsMm.length} edge points · ${mountingHolesMm.length} mounting holes · ${humanize(preset)}${closed ? '' : ' (open)'}` })
  }
  return entries
}

function humanize(value: string) { return value.replace(/[A-Z]:\\[^ ]+/g, 'local project workspace').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function activityLabel(action: BrowserProjectActivity['action']) {
  if (action === 'created') return 'Saved in this browser'
  if (action === 'renamed') return 'Browser project renamed'
  if (action === 'pcb_snapshot_saved') return 'Browser PCB snapshot saved'
  if (action === 'outline_saved') return 'Browser board outline saved'
  return 'Browser schematic plan saved'
}
