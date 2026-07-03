export type BoardForgeJobStatus = {
  jobId: string
  projectId: string
  type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  progress: number
  stage: string
  logs: Array<{ timestamp: string; message: string }>
  artifactPaths: string[]
  error: { message: string } | null
}

export const localJobRoutes = {
  start: 'POST /jobs/start',
  status: 'GET /jobs/:id',
  log: 'GET /jobs/:id/log',
  cancel: 'POST /jobs/:id/cancel',
  retry: 'POST /jobs/:id/retry',
  projectJobs: 'GET /projects/:id/jobs',
}

const DEFAULT_ENGINE = 'http://127.0.0.1:38991'

export async function startBoardForgeJob({ type, projectId, projectDir, baseUrl = DEFAULT_ENGINE }: { type: string; projectId: string; projectDir?: string; baseUrl?: string }) {
  return callJobApi(`${baseUrl}/jobs/start`, { method: 'POST', body: JSON.stringify({ type, projectId, projectDir }) })
}

export async function getBoardForgeJob(jobId: string, baseUrl = DEFAULT_ENGINE) {
  return callJobApi(`${baseUrl}/jobs/${encodeURIComponent(jobId)}`)
}

export async function getBoardForgeJobLog(jobId: string, baseUrl = DEFAULT_ENGINE) {
  return callJobApi(`${baseUrl}/jobs/${encodeURIComponent(jobId)}/log`)
}

export async function cancelBoardForgeJob(jobId: string, baseUrl = DEFAULT_ENGINE) {
  return callJobApi(`${baseUrl}/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' })
}

export async function retryBoardForgeJob(jobId: string, baseUrl = DEFAULT_ENGINE) {
  return callJobApi(`${baseUrl}/jobs/${encodeURIComponent(jobId)}/retry`, { method: 'POST' })
}

async function callJobApi(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } })
  const json = await response.json()
  if (!json.ok) throw new Error(json.errors?.[0]?.message || json.status || 'BoardForge job request failed')
  return json
}

export function demoJobStatus(type = 'run_board_review'): BoardForgeJobStatus {
  return {
    jobId: 'local-artifact-demo-job',
    projectId: 'local-project',
    type,
    status: 'succeeded',
    progress: 100,
    stage: 'complete',
    logs: [
      { timestamp: 'local', message: 'Job is executed by the installed BoardForge Local Engine bridge.' },
      { timestamp: 'local', message: 'The live website polls job status instead of faking cloud execution.' },
    ],
    artifactPaths: ['BoardForge_Board_Review_Report.md', 'BoardForge_Project_Health_Score.json'],
    error: null,
  }
}
