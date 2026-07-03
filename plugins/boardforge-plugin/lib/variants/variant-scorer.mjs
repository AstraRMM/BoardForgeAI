export function scoreVariant(variant) {
  const drc = Number(variant.drc ?? 0)
  const erc = Number(variant.erc ?? 0)
  const unconnected = Number(variant.unconnected ?? 0)
  const routeability = Number(variant.routeability ?? 80)
  const manufacturability = Number(variant.manufacturability ?? 80)
  const connector = Number(variant.connectorAccessibility ?? 80)
  const areaPenalty = Math.min(20, Number(variant.areaMm2 ?? 2500) / 250)
  const score = Math.max(0, Math.round(routeability * 0.35 + manufacturability * 0.25 + connector * 0.15 + 25 - drc * 5 - erc * 5 - unconnected * 3 - areaPenalty))
  return {
    ...variant,
    score,
    exportReady: drc === 0 && erc === 0 && unconnected === 0,
    pros: variant.pros || [],
    cons: variant.cons || [],
  }
}
