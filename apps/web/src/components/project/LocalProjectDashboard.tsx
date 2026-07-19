'use client'

import Link from 'next/link'
import { ArrowRight, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { callBoardForgeLocalEngine, checkBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'
import type { BoardForgeDashboardCard, BoardForgeDashboardData } from '../../lib/boardforge-manifest'
import { readBrowserProjects } from '../../lib/browser-project-registry'

type DashboardLoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error'
type LocalEngineEnvelope = { ok?: boolean; data?: BoardForgeDashboardData; errors?: Array<{ message?: string }> }

export function useLocalProjectDashboard() {
  const [state, setState] = useState<DashboardLoadState>('loading')
  const [data, setData] = useState<BoardForgeDashboardData | null>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setState('loading')
    setMessage('')
    const browser = readBrowserProjects()
    const health = await checkBoardForgeLocalEngine()
    if (!health?.ok) {
      setData(browser)
      setState(browser.projects.length ? 'ready' : 'empty')
      setMessage(browser.projects.length ? 'Showing projects saved in this browser. The local engine is not connected.' : 'Save a browser project or connect a local engine to see projects here.')
      return
    }

    try {
      const response = await callBoardForgeLocalEngine('/projects/dashboard') as LocalEngineEnvelope
      const helper = response.data
      if (!response.ok || !helper || helper.schema !== 'boardforge.project-dashboard-data.v1' || !Array.isArray(helper.projects)) {
        setData(browser)
        setState(browser.projects.length ? 'ready' : 'empty')
        setMessage(response.errors?.[0]?.message || 'The paired engine did not return a usable project registry. Browser-saved projects remain available.')
        return
      }
      const merged = mergeProjectDashboards(helper, browser)
      setData(merged)
      setState(merged.projects.length ? 'ready' : 'empty')
      setMessage(helper.projects.length && browser.projects.length
        ? 'Showing paired local projects and projects saved in this browser.'
        : helper.projects.length ? 'Showing projects discovered by the paired local engine.' : 'Showing projects saved in this browser.')
    } catch {
      setData(browser)
      setState(browser.projects.length ? 'ready' : 'offline')
      setMessage(browser.projects.length ? 'Showing projects saved in this browser. The local project registry could not be reached.' : 'The local project registry could not be reached.')
    }
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

export function mergeProjectDashboards(helper: BoardForgeDashboardData, browser: BoardForgeDashboardData): BoardForgeDashboardData {
  // Canonical helper artifacts override browser drafts sharing an ID. This lets
  // a plugin-created project replace its local browser placeholder without
  // accepting project paths from the browser.
  const byId = new Map<string, BoardForgeDashboardCard>()
  for (const project of browser.projects) byId.set(project.projectId, project)
  for (const project of helper.projects) byId.set(project.projectId, project)
  const projects = [...byId.values()]
  return {
    schema: 'boardforge.project-dashboard-data.v1',
    generatedAt: helper.generatedAt,
    projects,
    summary: {
      totalProjects: projects.length,
      manufacturingReady: projects.filter((project) => project.manufacturing.ready).length,
      blocked: projects.filter((project) => project.readiness === 'blocked').length,
      review: projects.filter((project) => project.readiness === 'review').length,
      needsRouting: projects.filter((project) => project.validation.unconnected !== null && project.validation.unconnected > 0).length,
      cleanDrcErc: projects.filter((project) => project.validation.drcViolations === 0 && project.validation.ercViolations === 0).length,
    },
  }
}

export function DashboardRecentProjects({ rowsClassName, rowClassName, emptyClassName, actionsClassName }: { rowsClassName: string; rowClassName: string; emptyClassName: string; actionsClassName: string }) {
  const { state, data } = useLocalProjectDashboard()
  const projects = data?.projects || []

  if (projects.length) {
    return <div className={rowsClassName}>{projects.slice(0, 4).map((project) => <Link href={`/projects/${encodeURIComponent(project.projectId)}`} key={project.projectId} className={rowClassName}><span><strong>{project.projectName}</strong><small>DRC {project.validation.drcViolations ?? 'not run'} · ERC {project.validation.ercViolations ?? 'not run'} · {project.routingCompletionPercent}% routed</small></span><b>{project.manufacturing.ready ? 'Release evidence' : 'Review required'} <ArrowRight /></b></Link>)}</div>
  }

  return <div className={emptyClassName}><span><Upload /></span><div><h3>{state === 'loading' ? 'Loading saved projects' : 'No browser projects yet'}</h3><p>{state === 'loading' ? 'Reading the authenticated browser project registry.' : 'Create a board brief or import KiCad. Projects saved by this browser appear here even when the desktop helper is offline.'}</p></div><div className={actionsClassName}><Link href="/upload-kicad">Import KiCad</Link><Link href="/new-board">New board</Link></div></div>
}
