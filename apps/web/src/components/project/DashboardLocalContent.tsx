'use client'

import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, FileCheck2, FolderKanban, RadioTower, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { checkBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'
import { hasLocalEngineBrowserSession } from '../../lib/boardforge-local-engine-pairing-client'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

const workspaceCards = [
  ['Projects', 'Review local manifests, validation state, and approved publishing gates.', 'Open projects', '/projects'],
  ['New board', 'Capture a board brief or create an Edge.Cuts outline before local KiCad work.', 'Start a board', '/new-board'],
  ['Plugin pairing', 'Pair this browser and the local engine with a short-lived, revocable code.', 'Open pairing', '/settings/plugin'],
  ['Evidence', 'Review local checks, supplier state, reports, and export gates.', 'View evidence', '/evidence'],
]

export function DashboardLocalContent({ authReady }: { authReady: boolean }) {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const { state: helperState, refresh: refreshHelperState } = useHelperConnectionState()
  const projects = data?.projects || []
  const summary = data?.summary
  const refreshWorkspace = useCallback(() => {
    void refresh()
    void refreshHelperState()
  }, [refresh, refreshHelperState])
  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refreshWorkspace} />
    <section className="bf-workspace-metrics" aria-label="Project metrics">
      <Metric icon={<FolderKanban size={19} />} label="Projects tracked" value={summary ? String(summary.totalProjects) : '—'} note={summary ? 'from local artifacts' : 'local engine required'} />
      <Metric icon={<CheckCircle2 size={19} />} label="Clean ERC / DRC" value={summary ? String(summary.cleanDrcErc) : '—'} note="zero reported errors" tone="success" />
      <Metric icon={<FileCheck2 size={19} />} label="Packages validated" value={summary ? String(summary.manufacturingReady) : '—'} note="manufacturing evidence" tone="copper" />
      <Metric icon={<RadioTower size={19} />} label="Desktop helper" value={helperState.label} note={helperState.note} />
    </section>
    <section className="bf-workspace-grid">
      <article className="bf-workspace-panel bf-workspace-projects"><div className="bf-panel-title"><div><p>Active projects</p><h2>Evidence-backed project state</h2></div><Link href="/projects">View all <ArrowUpRight size={15} /></Link></div><div className="bf-workspace-project-list">
        {projects.slice(0, 4).map((project) => <Link href={`/projects/${encodeURIComponent(project.projectId)}`} key={project.projectId} className="bf-workspace-project-row"><span className={`bf-project-state ${project.manufacturing.ready ? 'is-ready' : 'is-blocked'}`} /><div><strong>{project.projectName}</strong><small>{project.routingCompletionPercent}% routing completion · {project.validation.drcErrors ?? project.validation.drcViolations} DRC errors</small></div><b>{project.manufacturing.ready ? 'Package checked' : 'Review needed'}</b></Link>)}
        {!projects.length && state !== 'loading' && <p className="bf-project-list-empty">Projects saved in this browser appear here immediately. Paired-helper projects appear when the desktop helper is reachable.</p>}
      </div></article>
      <article className="bf-workspace-panel bf-workspace-readiness"><div className="bf-panel-title"><div><p>Readiness</p><h2>What releases a package</h2></div><ShieldCheck size={20} /></div><ul className="bf-workspace-checklist"><li><span className={projects.length ? 'is-done' : 'is-waiting'} />Project record saved in the browser or helper registry</li><li><span className={summary?.cleanDrcErc ? 'is-done' : 'is-waiting'} />ERC and DRC results parsed from evidence</li><li><span className={helperState.session ? 'is-done' : 'is-waiting'} />{helperState.session ? 'Browser session token present' : 'Pair browser only for protected helper actions'}</li><li><span className="is-waiting" />Human review remains required before fabrication</li></ul><p className="bf-project-workspace-note">{authReady ? 'Account configuration does not establish a helper connection or pairing.' : 'Browser drafts work without account-service configuration or helper pairing.'}</p><Link className="bf-panel-action" href="/evidence">Open evidence dashboard <ArrowUpRight size={15} /></Link></article>
    </section>
    <section className="bf-workspace-tool-grid">{workspaceCards.map(([title, body, action, href]) => <Link href={href} key={title} className="bf-workspace-tool"><strong>{title}</strong><span>{body}</span><b>{action} <ArrowUpRight size={14} /></b></Link>)}</section>
  </>
}

type HelperConnectionState = {
  label: 'Checking' | 'Offline' | 'Reachable'
  note: string
  session: boolean
}

function useHelperConnectionState() {
  const [state, setState] = useState<HelperConnectionState>({ label: 'Checking', note: 'checking this device', session: false })
  const refresh = useCallback(async () => {
    setState({ label: 'Checking', note: 'checking this device', session: false })
    const health = await checkBoardForgeLocalEngine()
    const session = hasLocalEngineBrowserSession()
    if (!health?.ok) {
      setState({ label: 'Offline', note: 'browser drafts remain available', session: false })
      return
    }
    setState({
      label: 'Reachable',
      note: session ? 'session token present; protected actions verify it' : 'no browser session token present',
      session,
    })
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  return { state, refresh }
}

function Metric({ icon, label, value, note, tone = 'cyan' }: { icon: ReactNode; label: string; value: string; note: string; tone?: 'cyan' | 'success' | 'copper' }) {
  return <article className={`bf-workspace-metric is-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>
}
