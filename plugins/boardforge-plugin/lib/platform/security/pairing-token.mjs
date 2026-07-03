import { randomBytes, createHash } from 'node:crypto'

export function createPairingCode({ now = new Date() } = {}) {
  const code = randomBytes(3).toString('hex').toUpperCase()
  return {
    code,
    codeHash: hashPairingSecret(code),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    attempts: 0,
    paired: false,
  }
}

export function hashPairingSecret(secret) {
  return createHash('sha256').update(String(secret || '')).digest('hex')
}

export function verifyPairingCode(state, code, { now = new Date() } = {}) {
  if (!state?.codeHash) return { ok: false, reason: 'PAIRING_CODE_NOT_CREATED' }
  if (new Date(state.expiresAt).getTime() < now.getTime()) return { ok: false, reason: 'PAIRING_CODE_EXPIRED' }
  if (hashPairingSecret(code) !== state.codeHash) return { ok: false, reason: 'PAIRING_CODE_INVALID' }
  const token = randomBytes(24).toString('hex')
  return {
    ok: true,
    token,
    tokenHash: hashPairingSecret(token),
    pairedAt: now.toISOString(),
  }
}

export function isSessionTokenValid(state, token) {
  return Boolean(state?.paired && state?.tokenHash && hashPairingSecret(token) === state.tokenHash)
}
