export function generateBoardVariants({ boardBrief = {}, projectId = 'BF-VARIANT' } = {}) {
  const base = boardBrief.boardType || 'robotics_controller'
  return [
    { variantId: `${projectId}-compact`, name: 'compact', boardType: base, areaMm2: 1800, routeability: 78, manufacturability: 82, connectorAccessibility: 72, pros: ['small footprint'], cons: ['tighter routing corridors'] },
    { variantId: `${projectId}-connector-friendly`, name: 'connector-friendly', boardType: base, areaMm2: 2400, routeability: 84, manufacturability: 86, connectorAccessibility: 94, pros: ['clear edge connector access'], cons: ['larger outline'] },
    { variantId: `${projectId}-routing-friendly`, name: 'routing-friendly', boardType: base, areaMm2: 2600, routeability: 92, manufacturability: 88, connectorAccessibility: 86, pros: ['wide routing corridors'], cons: ['less compact'] },
    { variantId: `${projectId}-manufacturing-friendly`, name: 'manufacturing-friendly', boardType: base, areaMm2: 2300, routeability: 86, manufacturability: 94, connectorAccessibility: 84, pros: ['lower DFM risk'], cons: ['moderate area'] },
  ]
}
