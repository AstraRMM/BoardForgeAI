export const SUPPORTED_PRODUCTION_COPPER_LAYERS = Object.freeze([2, 4, 6, 8])
export function validateCopperStackup(stackup = {}) {
  const errors = []
  if (!SUPPORTED_PRODUCTION_COPPER_LAYERS.includes(stackup.copperLayers)) errors.push('unsupported-copper-layer-count')
  if (!Array.isArray(stackup.layerOrder) || stackup.layerOrder.length !== stackup.copperLayers) errors.push('layer-order-count-mismatch')
  if (new Set(stackup.layerOrder ?? []).size !== (stackup.layerOrder ?? []).length) errors.push('duplicate-copper-layer')
  if (stackup.requiresBlindVias && !stackup.manufacturing?.blindViaCapabilityRequired) errors.push('blind-via-capability-not-declared')
  return { ok: errors.length === 0, errors }
}
