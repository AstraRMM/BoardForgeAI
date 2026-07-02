import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createLocalArtifactApi } from '../local-artifact-api.mjs'
import { runOddShapeWebFlowProof } from '../../engine/odd-shape-web-flow-proof.mjs'
import { okResponse, errorResponse, routeNotFound } from './response-schema.mjs'
import { requirePublishConfirm, validateProjectPath } from './request-validator.mjs'

export function createLocalServerRouter({ rootDir, logDir } = {}) {
  const api = createLocalArtifactApi({ rootDir })

  return async function routeLocalServer({ method, pathname, payload = {}, query = new URLSearchParams() }) {
    try {
      if (method === 'GET' && pathname === '/health') {
        return okResponse({ status: 'BOARD_FORGE_LOCAL_SERVER_HEALTHY', data: { service: 'BoardForge Local Engine Service', rootDir, localhostOnly: true } })
      }
      if (method === 'GET' && pathname === '/status') {
        return okResponse({ status: 'BOARD_FORGE_LOCAL_SERVER_STATUS', data: { ...(await api.status()), port: 38991, logDir } })
      }
      if (method === 'POST' && pathname === '/intake/start') {
        const result = await api.startIntake(payload)
        return okResponse({ status: 'BOARD_FORGE_INTAKE_STARTED', data: result, artifactPaths: [result.sessionFile, ...(Object.values(result.briefFiles || {}))] })
      }
      if (method === 'POST' && pathname === '/intake/answer') {
        const result = await api.answerIntake(payload)
        return okResponse({ status: 'BOARD_FORGE_INTAKE_ANSWERED', data: result, artifactPaths: [result.sessionFile, ...(Object.values(result.briefFiles || {}))] })
      }
      const intakeSession = pathname.match(/^\/intake\/session\/(.+)$/)
      if (method === 'GET' && intakeSession) {
        const sessionFile = query.get('sessionFile') || path.join(rootDir, decodeURIComponent(intakeSession[1]), 'BoardForge_Conversation_Session.json')
        return okResponse({ status: 'BOARD_FORGE_INTAKE_SESSION', data: JSON.parse(await readFile(sessionFile, 'utf8')), artifactPaths: [sessionFile] })
      }
      if (method === 'POST' && pathname === '/brief/generate') {
        const result = await api.generateBrief(payload)
        return okResponse({ status: 'BOARD_FORGE_BRIEF_GENERATED', data: result, artifactPaths: Object.values(result.files || {}) })
      }
      if (method === 'POST' && pathname === '/brief/approve') {
        const result = await api.approveBrief(payload)
        return okResponse({ status: 'BOARD_FORGE_BRIEF_APPROVED', data: result, artifactPaths: [result.sessionFile, ...(Object.values(result.briefFiles || {}))] })
      }
      if (method === 'POST' && pathname === '/project/create') {
        if (payload.oddShapeProof === true) {
          const projectDir = payload.projectDir || path.join(rootDir, payload.projectId || 'BF-LOCALHOST-SERVICE-DEMO-01_REV_A')
          const guard = validateProjectPath(projectDir)
          if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_PROJECT_CREATE_REFUSED', error: guard.reason })
          const result = await runOddShapeWebFlowProof({ projectDir })
          return okResponse({ status: 'BOARD_FORGE_PROJECT_CREATED_BY_LOCALHOST_SERVICE', data: result, artifactPaths: [result.projectFiles.pcb, result.manufacturing.zip] })
        }
        const result = await api.createProject(payload)
        return okResponse({ status: result.status, data: result, artifactPaths: [result.manifestPath, ...(Object.values(result.projectFiles || {}))].filter(Boolean) })
      }

      const projectRoute = pathname.match(/^\/project\/([^/]+)\/?([^/]*)$/)
      if (projectRoute) {
        const projectId = decodeURIComponent(projectRoute[1])
        const action = projectRoute[2] || 'status'
        const projectDir = payload.projectDir || query.get('projectDir') || path.join(rootDir, projectId)
        const guard = validateProjectPath(projectDir)
        if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_PROJECT_PATH_REFUSED', error: guard.reason })

        if (method === 'GET' && action === 'status') return okResponse({ status: 'BOARD_FORGE_PROJECT_STATUS', data: await api.projectStatus({ projectDir }) })
        if (method === 'GET' && action === 'manifest') return okResponse({ status: 'BOARD_FORGE_PROJECT_MANIFEST', data: JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8')), artifactPaths: [path.join(projectDir, 'BoardForge_Project_Manifest.json')] })
        if (method === 'GET' && action === 'reports') return okResponse({ status: 'BOARD_FORGE_PROJECT_REPORTS', data: await api.reports({ projectDir }), artifactPaths: [path.join(projectDir, 'BoardForge_Project_Manifest.json')] })
        if (method === 'GET' && action === 'downloads') return okResponse({ status: 'BOARD_FORGE_PROJECT_DOWNLOADS', data: await api.downloads({ projectDir }), artifactPaths: [path.join(projectDir, 'BoardForge_Downloads_Manifest.json')] })
        if (method === 'POST' && action === 'publish') {
          requirePublishConfirm(payload)
          const result = await api.publishProject({ projectDir, confirm: true })
          return okResponse({ status: result.status, data: result, artifactPaths: [path.join(projectDir, 'BoardForge_Project_Manifest.json')] })
        }
        if (method === 'POST' && action === 'archive') return okResponse({ status: 'BOARD_FORGE_PROJECT_ARCHIVED', data: await api.archiveProject({ projectDir }) })
        if (method === 'POST' && action === 'keep-local') return okResponse({ status: 'BOARD_FORGE_PROJECT_KEPT_LOCAL', data: await api.keepLocal({ projectDir }) })
        if (method === 'POST' && ['validate', 'route', 'repair', 'export'].includes(action)) {
          const status = await api.projectStatus({ projectDir })
          return okResponse({
            status: `BOARD_FORGE_PROJECT_${action.toUpperCase()}_LOCAL_ALPHA_RECORDED`,
            data: { action, projectDir, projectStatus: status, sandboxRequired: true, noFakeCloudExecution: true },
            warnings: [`${action} is local-engine guarded; this alpha route records the action and reads local validation artifacts.`],
          })
        }
      }

      return routeNotFound({ method, pathname })
    } catch (error) {
      return errorResponse({ status: error.status || 'BOARD_FORGE_LOCAL_SERVER_ROUTE_ERROR', error })
    }
  }
}
