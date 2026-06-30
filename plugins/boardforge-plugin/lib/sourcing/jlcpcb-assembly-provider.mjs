import { createUnavailableProvider, normalizePartVerification, SOURCING_STATUSES } from './part-source-provider.mjs'

export function createJlcpcbAssemblyProvider({ env = process.env } = {}) {
  const requiredEnv = ['JLCPCB_API_KEY']
  if (!env.JLCPCB_API_KEY) {
    return createUnavailableProvider({
      id: 'jlcpcb_assembly',
      name: 'JLCPCB Assembly',
      requiredEnv,
      supportedCapabilities: ['assembly_availability', 'stock', 'pricing'],
    })
  }
  return {
    id: 'jlcpcb_assembly',
    name: 'JLCPCB Assembly',
    requiredEnv,
    supportedCapabilities: ['assembly_availability', 'stock', 'pricing'],
    available: true,
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'jlcpcb_assembly',
        providerName: 'JLCPCB Assembly',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'API_CONFIGURED_LIVE_QUERY_NOT_RUN',
        assemblyAvailability: 'API_CONFIGURED_QUERY_NOT_RUN',
        risk: 'jlcpcb_assembly_api_configured_but_availability_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}
