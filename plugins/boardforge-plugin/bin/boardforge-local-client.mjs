#!/usr/bin/env node
import { DEFAULT_LOCAL_SERVER_PORT } from '../lib/platform/local-server/request-validator.mjs'

const command = process.argv[2] || 'status'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

const baseUrl = argValue('--url', `http://127.0.0.1:${DEFAULT_LOCAL_SERVER_PORT}`)

const routeMap = {
  health: ['GET', '/health'],
  status: ['GET', '/status'],
  readiness: ['GET', '/readiness'],
  fixtures: ['GET', '/fixtures'],
  sourcing: ['GET', '/sourcing/status'],
  'start-intake': ['POST', '/intake/start'],
  answer: ['POST', '/intake/answer'],
  'generate-brief': ['POST', '/brief/generate'],
  'approve-brief': ['POST', '/brief/approve'],
  'create-project': ['POST', '/project/create'],
  'project-status': ['GET', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/status`],
  publish: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/publish`],
  archive: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/archive`],
  'keep-local': ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/keep-local`],
  downloads: ['GET', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/downloads`],
  reports: ['GET', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/reports`],
  validate: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/validate`],
  route: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/route`],
  repair: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/repair`],
  export: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/export`],
  review: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/review`],
  health: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/health`],
  risk: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/risk`],
  routeability: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/routeability`],
  diff: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/diff`],
  lessons: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/lessons`],
  preview: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/preview`],
  blockers: ['POST', `/project/${encodeURIComponent(argValue('--project-id', 'BoardForge_Local_Intake'))}/blockers`],
  'start-job': ['POST', '/jobs/start'],
  'job-status': ['GET', `/jobs/${encodeURIComponent(argValue('--job-id', 'missing-job'))}`],
  'job-log': ['GET', `/jobs/${encodeURIComponent(argValue('--job-id', 'missing-job'))}/log`],
  'cancel-job': ['POST', `/jobs/${encodeURIComponent(argValue('--job-id', 'missing-job'))}/cancel`],
}

const [method, pathname] = routeMap[command] || routeMap.status
const payload = {
  prompt: argValue('--prompt', undefined),
  projectId: argValue('--project-id', undefined),
  projectDir: argValue('--project-dir', undefined),
  sessionFile: argValue('--session', undefined),
  oddShapeProof: hasFlag('--odd-shape-proof') || undefined,
  confirm: hasFlag('--confirm') || undefined,
  type: argValue('--type', undefined),
  compareToDir: argValue('--compare-to-dir', undefined),
}

const response = await fetch(`${baseUrl}${pathname}`, {
  method,
  headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
  body: method === 'POST' ? JSON.stringify(stripUndefined(payload)) : undefined,
})

console.log(JSON.stringify(await response.json(), null, 2))
process.exit(response.ok ? 0 : 1)

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}
