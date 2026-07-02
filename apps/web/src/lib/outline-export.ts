export type OutlineSeed = {
  preset: string
  edgeCutsRequired: true
  routeabilityScoreRequired: true
  manufacturingGate: string
}

export const outlinePresets = [
  'rounded rectangle',
  'mounting ears',
  'octagonal',
  'L-shape',
  'cutout/notch',
  'drone stack pattern',
  'custom polygon',
]

export function createOutlineSeed(preset: string): OutlineSeed {
  return {
    preset,
    edgeCutsRequired: true,
    routeabilityScoreRequired: true,
    manufacturingGate: 'DRC_ERC_CONNECTIVITY_AND_EDGE_CUTS_REQUIRED',
  }
}
