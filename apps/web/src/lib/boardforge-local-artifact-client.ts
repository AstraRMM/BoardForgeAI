export const BOARDFORGE_LOCAL_ENGINE_URL = 'http://127.0.0.1:38991'

export const localArtifactApiContract = {
  mode: 'localhost local engine service',
  offlineMessage: 'BoardForge Local Engine is offline. Start it with: npm run boardforge:local-server',
  endpoints: [
    'GET /health',
    'GET /status',
    'POST /intake/start',
    'POST /intake/answer',
    'GET /intake/session/:id',
    'POST /brief/generate',
    'POST /brief/approve',
    'POST /project/create',
    'GET /project/:id/status',
    'GET /project/:id/manifest',
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
  const response = await fetch(`${BOARDFORGE_LOCAL_ENGINE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
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
      errors: [{ message: localArtifactApiContract.offlineMessage }],
      data: { startCommand: 'npm run boardforge:local-server' },
      warnings: [],
      artifactPaths: [],
    }
  }
}

export function describeLocalArtifactAction(action: string) {
  return `Local engine localhost action: ${action}`
}
