import { createHash } from 'node:crypto'
import { validateComponentBindings } from '../component-compatibility.mjs'
import { PART_LOOKUP_STATUSES } from '../sourcing/normalized-part-result.mjs'

export const COMPONENT_BINDING_SCHEMA = 'boardforge.component-binding.v1'
const LIVE_STATUSES = new Set([
  PART_LOOKUP_STATUSES.VERIFIED_IN_STOCK,
  PART_LOOKUP_STATUSES.VERIFIED_LIMITED_STOCK,
  PART_LOOKUP_STATUSES.VERIFIED_OUT_OF_STOCK,
])

export async function resolveCanonicalComponentBinding({ requirement, lookupService, assetResolver, now = new Date() } = {}) {
  assertRequirement(requirement)
  if (!lookupService?.lookup) throw bindingError('LIVE_LOOKUP_SERVICE_REQUIRED')
  if (!assetResolver) throw bindingError('ASSET_RESOLVER_REQUIRED')
  const lookup = await lookupService.lookup({ mpn: requirement.mpn, manufacturer: requirement.manufacturer })
  const selected = lookup?.selected
  if (!selected || !same(selected.manufacturerPartNumber, requirement.mpn)) throw bindingError('EXACT_MPN_NOT_VERIFIED')
  if (selected.matchType !== 'exact' || !LIVE_STATUSES.has(selected.status)) throw bindingError('LIVE_EXACT_SUPPLIER_EVIDENCE_REQUIRED')
  const checkedAt = Date.parse(selected.lastChecked || lookup.lastChecked || '')
  if (!Number.isFinite(checkedAt) || checkedAt > now.getTime() || now.getTime() - checkedAt > 5 * 60_000) throw bindingError('SUPPLIER_EVIDENCE_STALE')

  const assets = await assetResolver({ requirement, selectedPart: selected })
  if (!assets?.symbol || !assets?.footprint || !assets?.pinMap || !Object.keys(assets.pinMap).length) throw bindingError('COMPONENT_ASSETS_INCOMPLETE')
  const candidate = {
    ref: requirement.ref, group: requirement.logicalRole, value: requirement.value || requirement.mpn,
    mpn: selected.manufacturerPartNumber, symbol: assets.symbol, footprint: assets.footprint,
    pinMap: assets.pinMap, criticalPins: requirement.criticalPins || [],
  }
  const validation = await validateComponentBindings([candidate])
  const result = validation.results[0]
  if (result?.issues?.some((issue) => issue.severity === 'ERROR')) throw bindingError('SYMBOL_FOOTPRINT_PIN_MAP_INVALID', { issues: result.issues })
  const identity = {
    schema: COMPONENT_BINDING_SCHEMA,
    requirementId: requirement.id,
    ref: requirement.ref,
    logicalRole: requirement.logicalRole,
    manufacturerPartNumber: selected.manufacturerPartNumber,
    symbol: assetId(assets.symbol),
    footprint: assetId(assets.footprint),
    pinMap: ordered(assets.pinMap),
  }
  const bindingId = createHash('sha256').update(JSON.stringify(identity)).digest('hex')
  return {
    ...identity, bindingId, manufacturer: selected.manufacturer || requirement.manufacturer || '',
    supplierEvidence: {
      provider: selected.provider, matchType: selected.matchType, status: selected.status,
      stockStatus: selected.stockStatus, quantityAvailable: selected.quantityAvailable,
      checkedAt: selected.lastChecked || lookup.lastChecked, live: true,
    },
    assets: { symbol: assets.symbol, footprint: assets.footprint, model3d: assets.model3d || null },
    pinMap: ordered(assets.pinMap), compatibility: { score: result?.compatibilityScore ?? null, issues: result?.issues || [] },
  }
}

export function projectCanonicalBinding(binding) {
  if (binding?.schema !== COMPONENT_BINDING_SCHEMA || !binding?.bindingId) throw bindingError('CANONICAL_BINDING_REQUIRED')
  const provenance = { bindingId: binding.bindingId, schema: binding.schema }
  return {
    schematic: { ref: binding.ref, value: binding.manufacturerPartNumber, symbol: binding.assets.symbol, footprint: assetId(binding.assets.footprint), pinMap: binding.pinMap, ...provenance },
    pcb: { ref: binding.ref, footprint: binding.assets.footprint, pinMap: binding.pinMap, ...provenance },
    bom: { refs: binding.ref, manufacturer: binding.manufacturer, manufacturerPartNumber: binding.manufacturerPartNumber, footprint: assetId(binding.assets.footprint), sourcingStatus: binding.supplierEvidence.status, ...provenance },
    manufacturingEvidence: { ref: binding.ref, manufacturerPartNumber: binding.manufacturerPartNumber, symbol: assetId(binding.assets.symbol), footprint: assetId(binding.assets.footprint), pinMapDigest: digest(binding.pinMap), supplierEvidence: binding.supplierEvidence, ...provenance },
  }
}

export function verifyBindingProjection(binding, projection) {
  const errors = []
  for (const [name, row] of Object.entries(projection || {})) {
    if (row?.bindingId !== binding.bindingId) errors.push(`${name}:binding_id_mismatch`)
    if (row?.manufacturerPartNumber && !same(row.manufacturerPartNumber, binding.manufacturerPartNumber)) errors.push(`${name}:mpn_mismatch`)
  }
  return { ok: errors.length === 0, errors }
}

function assertRequirement(value) {
  if (!value?.id || !value?.ref || !value?.logicalRole || !value?.mpn) throw bindingError('LOGICAL_REQUIREMENT_INCOMPLETE')
}
function assetId(value) { return typeof value === 'string' ? value : value?.libId || value?.id || value?.path || null }
function same(a, b) { return Boolean(a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase()) }
function ordered(value) { return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) }
function digest(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function bindingError(code, details) { return Object.assign(new Error(code), { code, details }) }
