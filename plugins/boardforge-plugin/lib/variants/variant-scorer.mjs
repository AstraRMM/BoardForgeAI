export function scoreVariant(variant) {
  const drc = Number(variant.drc ?? 0)
  const erc = Number(variant.erc ?? 0)
  const unconnected = Number(variant.unconnected ?? 0)
  const routeability = Number(variant.routeability ?? 80)
  const manufacturability = Number(variant.manufacturability ?? 80)
  const connector = Number(variant.connectorAccessibility ?? 80)
  const sourcingReadiness = Number(variant.sourcingReadiness ?? variant.sourcing?.score ?? 50)
  const quoteReadiness = Number(variant.quoteReadiness ?? variant.quote?.score ?? 50)
  const riskyParts = Number(variant.riskyParts ?? variant.sourcing?.riskyCount ?? 0)
  const bomCostPenalty = Math.min(12, Number(variant.estimatedBomCost ?? 0) / 20)
  const areaPenalty = Math.min(20, Number(variant.areaMm2 ?? 2500) / 250)
  const engineeringScore = Math.max(0, Math.round(routeability * 0.4 + manufacturability * 0.3 + connector * 0.15 + 15 - drc * 5 - erc * 5 - unconnected * 3 - areaPenalty))
  const sourcingScore = Math.max(0, Math.round(sourcingReadiness * 0.55 + quoteReadiness * 0.35 - riskyParts * 7 - bomCostPenalty))
  const manufacturingScore = Math.max(0, Math.round(manufacturability * 0.55 + routeability * 0.25 - drc * 5 - erc * 5 - areaPenalty))
  const score = Math.max(0, Math.round(engineeringScore * 0.45 + manufacturingScore * 0.3 + sourcingScore * 0.25))
  return {
    ...variant,
    score,
    engineeringScore,
    sourcingScore,
    manufacturingScore,
    exportReady: drc === 0 && erc === 0 && unconnected === 0,
    pros: variant.pros || [],
    cons: variant.cons || [],
  }
}
