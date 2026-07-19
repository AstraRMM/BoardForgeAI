'use client'

import { useCallback, useEffect, useState } from 'react'
import { checkBoardForgeLocalEngine, callBoardForgeLocalEngine, localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'
import type { BoardForgeDashboardData } from '../../lib/boardforge-manifest'

type DashboardLoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error'

type LocalEngineEnvelope = {
  ok?: boolean
  status?: string
  data?: BoardForgeDashboardData
  errors?: Array<{ message?: string }>
}

export function useLocalProjectDashboard() {
  const [state, setState] = useState<DashboardLoadState>('loading')
  const [data, setData] = useState<BoardForgeDashboardData | null>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setState('loading')
    setMessage('')
    const health = await checkBoardForgeLocalEngine()
    if (!health?.ok) {
      setData(null)
      setState('offline')
      setMessage(localArtifactApiContract.offlineDisplayMessage)
      return
    }

    try {
      const response = await callBoardForgeLocalEngine('/projects/dashboard') as LocalEngineEnvelope
      const dashboard = response.data
      if (!response.ok || !dashboard || dashboard.schema !== 'boardforge.project-dashboard-data.v1') {
        setData(null)
        setState('error')
        setMessage(response.errors?.[0]?.message || 'The local engine did not return a project dashboard artifact.')
        return
      }
      setData(dashboard)
      setState(dashboard.projects.length ? 'ready' : 'empty')
    } catch {
      setData(null)
      setState('offline')
      setMessage(localArtifactApiContract.offlineDisplayMessage)
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
      ? 'No BoardForge project dashboard artifacts were found in this workspace yet.'
      : message || 'Project data is unavailable.'

  return <section className={`bf-workspace-alert${state === 'error' ? ' is-error' : ''}`} role={state === 'error' || state === 'offline' ? 'alert' : 'status'}>
    <div><strong>{state === 'offline' ? 'Local engine not connected.' : state === 'empty' ? 'No local projects yet.' : state === 'loading' ? 'Loading local workspace.' : 'Local project data unavailable.'}</strong><span>{copy}</span></div>
    {state !== 'loading' && <button type="button" onClick={onRetry}>Retry connection</button>}
  </section>
}
