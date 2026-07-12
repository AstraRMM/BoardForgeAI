import { createHash, randomBytes } from 'node:crypto'
import { getAuthPool } from './auth'

export type LicenseState = 'FREE_TRIAL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ADMIN' | 'DEV_LICENSE'
export type PairingCode = { code: string; expiresAt: string; pairingId: string }
const PAIRING_TTL_MS = 10 * 60 * 1000
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const newCode = () => { const raw = randomBytes(6).toString('hex').toUpperCase(); return `BF-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}` }

export async function ensureAccessSchema() {
  const pool = getAuthPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS boardforge_licenses (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, state TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free_trial', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS boardforge_devices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL, revoked_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS boardforge_pairing_codes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, license_id TEXT, code_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, device_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS boardforge_audit_logs (id TEXT PRIMARY KEY, user_id TEXT, event TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
  `)
}

async function audit(userId: string | null, event: string, metadata: Record<string, unknown>) {
  await getAuthPool().query('INSERT INTO boardforge_audit_logs (id, user_id, event, metadata) VALUES ($1, $2, $3, $4)', [randomBytes(16).toString('hex'), userId, event, JSON.stringify(metadata)])
}

export async function createPairingCode(userId: string): Promise<PairingCode> {
  await ensureAccessSchema()
  const code = newCode(), pairingId = randomBytes(16).toString('hex'), expiresAt = new Date(Date.now() + PAIRING_TTL_MS)
  await getAuthPool().query('INSERT INTO boardforge_pairing_codes (id, user_id, code_hash, expires_at) VALUES ($1, $2, $3, $4)', [pairingId, userId, hash(code), expiresAt])
  await audit(userId, 'plugin_pairing_started', { pairingId, expiresAt: expiresAt.toISOString() })
  return { code, pairingId, expiresAt: expiresAt.toISOString() }
}

export async function claimPairingCode(code: string, deviceName: string) {
  await ensureAccessSchema()
  const pool = getAuthPool()
  const result = await pool.query('SELECT id, user_id FROM boardforge_pairing_codes WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE', [hash(code.trim().toUpperCase())])
  const pairing = result.rows[0]
  if (!pairing) throw new Error('Pairing code is invalid, expired, or already used.')
  const deviceId = randomBytes(16).toString('hex'), token = `bf_device_${randomBytes(32).toString('base64url')}`
  await pool.query('INSERT INTO boardforge_devices (id, user_id, name, token_hash, last_seen_at) VALUES ($1, $2, $3, $4, NOW())', [deviceId, pairing.user_id, deviceName.slice(0, 100) || 'BoardForge Local Engine', hash(token)])
  await pool.query('UPDATE boardforge_pairing_codes SET used_at = NOW(), device_id = $1 WHERE id = $2', [deviceId, pairing.id])
  await audit(pairing.user_id, 'plugin_pairing_claimed', { pairingId: pairing.id, deviceId, deviceName })
  return { deviceId, token, userId: pairing.user_id }
}

export async function verifyDeviceToken(token: string) {
  const pool = getAuthPool(), result = await pool.query('SELECT id, user_id, name, revoked_at FROM boardforge_devices WHERE token_hash = $1', [hash(token)])
  const device = result.rows[0]
  if (!device || device.revoked_at) return null
  await pool.query('UPDATE boardforge_devices SET last_seen_at = NOW() WHERE id = $1', [device.id])
  return { deviceId: device.id as string, userId: device.user_id as string, name: device.name as string }
}

export async function revokeDevice(userId: string, deviceId: string) {
  const result = await getAuthPool().query('UPDATE boardforge_devices SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL', [deviceId, userId])
  if (result.rowCount !== 1) throw new Error('Device was not found or is already revoked.')
  await audit(userId, 'plugin_device_revoked', { deviceId })
}

export async function listDevices(userId: string) {
  await ensureAccessSchema()
  const result = await getAuthPool().query('SELECT id, name, revoked_at, last_seen_at, created_at FROM boardforge_devices WHERE user_id = $1 ORDER BY created_at DESC', [userId])
  return result.rows
}
