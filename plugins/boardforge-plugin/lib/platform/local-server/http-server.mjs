import http from 'node:http'
import path from 'node:path'
import { createLocalServerRouter } from './routes.mjs'
import { assertLocalhostRequest, DEFAULT_LOCAL_SERVER_HOST, DEFAULT_LOCAL_SERVER_PORT } from './request-validator.mjs'
import { errorResponse } from './response-schema.mjs'
import { appendRequestLog } from './request-log.mjs'
import { appendAuditLog } from './audit-log.mjs'
import { createLocalEngineAuth } from '../security/local-engine-auth.mjs'
import { allowedOriginsFromEnv } from '../security/origin-allowlist.mjs'

export function startBoardForgeLocalServer({ rootDir, port = DEFAULT_LOCAL_SERVER_PORT, host = DEFAULT_LOCAL_SERVER_HOST, logDir = null } = {}) {
  if (!rootDir) throw new Error('rootDir is required')
  const effectiveLogDir = logDir || path.join(rootDir, '.boardforge-local-server')
  const auth = createLocalEngineAuth({ allowedOrigins: allowedOriginsFromEnv() })
  const router = createLocalServerRouter({ rootDir, logDir: effectiveLogDir, auth })
  const server = http.createServer(async (req, res) => {
    const route = req.url || '/'
    let response
    try {
      assertLocalhostRequest(req)
      const body = await readBody(req)
      const payload = body ? JSON.parse(body) : {}
      const url = new URL(req.url || '/', `http://${host}:${port || DEFAULT_LOCAL_SERVER_PORT}`)
      const authResult = auth.requireToken({
        method: req.method,
        token: req.headers['x-boardforge-token'] || payload.pairingToken,
        origin: req.headers.origin,
      })
      const publicPost = ['/pairing/verify', '/pairing/revoke'].includes(url.pathname)
      if (!authResult.allowed && req.method !== 'OPTIONS' && !publicPost) {
        throw Object.assign(new Error(authResult.reason), { status: 'BOARD_FORGE_LOCAL_ENGINE_AUTH_REQUIRED' })
      }
      response = await router({ method: req.method, pathname: url.pathname, payload, query: url.searchParams })
      await appendAuditLog({
        logDir: effectiveLogDir,
        action: `${req.method} ${url.pathname}`,
        projectDir: payload.projectDir || url.searchParams.get('projectDir'),
        result: response.status,
        blockedReason: response.ok ? null : response.errors?.[0]?.message,
      })
    } catch (error) {
      response = errorResponse({ status: error.status || 'BOARD_FORGE_LOCAL_SERVER_REQUEST_ERROR', error })
    }

    await appendRequestLog({
      logDir: effectiveLogDir,
      route,
      method: req.method,
      status: response.status,
      ok: response.ok,
      projectDir: response.data?.projectDir || response.data?.projectStatus?.projectDir || null,
      artifactPaths: response.artifactPaths || [],
    })

    res.writeHead(response.ok ? 200 : 400, {
      'content-type': 'application/json',
      'access-control-allow-origin': 'http://localhost:3000',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-boardforge-token',
    })
    res.end(JSON.stringify(response, null, 2))
  })
  server.listen(port, host)
  return server
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'OPTIONS') return resolve('')
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
