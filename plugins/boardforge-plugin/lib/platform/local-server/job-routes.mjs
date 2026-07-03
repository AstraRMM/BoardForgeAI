import path from 'node:path'
import { okResponse, errorResponse } from './response-schema.mjs'
import { validateProjectPath } from './request-validator.mjs'

export async function routeJobRequest({ method, pathname, payload = {}, query = new URLSearchParams(), rootDir, jobs }) {
  if (method === 'POST' && pathname === '/jobs/start') {
    const projectId = payload.projectId || 'BoardForge_Local_Project'
    const projectDir = payload.projectDir || path.join(rootDir, projectId)
    const guard = validateProjectPath(projectDir)
    if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_JOB_REFUSED', error: guard.reason })
    const job = await jobs.start({ type: payload.type, projectId, payload: { ...payload, projectDir } })
    return okResponse({ status: 'BOARD_FORGE_JOB_STARTED', data: job, artifactPaths: job.artifactPaths })
  }

  const jobMatch = pathname.match(/^\/jobs\/([^/]+)\/?([^/]*)$/)
  if (jobMatch) {
    const jobId = decodeURIComponent(jobMatch[1])
    const action = jobMatch[2] || 'status'
    if (method === 'GET' && action === 'status') return okResponse({ status: 'BOARD_FORGE_JOB_STATUS', data: await jobs.get(jobId) })
    if (method === 'GET' && action === 'log') return okResponse({ status: 'BOARD_FORGE_JOB_LOG', data: await jobs.log(jobId) })
    if (method === 'POST' && action === 'cancel') return okResponse({ status: 'BOARD_FORGE_JOB_CANCELED', data: await jobs.cancel(jobId) })
    if (method === 'POST' && action === 'retry') return okResponse({ status: 'BOARD_FORGE_JOB_RETRIED', data: await jobs.retry(jobId) })
  }

  const projectJobs = pathname.match(/^\/projects\/([^/]+)\/jobs$/)
  if (method === 'GET' && projectJobs) {
    const projectId = decodeURIComponent(projectJobs[1])
    return okResponse({ status: 'BOARD_FORGE_PROJECT_JOBS', data: { projectId, jobs: await jobs.listForProject(projectId) } })
  }

  return null
}
