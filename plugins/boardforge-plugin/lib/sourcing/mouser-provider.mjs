import { createUnavailableProvider, normalizePartVerification, SOURCING_STATUSES } from './part-source-provider.mjs'

export function createMouserProvider({ env = process.env } = {}) {
  const requiredEnv = ['MOUSER_API_KEY']
  if (!env.MOUSER_API_KEY) {
    return createUnavailableProvider({
      id: 'mouser',
      name: 'Mouser',
      requiredEnv,
      supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    })
  }
  return {
    id: 'mouser',
    name: 'Mouser',
    requiredEnv,
    supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    available: true,
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'mouser',
        providerName: 'Mouser',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'API_CONFIGURED_LIVE_QUERY_NOT_RUN',
        assemblyAvailability: 'NOT_CHECKED',
        risk: 'mouser_api_configured_but_live_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}
