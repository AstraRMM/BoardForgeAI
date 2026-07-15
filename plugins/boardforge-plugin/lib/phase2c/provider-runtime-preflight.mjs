const DEFAULT_MAX_AGE_MS = 5 * 60_000
import { createMouserProvider, getMouserApiKey } from '../sourcing/mouser-provider.mjs'
import { createDigiKeyAuthClient } from '../sourcing/digikey/digikey-auth-client.mjs'
import { createDigiKeyApiClient } from '../sourcing/digikey/digikey-api-client.mjs'
import { lookupDigiKeyProductInfoV4 } from '../sourcing/digikey/digikey-product-info-v4.mjs'
import { normalizeDigiKeyError } from '../sourcing/digikey/digikey-errors.mjs'

export async function runDigiKeyRuntimeProbe({ env = process.env, fetchImpl = globalThis.fetch, mpn = 'RC0603FR-0710KL', authClient, apiClient } = {}) {
  const auth = authClient || createDigiKeyAuthClient({ env, fetchImpl })
  const health = await auth.healthCheck()
  if (!health.configured) return { configured: false, authenticated: false, request: null }
  const started = Date.now()
  try {
    const client = apiClient || createDigiKeyApiClient({ env, fetchImpl, authClient: auth })
    const result = await lookupDigiKeyProductInfoV4({ query: { mpn, limit: 5 }, apiClient: client })
    const selectedMpn = result?.selected?.manufacturerPartNumber || result?.selected?.mpn || null
    const exact = selectedMpn && selectedMpn.toLowerCase() === mpn.toLowerCase()
    return {
      configured: true,
      authenticated: true,
      request: {
        attempted: true, ok: Boolean(exact), observedAt: result.lastChecked || new Date().toISOString(),
        httpStatus: exact ? 200 : null, latencyMs: Date.now() - started,
        evidenceKind: exact ? 'digikey_productinformation_v4_exact_mpn' : null,
        errorCode: exact ? null : 'DIGIKEY_EXACT_MPN_NOT_RETURNED',
      },
    }
  } catch (error) {
    const normalized = normalizeDigiKeyError(error)
    return {
      configured: true, authenticated: health.authenticated,
      request: { attempted: true, ok: false, observedAt: new Date().toISOString(), httpStatus: Number.isInteger(normalized?.details?.status) ? normalized.details.status : null, latencyMs: Date.now() - started, evidenceKind: null, errorCode: normalized.status || 'DIGIKEY_LIVE_LOOKUP_FAILED' },
    }
  }
}

export async function runMouserRuntimeProbe({ env = process.env, fetchImpl = globalThis.fetch, partNumber = 'RC0603FR-0710KL' } = {}) {
  const configured = Boolean(getMouserApiKey(env))
  if (!configured) return { configured: false, authenticated: false, request: null }
  const started = Date.now()
  const result = await createMouserProvider({ env, fetchImpl, liveLookup: true }).verifyPart({ mpn: partNumber })
  const evidence = result?.evidence || {}
  const ok = evidence.liveApiEvidence === true
    && Boolean(evidence.requestId)
    && Boolean(evidence.queriedAt)
    && !['ERROR', 'NOT_CHECKED'].includes(result.sourcingStatus)
  return {
    configured: true,
    authenticated: true,
    request: {
      attempted: true,
      ok,
      observedAt: evidence.queriedAt || new Date().toISOString(),
      httpStatus: evidence.httpStatus ?? null,
      latencyMs: Date.now() - started,
      evidenceKind: ok ? 'mouser_search_api_response' : null,
      errorCode: ok ? null : result.risk || 'MOUSER_LIVE_LOOKUP_FAILED',
    },
  }
}

export function classifyProviderRuntime(input, { now = new Date(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const provider = String(input?.provider || 'unknown').toLowerCase()
  const configured = input?.configured === true
  const authenticated = input?.authenticated === true
  const request = input?.request || null
  let status = 'NOT_CONFIGURED'
  if (configured) status = authenticated ? 'AUTHENTICATED_NOT_LIVE_VERIFIED' : 'CONFIGURED_NOT_AUTHENTICATED'
  if (configured && request?.attempted === true && request?.ok !== true) status = 'LIVE_REQUEST_FAILED'
  if (configured && request?.ok === true) {
    const observed = Date.parse(request.observedAt || '')
    status = Number.isFinite(observed) && now.getTime() - observed <= maxAgeMs && now.getTime() >= observed
      ? 'LIVE_VERIFIED' : 'STALE_OR_INVALID_LIVE_EVIDENCE'
  }
  return {
    provider, status, ready: status === 'LIVE_VERIFIED', configured, authenticated,
    runtime: {
      attempted: request?.attempted === true,
      ok: request?.ok === true,
      observedAt: request?.observedAt || null,
      httpStatus: Number.isInteger(request?.httpStatus) ? request.httpStatus : null,
      latencyMs: Number.isFinite(request?.latencyMs) ? request.latencyMs : null,
      evidenceKind: request?.evidenceKind || null,
      errorCode: request?.errorCode || null,
    },
  }
}

export function buildProviderRuntimePreflight({ digikey, mouser, generatedAt = new Date().toISOString(), maxAgeMs } = {}) {
  const now = new Date(generatedAt)
  const providers = [
    classifyProviderRuntime({ provider:'digikey', ...digikey }, { now, maxAgeMs }),
    classifyProviderRuntime({ provider:'mouser', ...mouser }, { now, maxAgeMs }),
  ]
  return {
    schema:'boardforge.phase2c.provider-runtime-preflight.v1', generatedAt,
    status:providers.every(row=>row.ready) ? 'PROVIDERS_READY' : 'PROVIDERS_BLOCKED',
    providers,
    containsSecrets:false,
  }
}
