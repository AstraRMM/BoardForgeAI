import http from 'node:http'
import { createLocalArtifactApi } from './local-artifact-api.mjs'

export function startLocalArtifactApiServer({ rootDir, port = 47322 } = {}) {
  const api = createLocalArtifactApi({ rootDir })
  const server = http.createServer(async (req, res) => {
    try {
      const body = await readBody(req)
      const payload = body ? JSON.parse(body) : {}
      const url = new URL(req.url, `http://localhost:${port}`)
      const result = await route(api, req.method, url.pathname, payload)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(result, null, 2))
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'BOARD_FORGE_LOCAL_ARTIFACT_API_ERROR', message: error.message }, null, 2))
    }
  })
  server.listen(port)
  return server
}

async function route(api, method, pathname, payload) {
  if (method === 'GET' && pathname === '/status') return api.status()
  if (method === 'POST' && pathname === '/intake/start') return api.startIntake(payload)
  if (method === 'POST' && pathname === '/intake/answer') return api.answerIntake(payload)
  if (method === 'POST' && pathname === '/brief/generate') return api.generateBrief(payload)
  if (method === 'POST' && pathname === '/brief/approve') return api.approveBrief(payload)
  if (method === 'POST' && pathname === '/project/create') return api.createProject(payload)
  if (method === 'POST' && pathname.endsWith('/publish')) return api.publishProject(payload)
  if (method === 'POST' && pathname.endsWith('/archive')) return api.archiveProject(payload)
  if (method === 'POST' && pathname.endsWith('/keep-local')) return api.keepLocal(payload)
  if (method === 'GET' && pathname.includes('/downloads')) return api.downloads(payload)
  if (method === 'GET' && pathname.includes('/reports')) return api.reports(payload)
  if (method === 'GET' && pathname.includes('/project/')) return api.projectStatus(payload)
  return { status: 'BOARD_FORGE_LOCAL_ARTIFACT_API_ROUTE_NOT_IMPLEMENTED', method, pathname }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
