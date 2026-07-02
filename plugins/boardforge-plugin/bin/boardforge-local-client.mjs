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
}

const [method, pathname] = routeMap[command] || routeMap.status
const payload = {
  prompt: argValue('--prompt', undefined),
  projectId: argValue('--project-id', undefined),
  projectDir: argValue('--project-dir', undefined),
  sessionFile: argValue('--session', undefined),
  oddShapeProof: hasFlag('--odd-shape-proof') || undefined,
  confirm: hasFlag('--confirm') || undefined,
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
