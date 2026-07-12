import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const authFile = (workspace) => path.join(workspace, '.boardforge', 'auth.json')

async function readState(workspace) {
  try { return JSON.parse(await readFile(authFile(workspace), 'utf8')) } catch { return null }
}

async function writeState(workspace, state) {
  await mkdir(path.dirname(authFile(workspace)), { recursive: true })
  await writeFile(authFile(workspace), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export async function localAuthStatus(workspace) {
  const state = await readState(workspace)
  return state ? { status: 'paired', deviceId: state.deviceId, pairedAt: state.pairedAt, origin: state.origin } : { status: 'not_paired' }
}

export async function pairLocalEngine({ workspace, code, deviceName, origin = process.env.BOARDFORGE_AUTH_ORIGIN }) {
  if (!origin) throw new Error('BOARDFORGE_AUTH_ORIGIN is required to pair a local engine.')
  const response = await fetch(new URL('/api/auth/plugin/pairing/claim', origin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, deviceName }) })
  const payload = await response.json()
  if (!response.ok || !payload.token || !payload.deviceId) throw new Error(payload.reason || 'Pairing was rejected by BoardForge account services.')
  await writeState(workspace, { deviceId: payload.deviceId, token: payload.token, origin: new URL(origin).origin, pairedAt: new Date().toISOString() })
  return { status: 'paired', deviceId: payload.deviceId }
}

export async function verifyLocalEngineSession(workspace) {
  const state = await readState(workspace)
  if (!state?.token || !state.origin) return { status: 'not_paired' }
  const response = await fetch(new URL('/api/auth/plugin/pairing/verify', state.origin), { headers: { authorization: `Bearer ${state.token}` } })
  if (!response.ok) return { status: 'revoked_or_invalid' }
  const payload = await response.json()
  return { status: 'paired', deviceId: payload.device?.deviceId || state.deviceId }
}

export async function logoutLocalEngine(workspace) {
  await writeState(workspace, { status: 'logged_out', loggedOutAt: new Date().toISOString() })
  return { status: 'logged_out' }
}
