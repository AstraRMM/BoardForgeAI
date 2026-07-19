import { BOARDFORGE_LOCAL_ENGINE_URL } from './boardforge-local-artifact-client'
import { clearLocalEngineSessionToken, getLocalEngineSessionToken, storeLocalEngineSessionToken } from './boardforge-local-engine-session'

export const pairingRoutes = {
  code: 'GET /pairing/code',
  verify: 'POST /pairing/verify',
  revoke: 'POST /pairing/revoke',
  status: 'GET /pairing/status',
}

type PairingEnvelope = { ok?: boolean; status?: string; data?: { code?: string; expiresAt?: string; token?: string; status?: { paired?: boolean } }; errors?: Array<{ message?: string }> }
export type BrowserPairingCode = { code: string; expiresAt: string | null }

export function hasLocalEngineBrowserSession() { return Boolean(getLocalEngineSessionToken()) }
export function clearLocalEngineBrowserSession() { clearLocalEngineSessionToken() }

export async function requestLocalEnginePairingCode(): Promise<BrowserPairingCode> {
  const response = await fetch(`${BOARDFORGE_LOCAL_ENGINE_URL}/pairing/code`, { cache: 'no-store' })
  const payload = await readPairingResponse(response)
  if (!response.ok || payload.ok === false || !payload.data?.code) throw new Error(pairingError(payload, 'The local engine could not create a pairing code.'))
  return { code: payload.data.code, expiresAt: payload.data.expiresAt || null }
}

export async function verifyLocalEngineBrowserSession(code: string) {
  const response = await fetch(`${BOARDFORGE_LOCAL_ENGINE_URL}/pairing/verify`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase() }),
  })
  const payload = await readPairingResponse(response)
  if (!response.ok || payload.ok === false || !payload.data?.token) throw new Error(pairingError(payload, 'The pairing code was rejected by the local engine.'))
  storeLocalEngineSessionToken(payload.data.token)
  return payload.data.status || { paired: true }
}

async function readPairingResponse(response: Response): Promise<PairingEnvelope> {
  try { return await response.json() as PairingEnvelope } catch { return { status: `HTTP_${response.status}`, errors: [{ message: 'The local engine returned an unreadable pairing response.' }] } }
}
function pairingError(payload: PairingEnvelope, fallback: string) { return payload.errors?.[0]?.message || payload.status || fallback }

export function pairingInstructions() {
  return {
    status: 'PAIR_WITH_INSTALLED_LOCAL_ENGINE',
    copy: 'Enter the one-time pairing code from the installed BoardForge Local Engine. Browser-origin POST actions require a local session token.',
    routes: pairingRoutes,
  }
}
