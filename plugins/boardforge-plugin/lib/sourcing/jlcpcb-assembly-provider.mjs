import { createUnavailableProvider, detectProviderCredentials, normalizePartVerification, providerReportMarkdown, SOURCING_STATUSES } from './part-source-provider.mjs'

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
    detectCredentials(checkEnv = env) {
      return detectProviderCredentials(this, checkEnv)
    },
    canVerify(checkEnv = env) {
      return this.detectCredentials(checkEnv).configured
    },
    normalizeResult(part = {}, result = {}) {
      return normalizeJlcpcbAssemblyResult(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id: this.id, name: this.name, requiredEnv, available: true, rows })
    },
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'jlcpcb_assembly',
        providerName: 'JLCPCB Assembly',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        risk: 'jlcpcb_assembly_api_configured_but_availability_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}

export function normalizeJlcpcbAssemblyResult(part = {}, result = {}) {
  const stockQty = Number(result.stockQty ?? result.stock ?? result.stockNumber ?? 0)
  const available = Boolean(result.assemblyAvailable ?? result.availableForAssembly ?? stockQty > 0)
  return normalizePartVerification(part, {
    provider: 'jlcpcb_assembly',
    providerName: 'JLCPCB Assembly',
    sourcingStatus: stockQty > 0 ? SOURCING_STATUSES.API_VERIFIED : SOURCING_STATUSES.OUT_OF_STOCK,
    stockStatus: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    assemblyAvailability: available ? 'AVAILABLE' : 'NOT_AVAILABLE',
    stockQty,
    priceBreaks: result.priceBreaks || [],
    minimumOrderQuantity: result.minimumOrderQuantity ?? result.moq ?? null,
    packageMatch: result.packageMatch || 'UNKNOWN',
    risk: available ? 'api_verified_assembly_available' : 'assembly_not_available',
    evidence: { providerPayloadNormalized: true },
  })
}
