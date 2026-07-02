export const localArtifactApiContract = {
  mode: 'artifact-backed local workflow',
  offlineMessage: 'BoardForge Local Engine is offline. Start it to generate, route, repair, or export boards.',
  endpoints: [
    'GET /status',
    'POST /intake/start',
    'POST /intake/answer',
    'GET /intake/session/:id',
    'POST /brief/generate',
    'POST /brief/approve',
    'POST /project/create',
    'GET /project/:id/status',
    'POST /project/:id/publish',
    'POST /project/:id/archive',
    'POST /project/:id/keep-local',
    'GET /project/:id/downloads',
    'GET /project/:id/reports',
  ],
}

export function describeLocalArtifactAction(action: string) {
  return `Local engine artifact action: ${action}`
}
