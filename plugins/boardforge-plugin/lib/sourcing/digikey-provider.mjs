import { createUnavailableProvider, normalizePartVerification, SOURCING_STATUSES } from './part-source-provider.mjs'

export function createDigikeyProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const requiredEnv = ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET', 'DIGIKEY_OAUTH_TOKEN_URL', 'DIGIKEY_BASE_URL']
  const configured = requiredEnv.every((name) => env[name])
  if (!configured || typeof fetchImpl !== 'function') {
    return createUnavailableProvider({
      id: 'digikey',
      name: 'Digi-Key',
      requiredEnv,
      supportedCapabilities: ['stock', 'pricing', 'lifecycle', 'datasheet'],
    })
  }
  return {
    id: 'digikey',
    name: 'Digi-Key',
    requiredEnv,
    supportedCapabilities: ['stock', 'pricing', 'lifecycle', 'datasheet'],
    available: true,
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'digikey',
        providerName: 'Digi-Key',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'API_CONFIGURED_LIVE_QUERY_NOT_RUN',
        assemblyAvailability: 'NOT_CHECKED',
        risk: 'digikey_api_configured_but_live_query_requires_explicit_network_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}
