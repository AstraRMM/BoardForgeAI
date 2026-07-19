import { getLocalEngineSessionToken } from './boardforge-local-engine-session'

export const BOARDFORGE_LOCAL_ENGINE_URL = 'http://127.0.0.1:38991'

export const localArtifactApiContract = {
  mode: 'protected desktop helper service',
  offlineMessage: 'BoardForge Desktop Helper is offline. Start the protected local helper from your BoardForge workspace when you are ready to create or modify real KiCad files.',
  offlineDisplayMessage: 'Local engine not connected. Start the desktop helper when you are ready to create or modify real KiCad files.',
  endpoints: [
    'GET /health',
    'GET /status',
    'POST /intake/start',
    'POST /intake/answer',
    'GET /intake/session/:id',
    'POST /brief/generate',
    'POST /brief/approve',
    'POST /project/create',
    'GET /projects/dashboard',
    'GET /project/:id/status',
    'GET /project/:id/manifest',
    'GET /project/:id/dashboard',
    'GET /project/:id/reports',
    'GET /project/:id/downloads',
    'POST /project/:id/publish',
    'POST /project/:id/archive',
    'POST /project/:id/keep-local',
    'POST /project/:id/validate',
    'POST /project/:id/route',
    'POST /project/:id/repair',
    'POST /project/:id/export',
  ],
}

export async function callBoardForgeLocalEngine(path: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  headers.set('content-type', 'application/json')
  // Browser writes use an opaque token held only in sessionStorage. It is not
  // sent through a URL or body, and this client never logs it.
  if (typeof window !== 'undefined' && method === 'POST') {
    const pairingToken = getLocalEngineSessionToken()
    if (pairingToken) headers.set('x-boardforge-token', pairingToken)
  }
  const response = await fetch(`${BOARDFORGE_LOCAL_ENGINE_URL}${path}`, {
    ...options,
    headers,
  })
  return response.json()
}

export async function checkBoardForgeLocalEngine() {
  try {
    return await callBoardForgeLocalEngine('/health')
  } catch {
    return {
      ok: false,
      status: 'BOARD_FORGE_LOCAL_ENGINE_OFFLINE',
      errors: [{ message: localArtifactApiContract.offlineDisplayMessage }],
      data: { startCommand: 'Start the BoardForge desktop helper' },
      warnings: [],
      artifactPaths: [],
    }
  }
}

export function describeLocalArtifactAction(action: string) {
  return `Protected local engine action: ${action}`
}
