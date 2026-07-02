import path from 'node:path'
import { assertPathIsAllowed } from '../protected-path-guard.mjs'

export const DEFAULT_LOCAL_SERVER_HOST = '127.0.0.1'
export const DEFAULT_LOCAL_SERVER_PORT = 38991

export function assertLocalhostRequest(req) {
  const remote = req.socket?.remoteAddress || ''
  const allowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost', '']
  if (!allowed.includes(remote)) {
    const error = new Error(`remote access refused from ${remote}`)
    error.status = 'BOARD_FORGE_LOCAL_SERVER_REMOTE_ACCESS_REFUSED'
    throw error
  }
}

export function validateProjectPath(projectDir) {
  if (!projectDir) return { allowed: false, reason: 'missing_project_dir' }
  const guard = assertPathIsAllowed(path.resolve(projectDir))
  return guard
}

export function requirePublishConfirm(payload = {}) {
  if (payload.confirm !== true) {
    const error = new Error('publish requires explicit confirm=true')
    error.status = 'BOARD_FORGE_PUBLISH_BLOCKED_CONFIRM_REQUIRED'
    throw error
  }
}
