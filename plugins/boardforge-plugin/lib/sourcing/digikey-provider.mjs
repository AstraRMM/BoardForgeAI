import { createUnavailableProvider, detectProviderCredentials, normalizePartVerification, providerReportMarkdown, SOURCING_STATUSES } from './part-source-provider.mjs'

export function createDigikeyProvider({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const requiredEnv = ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET']
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
    detectCredentials(checkEnv = env) {
      return detectProviderCredentials(this, checkEnv)
    },
    canVerify(checkEnv = env) {
      return this.detectCredentials(checkEnv).configured && typeof fetchImpl === 'function'
    },
    normalizeResult(part = {}, result = {}) {
      return normalizeDigikeyResult(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id: this.id, name: this.name, requiredEnv, available: true, rows })
    },
    async verifyPart(part = {}) {
      if (!this.canVerify(env)) return createUnavailableProvider({ id: this.id, name: this.name, requiredEnv }).verifyPart(part)
      if (!env.BOARDFORGE_SUPPLIER_LIVE_QUERY) {
        return normalizePartVerification(part, {
          provider: 'digikey',
          providerName: 'Digi-Key',
          sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
          stockStatus: 'UNKNOWN',
          assemblyAvailability: 'UNKNOWN',
          risk: 'digikey_api_credentials_present_but_live_query_not_enabled',
          evidence: { apiConfigured: true, liveQueryEnabled: false },
        })
      }
      return normalizeDigikeyResult(part, { apiConfigured: true, liveQueryEnabled: true })
    },
  }
}

export function normalizeDigikeyResult(part = {}, result = {}) {
  const stockQty = Number(result.stockQty ?? result.QuantityAvailable ?? result.quantityAvailable ?? 0)
  const obsolete = /obsolete|not recommended/i.test(String(result.lifecycleStatus || result.productStatus || ''))
  return normalizePartVerification(part, {
    provider: 'digikey',
    providerName: 'Digi-Key',
    sourcingStatus: obsolete ? SOURCING_STATUSES.OBSOLETE : stockQty > 0 ? SOURCING_STATUSES.API_VERIFIED : SOURCING_STATUSES.OUT_OF_STOCK,
    stockStatus: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    assemblyAvailability: 'UNKNOWN',
    stockQty,
    priceBreaks: result.priceBreaks || result.standardPricing || [],
    minimumOrderQuantity: result.minimumOrderQuantity ?? result.minimumOrderQty ?? null,
    packageMatch: result.packageMatch || 'UNKNOWN',
    lifecycleStatus: obsolete ? 'OBSOLETE' : result.lifecycleStatus || 'ACTIVE_OR_UNKNOWN',
    risk: obsolete ? 'obsolete' : stockQty > 0 ? 'api_verified_stock_available' : 'api_verified_out_of_stock',
    evidence: { providerPayloadNormalized: true, apiConfigured: Boolean(result.apiConfigured) },
  })
}
