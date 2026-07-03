import { createPairingCode, verifyPairingCode, isSessionTokenValid } from './pairing-token.mjs'
import { isOriginAllowed } from './origin-allowlist.mjs'

export function createLocalEngineAuth({ allowedOrigins } = {}) {
  let pairingState = null
  const failedAttempts = []

  return {
    createCode() {
      pairingState = createPairingCode()
      return publicState(pairingState)
    },
    verify({ code, origin }) {
      if (origin && !isOriginAllowed(origin, allowedOrigins)) {
        failedAttempts.push({ timestamp: new Date().toISOString(), origin, reason: 'ORIGIN_NOT_ALLOWED' })
        return { ok: false, reason: 'ORIGIN_NOT_ALLOWED' }
      }
      const result = verifyPairingCode(pairingState, code)
      if (!result.ok) {
        failedAttempts.push({ timestamp: new Date().toISOString(), origin, reason: result.reason })
        pairingState = { ...(pairingState || {}), attempts: (pairingState?.attempts || 0) + 1 }
        return result
      }
      pairingState = { ...pairingState, paired: true, tokenHash: result.tokenHash, pairedAt: result.pairedAt }
      return { ok: true, token: result.token, status: publicState(pairingState) }
    },
    revoke() {
      pairingState = pairingState ? { ...pairingState, paired: false, tokenHash: null, revokedAt: new Date().toISOString() } : null
      return publicState(pairingState)
    },
    status() {
      return { ...publicState(pairingState), failedAttempts }
    },
    requireToken({ token, origin, method = 'GET', requirePairing = process.env.BOARDFORGE_REQUIRE_PAIRING === 'true' } = {}) {
      if (origin && !isOriginAllowed(origin, allowedOrigins)) return { allowed: false, reason: 'ORIGIN_NOT_ALLOWED' }
      if (method === 'GET') return { allowed: true, reason: null }
      if (!origin && !requirePairing) return { allowed: true, reason: null }
      if (isSessionTokenValid(pairingState, token)) return { allowed: true, reason: null }
      return { allowed: false, reason: 'PAIRING_TOKEN_REQUIRED' }
    },
  }
}

function publicState(state) {
  return {
    paired: Boolean(state?.paired),
    code: state?.paired ? null : state?.code,
    createdAt: state?.createdAt || null,
    expiresAt: state?.expiresAt || null,
    pairedAt: state?.pairedAt || null,
    attempts: state?.attempts || 0,
  }
}
