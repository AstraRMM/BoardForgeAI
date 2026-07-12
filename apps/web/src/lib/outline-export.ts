export type OutlineSeed = {
  preset: string
  id?: string
  outline?: Array<{ x: number; y: number }>
  holes?: Array<{ ref: string; x: number; y: number; diameterMm: number }>
  edgeCutsRequired: true
  routeabilityScoreRequired: true
  manufacturingGate: string
}

export const outlinePresets = [
  { id: 'blank-custom', label: 'Blank canvas', description: 'Start with no outline points or holes.' },
  { id: 'rounded-rectangle', label: 'Rounded rectangle', description: 'Fast fab-safe default with four holes.' },
  { id: 'mounting-ears', label: 'Mounting ears', description: 'Screw ears for standoffs and enclosures.' },
  { id: 'octagon-chamfered', label: 'Octagon / chamfered', description: 'Compact chamfered shape.' },
  { id: 'l-shape', label: 'L-shape', description: 'Fits posts, cameras, and enclosure obstacles.' },
  { id: 'u-shape', label: 'U-shape', description: 'Center relief for access or cutouts.' },
  { id: 'notched', label: 'Notched board', description: 'USB, antenna, or flex-cable relief.' },
  { id: 'drone-stack', label: 'Flight controller 30.5 mm', description: 'Square FC outline with four M3 30.5 mm stack holes.' },
  { id: 'wearable-puck', label: 'Wearable puck', description: 'Rounded wearable sensor board.' },
  { id: 'robotics-controller', label: 'Robotics controller', description: 'Long edge-connector control board.' },
  { id: 'crazy-polygon-valid', label: 'Crazy polygon', description: 'Odd but manufacturable custom shape.' },
  { id: 'decorative-shield', label: 'Decorative shield', description: 'Stylized but fabricable outline.' },
]

export function createOutlineSeed(preset: string): OutlineSeed {
  return {
    preset,
    edgeCutsRequired: true,
    routeabilityScoreRequired: true,
    manufacturingGate: 'DRC_ERC_CONNECTIVITY_AND_EDGE_CUTS_REQUIRED',
  }
}
