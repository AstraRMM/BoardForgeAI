import { okResponse, errorResponse } from './response-schema.mjs'

export async function routePairingRequest({ method, pathname, payload = {}, auth }) {
  if (!auth) return null
  if (method === 'GET' && pathname === '/pairing/code') {
    const status = auth.createCode()
    return okResponse({ status: 'BOARD_FORGE_PAIRING_CODE_CREATED', data: status })
  }
  if (method === 'POST' && pathname === '/pairing/verify') {
    const result = auth.verify({ code: payload.code, origin: payload.origin })
    if (!result.ok) return errorResponse({ status: 'BOARD_FORGE_PAIRING_FAILED', error: result.reason })
    return okResponse({ status: 'BOARD_FORGE_PAIRING_VERIFIED', data: result })
  }
  if (method === 'POST' && pathname === '/pairing/revoke') {
    return okResponse({ status: 'BOARD_FORGE_PAIRING_REVOKED', data: auth.revoke() })
  }
  if (method === 'GET' && pathname === '/pairing/status') {
    return okResponse({ status: 'BOARD_FORGE_PAIRING_STATUS', data: auth.status() })
  }
  return null
}
