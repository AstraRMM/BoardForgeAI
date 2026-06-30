import { createUnavailableProvider, normalizePartVerification, SOURCING_STATUSES } from './part-source-provider.mjs'

export function createLcscProvider({ env = process.env } = {}) {
  const requiredEnv = ['LCSC_API_KEY']
  if (!env.LCSC_API_KEY) {
    return createUnavailableProvider({
      id: 'lcsc',
      name: 'LCSC',
      requiredEnv,
      supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    })
  }
  return {
    id: 'lcsc',
    name: 'LCSC',
    requiredEnv,
    supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    available: true,
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'lcsc',
        providerName: 'LCSC',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'API_CONFIGURED_LIVE_QUERY_NOT_RUN',
        assemblyAvailability: 'NOT_CHECKED',
        risk: 'lcsc_api_configured_but_live_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}
