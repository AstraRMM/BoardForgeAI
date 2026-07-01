import { createUnavailableProvider, detectProviderCredentials, normalizePartVerification, providerReportMarkdown, SOURCING_STATUSES } from './part-source-provider.mjs'

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
    detectCredentials(checkEnv = env) {
      return detectProviderCredentials(this, checkEnv)
    },
    canVerify(checkEnv = env) {
      return this.detectCredentials(checkEnv).configured
    },
    normalizeResult(part = {}, result = {}) {
      return normalizeLcscResult(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id: this.id, name: this.name, requiredEnv, available: true, rows })
    },
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: 'lcsc',
        providerName: 'LCSC',
        sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        risk: 'lcsc_api_configured_but_live_query_not_run',
        evidence: { apiConfigured: true },
      })
    },
  }
}

export function normalizeLcscResult(part = {}, result = {}) {
  const stockQty = Number(result.stockQty ?? result.stock ?? result.stockNumber ?? 0)
  const obsolete = /obsolete|eol/i.test(String(result.lifecycleStatus || result.productStatus || ''))
  return normalizePartVerification(part, {
    provider: 'lcsc',
    providerName: 'LCSC',
    sourcingStatus: obsolete ? SOURCING_STATUSES.OBSOLETE : stockQty > 0 ? SOURCING_STATUSES.API_VERIFIED : SOURCING_STATUSES.OUT_OF_STOCK,
    stockStatus: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    assemblyAvailability: result.assemblyAvailability || 'UNKNOWN',
    stockQty,
    priceBreaks: result.priceBreaks || [],
    minimumOrderQuantity: result.minimumOrderQuantity ?? result.moq ?? null,
    packageMatch: result.packageMatch || 'UNKNOWN',
    lifecycleStatus: obsolete ? 'OBSOLETE' : result.lifecycleStatus || 'ACTIVE_OR_UNKNOWN',
    risk: obsolete ? 'obsolete' : stockQty > 0 ? 'api_verified_stock_available' : 'api_verified_out_of_stock',
    evidence: { providerPayloadNormalized: true },
  })
}
