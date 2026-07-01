import { createUnavailableProvider, detectProviderCredentials, normalizePartVerification, providerReportMarkdown, SOURCING_STATUSES } from './part-source-provider.mjs'

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
    detectCredentials(checkEnv = env) {
      return detectProviderCredentials(this, checkEnv)
    },
    canVerify(checkEnv = env) {
      return this.detectCredentials(checkEnv).configured
    },
    normalizeResult(part = {}, result = {}) {
      return normalizeMouserResult(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id: this.id, name: this.name, requiredEnv, available: true, rows })
    },
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'mouser',
        providerName: 'Mouser',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        risk: 'mouser_api_configured_but_live_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}

export function normalizeMouserResult(part = {}, result = {}) {
  const stockQty = Number(result.stockQty ?? result.AvailabilityInStock ?? result.Availability ?? 0)
  const obsolete = /obsolete|nrnd|not recommended/i.test(String(result.lifecycleStatus || result.LifecycleStatus || ''))
  return normalizePartVerification(part, {
    provider: 'mouser',
    providerName: 'Mouser',
    sourcingStatus: obsolete ? SOURCING_STATUSES.OBSOLETE : stockQty > 0 ? SOURCING_STATUSES.API_VERIFIED : SOURCING_STATUSES.OUT_OF_STOCK,
    stockStatus: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    assemblyAvailability: 'UNKNOWN',
    stockQty,
    priceBreaks: result.priceBreaks || result.PriceBreaks || [],
    minimumOrderQuantity: result.minimumOrderQuantity ?? result.Min ?? null,
    packageMatch: result.packageMatch || 'UNKNOWN',
    lifecycleStatus: obsolete ? 'OBSOLETE' : result.lifecycleStatus || 'ACTIVE_OR_UNKNOWN',
    risk: obsolete ? 'obsolete' : stockQty > 0 ? 'api_verified_stock_available' : 'api_verified_out_of_stock',
    evidence: { providerPayloadNormalized: true },
  })
}
