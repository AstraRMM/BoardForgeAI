'use client'

import Link from 'next/link'
import { ArrowRight, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { checkBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'
import type { BoardForgeDashboardData } from '../../lib/boardforge-manifest'
import { readBrowserProjects } from '../../lib/browser-project-registry'

type DashboardLoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error'

export function useLocalProjectDashboard() {
  const [state, setState] = useState<DashboardLoadState>('loading')
  const [data, setData] = useState<BoardForgeDashboardData | null>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setState('loading')
    setMessage('')
    // Browser projects are the only project list currently available to the
    // authenticated web app. Prefer them before checking desktop availability.
    const browser = readBrowserProjects()
    if (browser.projects.length) {
      setData(browser)
      setState('ready')
      setMessage('Showing projects saved in this browser.')
      return
    }

    const health = await checkBoardForgeLocalEngine()
    setData(browser)
    setState('empty')
    setMessage(health?.ok
      ? 'The paired local engine is online but does not expose a project registry. Saved browser projects will appear here when available.'
      : 'Save a browser project or connect a local engine to see projects here.')
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  return { state, data, message, refresh }
}

export function LocalProjectDataNotice({ state, message, onRetry }: { state: DashboardLoadState; message: string; onRetry: () => void }) {
  if (state === 'ready') return null

  const copy = state === 'loading'
    ? 'Reading project artifacts from the local engine…'
    : state === 'empty'
      ? message || 'No BoardForge project dashboard artifacts were found in this workspace yet.'
      : message || 'Project data is unavailable.'

  return <section className={`bf-workspace-alert${state === 'error' ? ' is-error' : ''}`} role={state === 'error' || state === 'offline' ? 'alert' : 'status'}>
    <div><strong>{state === 'offline' ? 'Local engine not connected.' : state === 'empty' ? 'No local projects yet.' : state === 'loading' ? 'Loading local workspace.' : 'Local project data unavailable.'}</strong><span>{copy}</span></div>
    {state !== 'loading' && <button type="button" onClick={onRetry}>Retry connection</button>}
  </section>
}

export function DashboardRecentProjects({ rowsClassName, rowClassName, emptyClassName, actionsClassName }: { rowsClassName: string; rowClassName: string; emptyClassName: string; actionsClassName: string }) {
  const { state, data } = useLocalProjectDashboard()
  const projects = data?.projects || []

  if (projects.length) {
    return <div className={rowsClassName}>{projects.slice(0, 4).map((project) => <Link href={`/projects/${encodeURIComponent(project.projectId)}`} key={project.projectId} className={rowClassName}><span><strong>{project.projectName}</strong><small>DRC {project.validation.drcViolations ?? 'not run'} · ERC {project.validation.ercViolations ?? 'not run'} · {project.routingCompletionPercent}% routed</small></span><b>{project.manufacturing.ready ? 'Release evidence' : 'Review required'} <ArrowRight /></b></Link>)}</div>
  }

  return <div className={emptyClassName}><span><Upload /></span><div><h3>{state === 'loading' ? 'Loading saved projects' : 'No browser projects yet'}</h3><p>{state === 'loading' ? 'Reading the authenticated browser project registry.' : 'Create a board brief or import KiCad. Projects saved by this browser appear here even when the desktop helper is offline.'}</p></div><div className={actionsClassName}><Link href="/upload-kicad">Import KiCad</Link><Link href="/new-board">New board</Link></div></div>
}
