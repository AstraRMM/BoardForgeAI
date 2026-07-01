export const SOURCING_STATUSES = Object.freeze({
  API_VERIFIED: 'API_VERIFIED',
  MANUAL_CANDIDATE: 'MANUAL_CANDIDATE',
  PLACEHOLDER: 'PLACEHOLDER',
  NOT_CHECKED: 'NOT_CHECKED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  OBSOLETE: 'OBSOLETE',
  ERROR: 'ERROR',
})

export function createUnavailableProvider({ id, name, requiredEnv = [], supportedCapabilities = [] } = {}) {
  const provider = {
    id,
    name,
    requiredEnv,
    supportedCapabilities,
    available: false,
    detectCredentials(env = process.env) {
      return detectProviderCredentials({ id, name, requiredEnv }, env)
    },
    canVerify(env = process.env) {
      return this.detectCredentials(env).configured
    },
    normalizeResult(part = {}, result = {}) {
      return normalizePartVerification(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id, name, requiredEnv, available: false, rows })
    },
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: id,
        providerName: name,
        sourcingStatus: part.placeholder ? SOURCING_STATUSES.PLACEHOLDER : SOURCING_STATUSES.NOT_CHECKED,
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        risk: missingProviderRisk(name, requiredEnv),
        evidence: {
          apiConfigured: false,
          requiredEnv,
        },
      })
    },
  }
  return provider
}

export function createManualCandidateProvider({ id = 'manual', name = 'Manual Candidate Review' } = {}) {
  const provider = {
    id,
    name,
    requiredEnv: [],
    supportedCapabilities: ['manual_review'],
    available: true,
    detectCredentials() {
      return { provider: id, name, requiredEnv: [], presentEnv: [], missingEnv: [], configured: true }
    },
    canVerify() {
      return true
    },
    normalizeResult(part = {}, result = {}) {
      return normalizePartVerification(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id, name, requiredEnv: [], available: true, rows })
    },
    async verifyPart(part = {}) {
      return normalizePartVerification(part, {
        provider: id,
        providerName: name,
        sourcingStatus: part.placeholder ? SOURCING_STATUSES.PLACEHOLDER : SOURCING_STATUSES.MANUAL_CANDIDATE,
        stockStatus: part.stockQty > 0 ? 'MANUAL_STOCK_DECLARED' : 'NOT_CHECKED',
        assemblyAvailability: part.assemblyAvailability || 'NOT_CHECKED',
        risk: part.placeholder
          ? 'placeholder_part_must_be_replaced_or_verified_before_manufacturing'
          : 'manual_candidate_requires_human_or_api_verification_before_procurement',
        evidence: {
          apiConfigured: false,
          manualCandidate: true,
        },
      })
    },
  }
  return provider
}

export async function verifyBomWithProviders(parts = [], providers = [], options = {}) {
  const providerList = providers.length ? providers : [createManualCandidateProvider()]
  const rows = []
  for (const part of parts) {
    const provider = selectProviderForPart(part, providerList, options)
    rows.push(await provider.verifyPart(part, options))
  }
  return {
    schema: 'boardforge.part-verification-report.v1',
    generatedAt: options.generatedAt || new Date().toISOString(),
    summary: summarizeRows(rows),
    rows,
  }
}

export function normalizePartVerification(part = {}, verification = {}) {
  const sourcingStatus = verification.sourcingStatus || SOURCING_STATUSES.NOT_CHECKED
  return {
    ref: part.ref || part.reference || '',
    mpn: part.mpn || part.MPN || part.manufacturerPartNumber || '',
    manufacturer: part.manufacturer || '',
    symbol: part.symbol || part.libSymbol || '',
    footprint: part.footprint || '',
    pinMapStatus: part.pinMapStatus || part.pinmapStatus || 'NOT_CHECKED',
    provider: verification.provider || 'none',
    providerName: verification.providerName || verification.provider || 'none',
    sourcingStatus,
    stockStatus: verification.stockStatus || statusToStockStatus(sourcingStatus),
    assemblyAvailability: verification.assemblyAvailability || 'NOT_CHECKED',
    priceBreaks: Array.isArray(verification.priceBreaks) ? verification.priceBreaks : [],
    minimumOrderQuantity: Number.isFinite(Number(verification.minimumOrderQuantity)) ? Number(verification.minimumOrderQuantity) : null,
    packageMatch: verification.packageMatch || 'UNKNOWN',
    stockQty: Number.isFinite(Number(verification.stockQty)) ? Number(verification.stockQty) : null,
    supplierSku: verification.supplierSku || null,
    lifecycleStatus: verification.lifecycleStatus || lifecycleFromStatus(sourcingStatus),
    risk: verification.risk || defaultRisk(sourcingStatus),
    evidence: verification.evidence || {},
  }
}

export function detectProviderCredentials(provider = {}, env = process.env) {
  const requiredEnv = provider.requiredEnv || []
  const presentEnv = requiredEnv.filter((name) => Boolean(env[name]))
  const missingEnv = requiredEnv.filter((name) => !env[name])
  return {
    provider: provider.id || provider.name || 'unknown',
    name: provider.name || provider.id || 'unknown',
    requiredEnv,
    presentEnv,
    missingEnv,
    configured: missingEnv.length === 0,
  }
}

export function providerReportMarkdown({ id, name, requiredEnv = [], available = false, rows = [] } = {}) {
  const tableRows = rows.map((row) => `| ${row.mpn || '-'} | ${row.sourcingStatus || '-'} | ${row.stockStatus || '-'} | ${row.assemblyAvailability || '-'} | ${row.packageMatch || '-'} | ${row.risk || '-'} |`).join('\n')
  return [
    `# ${name || id || 'Provider'} Sourcing Report`,
    '',
    `- provider: ${id || 'unknown'}`,
    `- configured: ${available ? 'yes' : 'no'}`,
    `- required env: ${requiredEnv.join(', ') || 'none'}`,
    '',
    '| MPN | Sourcing | Stock | Assembly | Package | Risk |',
    '| --- | --- | --- | --- | --- | --- |',
    tableRows || '| - | - | - | - | - | - |',
    '',
  ].join('\n')
}

export function providerAvailability(provider = {}, env = process.env) {
  const missingEnv = (provider.requiredEnv || []).filter((name) => !env[name])
  return {
    provider: provider.id || provider.name || 'unknown',
    available: missingEnv.length === 0 && provider.available !== false,
    missingEnv,
  }
}

function selectProviderForPart(part, providers, options) {
  if (part.provider) {
    const exact = providers.find((provider) => provider.id === part.provider || provider.name === part.provider)
    if (exact) return exact
  }
  return providers.find((provider) => provider.available) || providers[0] || createManualCandidateProvider(options)
}

function summarizeRows(rows) {
  return {
    total: rows.length,
    apiVerified: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.API_VERIFIED).length,
    manualCandidates: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.MANUAL_CANDIDATE).length,
    placeholders: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.PLACEHOLDER).length,
    notChecked: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.NOT_CHECKED).length,
    outOfStock: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.OUT_OF_STOCK).length,
    obsolete: rows.filter((row) => row.sourcingStatus === SOURCING_STATUSES.OBSOLETE).length,
    highRisk: rows.filter((row) => /placeholder|obsolete|out_of_stock|not_checked/i.test(row.risk)).length,
  }
}

function missingProviderRisk(name, requiredEnv) {
  return `provider_${String(name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_not_configured_missing_${requiredEnv.join('_') || 'credentials'}`
}

function statusToStockStatus(status) {
  if (status === SOURCING_STATUSES.API_VERIFIED) return 'IN_STOCK_OR_VERIFIED_BY_PROVIDER'
  if (status === SOURCING_STATUSES.OUT_OF_STOCK) return 'OUT_OF_STOCK'
  return 'NOT_CHECKED'
}

function lifecycleFromStatus(status) {
  if (status === SOURCING_STATUSES.OBSOLETE) return 'OBSOLETE'
  return 'NOT_CHECKED'
}

function defaultRisk(status) {
  if (status === SOURCING_STATUSES.API_VERIFIED) return 'low'
  if (status === SOURCING_STATUSES.MANUAL_CANDIDATE) return 'manual_verification_required'
  if (status === SOURCING_STATUSES.PLACEHOLDER) return 'placeholder_part_must_not_ship_without_review'
  if (status === SOURCING_STATUSES.OUT_OF_STOCK) return 'out_of_stock'
  if (status === SOURCING_STATUSES.OBSOLETE) return 'obsolete'
  if (status === SOURCING_STATUSES.ERROR) return 'provider_error'
  return 'not_checked'
}
