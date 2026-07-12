export const OUTLINE_VALIDATION_STATUSES = Object.freeze([
  'VALID',
  'VALID_WITH_WARNINGS',
  'BLOCKED_SELF_INTERSECTION',
  'BLOCKED_TOO_NARROW',
  'BLOCKED_HOLE_EDGE_CLEARANCE',
  'BLOCKED_CONNECTOR_ACCESS',
  'BLOCKED_COMPONENT_FIT',
  'BLOCKED_KICAD_EDGE_CUTS',
  'BLOCKED_MANUFACTURING_RISK',
])

export const OUTLINE_MODES = Object.freeze([
  'ROUNDED_RECTANGLE',
  'MOUNTING_EARS',
  'OCTAGON_CHAMFERED',
  'L_SHAPE',
  'U_SHAPE',
  'NOTCHED',
  'DRONE_STACK',
  'WEARABLE_PUCK',
  'ROBOTICS_CONTROLLER',
  'CRAZY_POLYGON_VALID',
  'CRAZY_POLYGON_SELF_INTERSECTION',
  'DECORATIVE_SHIELD',
])

export const DENSITY_PRESETS = Object.freeze({
  relaxed: { componentMarginMm: 4.0, copperToEdgeMm: 1.5, minNeckMm: 12 },
  normal: { componentMarginMm: 3.0, copperToEdgeMm: 1.0, minNeckMm: 9 },
  compact: { componentMarginMm: 2.0, copperToEdgeMm: 0.8, minNeckMm: 6 },
  dense: { componentMarginMm: 1.5, copperToEdgeMm: 0.6, minNeckMm: 4 },
  extreme: { componentMarginMm: 1.0, copperToEdgeMm: 0.5, minNeckMm: 3 },
})

export const OUTLINE_PRESETS = Object.freeze([
  {
    id: 'rounded-rectangle',
    mode: 'ROUNDED_RECTANGLE',
    name: 'Rounded rectangle',
    family: 'fast_fabrication',
    description: 'General-purpose board with rounded-corner intent, four mounting holes, and simple connector access.',
    statusExpectation: 'VALID',
    widthMm: 70,
    heightMm: 45,
  },
  {
    id: 'mounting-ears',
    mode: 'MOUNTING_EARS',
    name: 'Mounting ears',
    family: 'mechanical_ears',
    description: 'Rectangular board with two side ears for enclosure screws or drone standoffs.',
    statusExpectation: 'VALID',
    widthMm: 82,
    heightMm: 48,
  },
  {
    id: 'octagon-chamfered',
    mode: 'OCTAGON_CHAMFERED',
    name: 'Octagon / chamfered',
    family: 'compact_chamfered',
    description: 'Chamfered outline for compact electronics where square corners are unnecessary.',
    statusExpectation: 'VALID',
    widthMm: 60,
    heightMm: 42,
  },
  {
    id: 'l-shape',
    mode: 'L_SHAPE',
    name: 'L-shape',
    family: 'enclosure_fit',
    description: 'L-shaped outline for posts, cameras, or enclosure obstacles.',
    statusExpectation: 'VALID_WITH_WARNINGS',
    widthMm: 72,
    heightMm: 56,
  },
  {
    id: 'u-shape',
    mode: 'U_SHAPE',
    name: 'U-shape',
    family: 'connector_wrap',
    description: 'U-shaped board with a center relief for connector access or mechanical clearance.',
    statusExpectation: 'VALID_WITH_WARNINGS',
    widthMm: 78,
    heightMm: 58,
  },
  {
    id: 'notched',
    mode: 'NOTCHED',
    name: 'Notched board',
    family: 'usb_antenna_relief',
    description: 'Board with a side notch for USB, antenna, or flex relief.',
    statusExpectation: 'VALID_WITH_WARNINGS',
    widthMm: 68,
    heightMm: 42,
  },
  {
    id: 'drone-stack',
    mode: 'DRONE_STACK',
    name: 'Drone stack',
    family: 'flight_controller',
    description: 'Drone flight-controller outline with one locked stack mounting pattern. Use 30.5x30.5 by default unless the job explicitly requests another pattern.',
    statusExpectation: 'VALID',
    widthMm: 42,
    heightMm: 42,
  },
  {
    id: 'wearable-puck',
    mode: 'WEARABLE_PUCK',
    name: 'Wearable puck',
    family: 'wearable_sensor',
    description: 'Rounded puck-like polygon for wearable and handheld boards.',
    statusExpectation: 'VALID',
    widthMm: 44,
    heightMm: 44,
  },
  {
    id: 'robotics-controller',
    mode: 'ROBOTICS_CONTROLLER',
    name: 'Robotics controller',
    family: 'robotics',
    description: 'Long controller board with connector-edge intent and clear power/signal regions.',
    statusExpectation: 'VALID',
    widthMm: 90,
    heightMm: 52,
  },
  {
    id: 'crazy-polygon-valid',
    mode: 'CRAZY_POLYGON_VALID',
    name: 'Crazy polygon',
    family: 'custom_sketch',
    description: 'Odd but manufacturable custom sketch with concave regions kept routeable.',
    statusExpectation: 'VALID_WITH_WARNINGS',
    widthMm: 76,
    heightMm: 58,
  },
  {
    id: 'decorative-shield',
    mode: 'DECORATIVE_SHIELD',
    name: 'Decorative shield',
    family: 'decorative_manufacturable',
    description: 'Shield-like custom board shape that stays manufacturable and connector-accessible.',
    statusExpectation: 'VALID_WITH_WARNINGS',
    widthMm: 64,
    heightMm: 54,
  },
  {
    id: 'crazy-polygon-self-intersection',
    mode: 'CRAZY_POLYGON_SELF_INTERSECTION',
    name: 'Crazy polygon blocked self-intersection',
    family: 'custom_sketch_blocked',
    description: 'Intentionally invalid bow-tie sketch used to prove blocked outlines do not become fake boards.',
    statusExpectation: 'BLOCKED_SELF_INTERSECTION',
    widthMm: 64,
    heightMm: 44,
  },
])

export function buildMechanicalConstraints(overrides = {}) {
  const density = DENSITY_PRESETS[overrides.density || 'compact']
  return {
    schema: 'boardforge.mechanical-constraints.v2',
    boardPurpose: 'custom outline KiCad seed',
    targetSizeMm: { maxWidth: 80, maxHeight: 60 },
    componentMarginMm: density.componentMarginMm,
    copperToEdgeMm: density.copperToEdgeMm,
    minNeckMm: density.minNeckMm,
    holeToEdgeMm: 2.0,
    minEdgeLengthMm: 0.5,
    minManufacturableWidthMm: 8,
    mountingHoles: { count: 4, diameterMm: 2.2, style: 'corner', edgeMarginMm: 3.0 },
    shape: 'rounded_rectangle',
    density: overrides.density || 'compact',
    connectorEdgePreferences: [],
    keepouts: [],
    components: [],
    allowManufacturingWarnings: true,
    ...overrides,
  }
}

export function listOutlinePresets() {
  return OUTLINE_PRESETS.map((preset) => ({ ...preset }))
}

export function getOutlinePreset(idOrMode = 'rounded-rectangle') {
  const key = String(idOrMode).toLowerCase()
  return OUTLINE_PRESETS.find((preset) => preset.id === key || preset.mode.toLowerCase() === key || preset.name.toLowerCase() === key) || OUTLINE_PRESETS[0]
}

export function generatePresetOutline(idOrMode = 'rounded-rectangle', overrides = {}) {
  const preset = getOutlinePreset(idOrMode)
  const width = Number(overrides.widthMm || preset.widthMm)
  const height = Number(overrides.heightMm || preset.heightMm)
  const w = width
  const h = height
  const pointsByMode = {
    ROUNDED_RECTANGLE: [[4, 0], [w - 4, 0], [w, 4], [w, h - 4], [w - 4, h], [4, h], [0, h - 4], [0, 4]],
    MOUNTING_EARS: [[8, 0], [w - 8, 0], [w - 2, 4], [w, 14], [w - 3, h / 2], [w, h - 14], [w - 2, h - 4], [w - 8, h], [8, h], [2, h - 4], [0, h - 14], [3, h / 2], [0, 14], [2, 4]],
    OCTAGON_CHAMFERED: [[8, 0], [w - 8, 0], [w, 8], [w, h - 8], [w - 8, h], [8, h], [0, h - 8], [0, 8]],
    L_SHAPE: [[0, 0], [w, 0], [w, h * 0.56], [w * 0.58, h * 0.56], [w * 0.58, h], [0, h]],
    U_SHAPE: [[0, 0], [w, 0], [w, h], [w * 0.66, h], [w * 0.66, h * 0.42], [w * 0.34, h * 0.42], [w * 0.34, h], [0, h]],
    NOTCHED: [[0, 0], [w, 0], [w, h], [0, h], [0, h * 0.62], [8, h * 0.55], [8, h * 0.42], [0, h * 0.35]],
    DRONE_STACK: [[4, 0], [w - 4, 0], [w, 4], [w, h - 4], [w - 4, h], [4, h], [0, h - 4], [0, 4]],
    WEARABLE_PUCK: regularPolygon({ width: w, height: h, sides: 16 }),
    ROBOTICS_CONTROLLER: [[5, 0], [w - 5, 0], [w, 5], [w, h - 5], [w - 5, h], [5, h], [0, h - 5], [0, 5]],
    CRAZY_POLYGON_VALID: [[6, 4], [28, 0], [w - 8, 8], [w, 24], [w - 14, h - 6], [w * 0.52, h], [w * 0.42, h - 15], [18, h - 3], [0, h * 0.58], [5, h * 0.36]],
    CRAZY_POLYGON_SELF_INTERSECTION: [[0, 0], [w, h], [w, 0], [0, h]],
    DECORATIVE_SHIELD: [[w * 0.5, 0], [w - 4, 5], [w, h * 0.62], [w * 0.68, h], [w * 0.5, h - 5], [w * 0.32, h], [0, h * 0.62], [4, 5]],
  }
  const points = pointsByMode[preset.mode] || pointsByMode.ROUNDED_RECTANGLE
  const normalized = points.map(([x, y]) => ({ x: roundMm(x), y: roundMm(y) }))
  return {
    schema: 'boardforge.custom-outline-preset.v2',
    preset,
    points: normalized,
    holes: generatePresetHoles({ preset, width: w, height: h }),
    connectorEdges: generatePresetConnectorEdges(preset),
    keepouts: generatePresetKeepouts({ preset, width: w, height: h }),
    components: generatePresetComponentRegions({ preset, width: w, height: h }),
  }
}

function regularPolygon({ width, height, sides }) {
  const cx = width / 2
  const cy = height / 2
  const rx = width / 2
  const ry = height / 2
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]
  })
}

function generatePresetHoles({ preset, width, height }) {
  if (preset.mode === 'DRONE_STACK') {
    const cx = width / 2
    const cy = height / 2
    const supportedPatterns = [30.5, 25.5, 20]
    const spacing = supportedPatterns.find((candidate) => candidate <= Math.min(width, height) - 7) || 20
    const d = spacing / 2
    return [
      { ref: `H${spacing}-1`, x: cx - d, y: cy - d, diameterMm: 2.2, patternMm: spacing },
      { ref: `H${spacing}-2`, x: cx + d, y: cy - d, diameterMm: 2.2, patternMm: spacing },
      { ref: `H${spacing}-3`, x: cx + d, y: cy + d, diameterMm: 2.2, patternMm: spacing },
      { ref: `H${spacing}-4`, x: cx - d, y: cy + d, diameterMm: 2.2, patternMm: spacing },
    ]
  }
  if (preset.mode === 'L_SHAPE') {
    return [
      { ref: 'H1', x: 7, y: 7, diameterMm: 2.4 },
      { ref: 'H2', x: width - 7, y: 7, diameterMm: 2.4 },
      { ref: 'H3', x: 35, y: height - 7, diameterMm: 2.4 },
      { ref: 'H4', x: 7, y: height - 7, diameterMm: 2.4 },
    ]
  }
  if (preset.mode === 'WEARABLE_PUCK') {
    return [
      { ref: 'H1', x: width * 0.32, y: height * 0.32, diameterMm: 2.0 },
      { ref: 'H2', x: width * 0.68, y: height * 0.32, diameterMm: 2.0 },
      { ref: 'H3', x: width * 0.68, y: height * 0.68, diameterMm: 2.0 },
      { ref: 'H4', x: width * 0.32, y: height * 0.68, diameterMm: 2.0 },
    ]
  }
  if (preset.mode === 'CRAZY_POLYGON_VALID') {
    return [
      { ref: 'H1', x: 14, y: 14, diameterMm: 2.2 },
      { ref: 'H2', x: width - 14, y: 16, diameterMm: 2.2 },
      { ref: 'H3', x: width - 21, y: height - 14, diameterMm: 2.2 },
      { ref: 'H4', x: 18, y: height - 18, diameterMm: 2.2 },
    ]
  }
  const m = ['MOUNTING_EARS', 'ROBOTICS_CONTROLLER', 'OCTAGON_CHAMFERED', 'DECORATIVE_SHIELD', 'U_SHAPE', 'NOTCHED', 'ROUNDED_RECTANGLE'].includes(preset.mode) ? 7 : 4
  return [
    { ref: 'H1', x: m, y: m, diameterMm: 2.4 },
    { ref: 'H2', x: width - m, y: m, diameterMm: 2.4 },
    { ref: 'H3', x: width - m, y: height - m, diameterMm: 2.4 },
    { ref: 'H4', x: m, y: height - m, diameterMm: 2.4 },
  ]
}

function generatePresetConnectorEdges(preset) {
  if (preset.mode === 'ROBOTICS_CONTROLLER') return [{ ref: 'J_PWR', edge: 'left' }, { ref: 'J_IO', edge: 'right' }, { ref: 'J_DBG', edge: 'top' }]
  if (preset.mode === 'DRONE_STACK') return [{ ref: 'J_USB', edge: 'left' }, { ref: 'J_MOTOR', edge: 'right' }]
  if (preset.mode === 'NOTCHED') return [{ ref: 'J_USB', edge: 'left', nearNotch: true }]
  return [{ ref: 'J1', edge: 'left' }, { ref: 'J2', edge: 'right' }]
}

function generatePresetKeepouts({ preset, width, height }) {
  if (preset.mode === 'WEARABLE_PUCK') return [{ ref: 'ANT_KEEP_OUT', x: width * 0.3, y: height * 0.08, widthMm: width * 0.4, heightMm: 6, reason: 'antenna edge keepout' }]
  if (preset.mode === 'ROBOTICS_CONTROLLER') return [{ ref: 'POWER_HEAT_ZONE', x: 4, y: height * 0.58, widthMm: width * 0.24, heightMm: height * 0.28, reason: 'regulator heat spacing' }]
  return []
}

function generatePresetComponentRegions({ preset, width, height }) {
  if (preset.mode === 'U_SHAPE') {
    return [
      { ref: 'U1', role: 'controller', x: width * 0.5, y: height * 0.2, widthMm: 10, heightMm: 10 },
      { ref: 'J1', role: 'edge connector', x: 8, y: height * 0.5, widthMm: 7, heightMm: 5 },
      { ref: 'J2', role: 'edge connector', x: width - 8, y: height * 0.5, widthMm: 7, heightMm: 5 },
    ]
  }
  if (preset.mode === 'NOTCHED') {
    return [
      { ref: 'U1', role: 'controller', x: width * 0.55, y: height * 0.52, widthMm: 10, heightMm: 10 },
      { ref: 'J_USB', role: 'edge connector', x: 16, y: height * 0.5, widthMm: 7, heightMm: 5 },
      { ref: 'J2', role: 'edge connector', x: width - 8, y: height * 0.5, widthMm: 7, heightMm: 5 },
    ]
  }
  if (preset.mode === 'L_SHAPE') {
    return [
      { ref: 'U1', role: 'controller', x: width * 0.38, y: height * 0.35, widthMm: 10, heightMm: 10 },
      { ref: 'J1', role: 'edge connector', x: 8, y: height * 0.5, widthMm: 7, heightMm: 5 },
      { ref: 'J2', role: 'edge connector', x: width - 8, y: height * 0.28, widthMm: 7, heightMm: 5 },
    ]
  }
  if (preset.mode === 'CRAZY_POLYGON_VALID') {
    return [
      { ref: 'U1', role: 'controller', x: width * 0.5, y: height * 0.42, widthMm: 8, heightMm: 8 },
      { ref: 'J1', role: 'edge connector', x: 16, y: height * 0.42, widthMm: 6, heightMm: 4 },
      { ref: 'J2', role: 'edge connector', x: width - 18, y: height * 0.42, widthMm: 6, heightMm: 4 },
    ]
  }
  return [
    { ref: 'U1', role: 'controller', x: width * 0.48, y: height * 0.48, widthMm: 10, heightMm: 10 },
    { ref: 'J1', role: 'edge connector', x: Math.max(6, width * 0.1), y: height * 0.5, widthMm: 8, heightMm: 6 },
    { ref: 'J2', role: 'edge connector', x: Math.min(width - 6, width * 0.9), y: height * 0.5, widthMm: 8, heightMm: 6 },
    ...(preset.mode === 'DRONE_STACK' ? [{ ref: 'IMU1', role: 'sensor', x: width * 0.5, y: height * 0.28, widthMm: 4, heightMm: 4 }] : []),
  ]
}

function roundMm(value) {
  return Math.round(Number(value) * 1000) / 1000
}
