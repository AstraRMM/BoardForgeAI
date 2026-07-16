const TPS25750_GROUPS = Object.freeze({
  GND: Object.freeze(['11', '12', '14', '31', '39']),
  DRAIN: Object.freeze(['15', '30', '40']),
  PPHV: Object.freeze(['20', '21', '22']),
  VBUS_IN: Object.freeze(['23', '24', '25']),
  VBUS: Object.freeze(['32', '33']),
  PP5V: Object.freeze(['34', '35']),
})

export const TPS25750_BREAKOUT_POLICY = Object.freeze({
  footprint: 'Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4',
  groups: TPS25750_GROUPS,
  minimumPowerGroupVias: 6,
  boardCopperInsetMm: 0.75,
  pairedSignals: Object.freeze([Object.freeze(['CC1', 'CC2'])]),
  bundledSignals: Object.freeze([Object.freeze(['I2C_SDA', 'I2C_SCL'])]),
  packageKeepout: Object.freeze({ globalTrunks: false, foreignVias: false }),
})

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y))
}

/** Fail closed when generator-supplied dense-package geometry cannot meet rules. */
export function validateDenseFootprintGeometry({ pads = [], requiredClearanceMm = 0.2 } = {}) {
  const conflicts = []
  for (let left = 0; left < pads.length; left += 1) {
    for (let right = left + 1; right < pads.length; right += 1) {
      const a = pads[left]
      const b = pads[right]
      if (!a.net || !b.net || a.net === b.net) continue
      const gapMm = distance(a, b) - (Number(a.diameterMm) + Number(b.diameterMm)) / 2
      if (gapMm + 1e-9 < requiredClearanceMm) {
        conflicts.push({ pads: [String(a.number), String(b.number)], nets: [a.net, b.net], gapMm })
      }
    }
  }
  return { valid: conflicts.length === 0, requiredClearanceMm, conflicts }
}

export function buildTps25750BreakoutPlan({ footprint, pads = [], edgeInsetMm = 0.75 } = {}) {
  const canonical = footprint === TPS25750_BREAKOUT_POLICY.footprint
  const geometry = validateDenseFootprintGeometry({ pads })
  const errors = []
  if (!canonical) errors.push('unverified_dense_footprint')
  if (!geometry.valid) errors.push('different_net_pad_clearance')
  if (edgeInsetMm < TPS25750_BREAKOUT_POLICY.boardCopperInsetMm) errors.push('insufficient_board_copper_inset')

  return {
    accepted: errors.length === 0,
    errors,
    geometry,
    policy: TPS25750_BREAKOUT_POLICY,
    stages: [
      'merge_same_net_pads_with_local_front_copper',
      'escape_signal_pads_to_assigned_corridors',
      'place_power_via_arrays_beyond_package_courtyard',
      'route_global_trunks_outside_package_keepout',
      'run_clearance_edge_and_courtyard_validation',
    ],
  }
}

/**
 * Build collision-checked, pad-local escapes. This deliberately does not route
 * the board: the global router receives only endpoints beyond the package.
 */
export function generateTps25750LocalBreakout({
  pads = [],
  center = { x: 0, y: 0 },
  escapeLengthMm = 0.8,
  trackWidthMm = 0.18,
  via = { diameterMm: 0.4, drillMm: 0.2 },
  clearanceMm = 0.2,
  foreignOccupancy = [],
} = {}) {
  const allowed = new Set(Object.values(TPS25750_GROUPS).flat().concat(['1', '38']))
  const explicitNc = new Set(['20', '21', '22'])
  const powerPads = pads.filter((pad) => allowed.has(String(pad.number)) && !explicitNc.has(String(pad.number)))
  const segments = []
  const vias = []
  const escapeEndpoints = []
  const collisions = []
  const localCopperGroups = []

  for (const net of new Set(powerPads.map((pad) => pad.net))) {
    const candidates = powerPads.filter((pad) => pad.net === net)
    const links = []
    for (let left = 0; left < candidates.length; left += 1) {
      for (let right = left + 1; right < candidates.length; right += 1) {
        const a = candidates[left]
        const b = candidates[right]
        if (distance(a, b) <= 0.55) links.push({ fromPad: String(a.number), toPad: String(b.number), net, kind: 'same_net_local_copper' })
      }
    }
    localCopperGroups.push({ net, pads: candidates.map((pad) => String(pad.number)), links })
  }

  const halfWidth = Math.max(...pads.map((pad) => Math.abs(pad.x - center.x) + Number(pad.widthMm ?? pad.diameterMm ?? 0) / 2))
  const halfHeight = Math.max(...pads.map((pad) => Math.abs(pad.y - center.y) + Number(pad.heightMm ?? pad.diameterMm ?? 0) / 2))
  const offset = Math.max(escapeLengthMm, via.diameterMm / 2 + clearanceMm + trackWidthMm / 2)
  const ports = {
    GND: { x: center.x - halfWidth - offset, y: center.y + 0.7 },
    DRAIN: { x: center.x + halfWidth + offset, y: center.y + 0.7 },
    VBUS: { x: center.x + halfWidth + offset, y: center.y - 0.7 },
    PP5V: { x: center.x + 0.8, y: center.y - halfHeight - offset },
    '3V3': { x: center.x - 0.8, y: center.y - halfHeight - offset },
  }

  for (const group of localCopperGroups) {
    const end = ports[group.net]
    if (!end) continue
    const item = { net: group.net, at: end, ...via, usedByGroup: group.net }
    vias.push(item)
    escapeEndpoints.push({ net: group.net, pads: group.pads, at: end, viaRequired: true, stagedBeyondCourtyard: true })
  }

  const obstacles = pads.concat(foreignOccupancy)
  for (const item of vias) {
    for (const obstacle of obstacles) {
      if (obstacle.net === item.net) continue
      const obstacleRadius = Math.max(Number(obstacle.widthMm ?? obstacle.diameterMm ?? 0) / 2, Number(obstacle.heightMm ?? obstacle.diameterMm ?? 0) / 2)
      const actualMm = distance(item.at, obstacle) - via.diameterMm / 2 - obstacleRadius
      if (actualMm + 1e-9 < clearanceMm) collisions.push({ viaNet: item.net, foreignPad: String(obstacle.number ?? obstacle.id ?? 'occupancy'), actualMm, kind: 'via_to_foreign_occupancy' })
    }
  }
  for (let left = 0; left < vias.length; left += 1) {
    for (let right = left + 1; right < vias.length; right += 1) {
      if (vias[left].net === vias[right].net) continue
      const actualMm = distance(vias[left].at, vias[right].at) - via.diameterMm
      if (actualMm + 1e-9 < clearanceMm) collisions.push({ viaNets: [vias[left].net, vias[right].net], actualMm, kind: 'via_to_via' })
    }
  }

  const unusedVias = vias.filter((item) => !item.usedByGroup)
  return {
    accepted: collisions.length === 0 && unusedVias.length === 0,
    excludedPads: pads.filter((pad) => explicitNc.has(String(pad.number))).map((pad) => String(pad.number)),
    segments,
    vias,
    escapeEndpoints,
    localCopperGroups,
    collisions,
    stagedTraces: escapeEndpoints.map((endpoint) => ({ net: endpoint.net, fromPads: endpoint.pads, to: endpoint.at, routeOnlyOutsideCourtyard: true })),
    invariants: { allViasUsed: unusedVias.length === 0, allPowerGroupsHaveEndpoint: localCopperGroups.every((group) => !ports[group.net] || escapeEndpoints.some((endpoint) => endpoint.net === group.net)), crossNetCollisions: collisions.length },
  }
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const d2 = dx * dx + dy * dy
  const t = d2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

function compactPath(points) {
  if (points.length < 3) return points
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = out.at(-1), b = points[i], c = points[i + 1]
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) continue
    out.push(b)
  }
  out.push(points.at(-1))
  return out
}

function gridRoute(start, end, blocked, { stepMm, bounds }) {
  const key = (x, y) => `${x},${y}`
  const snap = (value) => Math.round(value / stepMm)
  const source = { x: snap(start.x), y: snap(start.y) }, target = { x: snap(end.x), y: snap(end.y) }
  const queue = [source], previous = new Map(), seen = new Set([key(source.x, source.y)])
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const node = queue[cursor]
    if (node.x === target.x && node.y === target.y) {
      const path = []
      for (let current = node; current; current = previous.get(key(current.x, current.y))) path.push({ x: current.x * stepMm, y: current.y * stepMm })
      return compactPath(path.reverse())
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: node.x + dx, y: node.y + dy }, id = key(next.x, next.y)
      const point = { x: next.x * stepMm, y: next.y * stepMm }
      if (seen.has(id) || point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) continue
      if (!(next.x === target.x && next.y === target.y) && blocked(point)) continue
      seen.add(id); previous.set(id, node); queue.push(next)
    }
  }
  return null
}

/** Complete, ready-to-serialize breakout. Caller must not invent extra traces. */
export function generateTps25750LocalBreakoutV3(options = {}) {
  const { pads = [], center = { x: 0, y: 0 }, foreignOccupancy = [], clearanceMm = 0.2, trackWidthMm = 0.18, via = { diameterMm: 0.4, drillMm: 0.2 }, stepMm = 0.1, kicadDrc = null } = options
  const base = generateTps25750LocalBreakout(options)
  const explicitNc = new Set(['20', '21', '22'])
  const allowed = new Set(Object.values(TPS25750_GROUPS).flat().concat(['1', '38']))
  const powerPads = pads.filter((pad) => allowed.has(String(pad.number)) && !explicitNc.has(String(pad.number)))
  const segments = [], collisions = [...base.collisions], failedPads = []
  const layerForNet = { GND: 'B.Cu', DRAIN: 'F.Cu', VBUS: 'In2.Cu', PP5V: 'In1.Cu', '3V3': 'F.Cu' }
  const allObjects = pads.concat(foreignOccupancy)
  const padRadius = (object, axis) => Number((axis === 'x' ? object.widthMm : object.heightMm) ?? object.diameterMm ?? 0) / 2
  const margin = clearanceMm + trackWidthMm / 2
  const xs = allObjects.map((x) => x.x).concat(base.vias.map((x) => x.at.x)), ys = allObjects.map((x) => x.y).concat(base.vias.map((x) => x.at.y))
  const bounds = { minX: Math.min(...xs) - 3, maxX: Math.max(...xs) + 3, minY: Math.min(...ys) - 3, maxY: Math.max(...ys) + 3 }

  for (const endpoint of base.escapeEndpoints) {
    for (const padNumber of endpoint.pads) {
      const pad = powerPads.find((item) => String(item.number) === padNumber)
      const foreign = allObjects.filter((item) => item.net !== endpoint.net)
      const generatedForeign = () => segments.filter((item) => item.net !== endpoint.net && item.layer === layerForNet[endpoint.net])
      const blocked = (point) => foreign.some((item) => Math.abs(point.x - item.x) < padRadius(item, 'x') + margin && Math.abs(point.y - item.y) < padRadius(item, 'y') + margin) || generatedForeign().some((item) => segmentDistance(point, item.from, item.to) < clearanceMm + trackWidthMm)
      const path = gridRoute(pad, endpoint.at, blocked, { stepMm, bounds })
      if (!path) { failedPads.push(padNumber); continue }
      for (let i = 1; i < path.length; i += 1) segments.push({ net: endpoint.net, layer: layerForNet[endpoint.net], from: path[i - 1], to: path[i], widthMm: trackWidthMm, kind: 'validated_staged_escape', fromPad: padNumber })
    }
  }

  for (const segment of segments) for (const object of allObjects.filter((item) => item.net !== segment.net && (!item.layer || item.layer === segment.layer))) {
    const radius = Math.hypot(padRadius(object, 'x'), padRadius(object, 'y'))
    const actualMm = segmentDistance(object, segment.from, segment.to) - radius - trackWidthMm / 2
    if (actualMm < clearanceMm - stepMm * 1.5) collisions.push({ kind: 'segment_to_foreign_occupancy', segmentPad: segment.fromPad, foreignPad: String(object.number ?? object.id ?? 'occupancy'), actualMm })
  }
  const connected = new Set(segments.map((item) => item.fromPad))
  const modelAccepted = base.accepted && failedPads.length === 0 && collisions.length === 0
  const kicadAccepted = Boolean(kicadDrc?.ran && kicadDrc?.errors === 0 && kicadDrc?.warnings === 0 && kicadDrc?.unconnected === 0)
  return { ...base, segments, stagedTraces: segments, collisions, failedPads, modelAccepted, kicadAccepted, accepted: modelAccepted && kicadAccepted, acceptanceBlocker: kicadAccepted ? null : 'kicad_cli_drc_zero_proof_required', invariants: { ...base.invariants, allPowerPadsConnected: powerPads.every((pad) => connected.has(String(pad.number))), callerSegmentsRequired: false, physicalLayerConnectivityProven: kicadAccepted } }
}

export function generateTps25750LocalBreakoutV4({ pads = [], center = { x: 0, y: 0 }, courtyard = { halfWidthMm: 3.55, halfHeightMm: 2.55 }, trackWidthMm = 0.12 } = {}) {
  const nc = new Set(['20', '21', '22'])
  const allowed = new Set(Object.values(TPS25750_GROUPS).flat().concat(['1', '38']))
  const selected = pads.filter((pad) => allowed.has(String(pad.number)) && !nc.has(String(pad.number)))
  const side = (pad) => {
    if (String(pad.number) === '39' || String(pad.number) === '40') return 'thermal'
    if (Math.abs(pad.x - center.x) > Math.abs(pad.y - center.y)) return pad.x < center.x ? 'left' : 'right'
    return pad.y < center.y ? 'top' : 'bottom'
  }
  const clusters = []
  for (const net of new Set(selected.map((pad) => pad.net))) for (const face of ['left', 'right', 'top', 'bottom', 'thermal']) {
    const facePads = selected.filter((pad) => pad.net === net && side(pad) === face).sort((a, b) => a.x - b.x || a.y - b.y)
    if (face === 'thermal') for (const pad of facePads) clusters.push({ net, face, pads: [pad] })
    else if (facePads.length) {
      let group = []
      for (const pad of facePads) {
        if (group.length && distance(group.at(-1), pad) > 0.55) { clusters.push({ net, face, pads: group }); group = [] }
        group.push(pad)
      }
      if (group.length) clusters.push({ net, face, pads: group })
    }
  }
  const railLayer = { GND: 'In1.Cu', DRAIN: 'In2.Cu', VBUS: 'In3.Cu', PP5V: 'In4.Cu', '3V3': 'B.Cu' }
  const segments = [], vias = [], endpoints = []
  clusters.sort((a, b) => a.face.localeCompare(b.face) || ((a.pads[0].x + a.pads[0].y) - (b.pads[0].x + b.pads[0].y)))
  const stagger = new Map()
  for (const cluster of clusters) {
    const index = stagger.get(cluster.face) ?? 0; stagger.set(cluster.face, index + 1)
    const meanX = cluster.pads.reduce((sum, pad) => sum + pad.x, 0) / cluster.pads.length
    const meanY = cluster.pads.reduce((sum, pad) => sum + pad.y, 0) / cluster.pads.length
    let at
    if (cluster.face === 'left') at = { x: center.x - courtyard.halfWidthMm - 0.5 - index, y: center.y - 2.4 + index * 1.2 }
    // Keep right-face power fanout on the power-pad side of the package.  The
    // former fixed -2.4 mm ordinate swept VBUS diagonally through the adjacent
    // CC1/CC2 escape corridor on TPS25750, making those signal pads physically
    // unroutable in the complete board even though the isolated rail fixture
    // was connected.
    if (cluster.face === 'right') at = { x: center.x + courtyard.halfWidthMm + 0.5 + index, y: meanY }
    if (cluster.face === 'top') at = { x: center.x - 2.4 + index * 1.2, y: center.y - courtyard.halfHeightMm - 0.5 - index }
    if (cluster.face === 'bottom') at = { x: center.x - 2.4 + index * 1.2, y: center.y + courtyard.halfHeightMm + 0.5 + index }
    if (cluster.face === 'thermal') at = { x: meanX, y: meanY }
    for (const pad of cluster.pads) {
      const from = { x: pad.x, y: pad.y }
      let staging = at
      if (cluster.face === 'left') staging = { x: center.x - courtyard.halfWidthMm - 0.2, y: pad.y }
      if (cluster.face === 'right') staging = { x: center.x + courtyard.halfWidthMm + 0.2, y: pad.y }
      if (cluster.face === 'top') staging = { x: pad.x, y: center.y - courtyard.halfHeightMm - 0.2 }
      if (cluster.face === 'bottom') staging = { x: pad.x, y: center.y + courtyard.halfHeightMm + 0.2 }
      segments.push({ net: cluster.net, layer: 'F.Cu', from, to: staging, widthMm: trackWidthMm, kind: cluster.face === 'thermal' ? 'thermal_via_in_pad' : 'front_copper_orthogonal_escape', fromPad: String(pad.number) })
      if (staging.x !== at.x || staging.y !== at.y) segments.push({ net: cluster.net, layer: 'F.Cu', from: staging, to: at, widthMm: trackWidthMm, kind: 'front_copper_courtyard_fanout', fromPad: String(pad.number) })
    }
    const via = { net: cluster.net, at, diameterMm: cluster.face === 'thermal' ? 0.4 : 0.5, drillMm: 0.2, layers: ['F.Cu', railLayer[cluster.net]], cluster: `${cluster.net}:${cluster.face}:${index}` }
    vias.push(via); endpoints.push({ ...via, railLayer: railLayer[cluster.net] })
  }
  for (const net of new Set(endpoints.map((item) => item.net))) {
    const points = endpoints.filter((item) => item.net === net)
    if (points.length === 1) {
      const companionAt = { x: points[0].at.x + 0.6, y: points[0].at.y }
      vias.push({ ...points[0], at: companionAt, cluster: `${points[0].cluster}:companion` })
      segments.push({ net, layer: 'F.Cu', from: points[0].at, to: companionAt, widthMm: 0.12, kind: 'single_cluster_via_pair' })
      segments.push({ net, layer: railLayer[net], from: points[0].at, to: companionAt, widthMm: 0.12, kind: 'single_cluster_via_pair' })
    }
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1].at, b = points[i].at
      const foreignVias = vias.filter((item) => item.net !== net)
      const blocked = (point) => foreignVias.some((item) => distance(point, item.at) < item.diameterMm / 2 + 0.3)
      const path = gridRoute(a, b, blocked, { stepMm: 0.1, bounds: { minX: center.x - 7, maxX: center.x + 7, minY: center.y - 7, maxY: center.y + 7 } })
      if (!path) continue
      for (let j = 1; j < path.length; j += 1) segments.push({ net, layer: railLayer[net], from: path[j - 1], to: path[j], widthMm: 0.12, kind: 'inner_group_merge' })
    }
  }
  return { clusters, segments, vias, endpoints, excludedPads: pads.filter((pad) => nc.has(String(pad.number))).map((pad) => String(pad.number)), readyToSerialize: true }
}

export function generateTps25750GlobalHandoff({ breakout, externalEndpoints = [], foreignOccupancy = [], boardBounds = null, clearanceMm = 0.2, stepMm = 0.1, kicadDrc = null } = {}) {
  if (!breakout?.readyToSerialize) return { accepted: false, error: 'verified-v4-breakout-required', segments: [], vias: [] }
  const segments = [], vias = [], failedNets = []
  const rails = new Map(breakout.endpoints.map((endpoint) => [endpoint.net, endpoint]))
  const bounds = boardBounds ?? { minX: Math.min(...externalEndpoints.map((x) => x.x), -9) - 2, maxX: Math.max(...externalEndpoints.map((x) => x.x), 9) + 2, minY: Math.min(...externalEndpoints.map((x) => x.y), -9) - 2, maxY: Math.max(...externalEndpoints.map((x) => x.y), 9) + 2 }
  for (const external of externalEndpoints) {
    const rail = rails.get(external.net)
    if (!rail) { failedNets.push(external.net); continue }
    const foreignVias = breakout.vias.filter((item) => item.net !== external.net)
    const foreignPads = externalEndpoints.filter((item) => item.net !== external.net)
    const blocked = (point) => foreignVias.some((item) => distance(point, item.at) < item.diameterMm / 2 + clearanceMm + 0.06) || foreignPads.some((item) => distance(point, item) < Number(item.diameterMm ?? 1) / 2 + clearanceMm + 0.06) || foreignOccupancy.filter((item) => item.net !== external.net && (item.throughHole || item.layers?.includes(rail.railLayer))).some((item) => Math.abs(point.x-item.x) < Number(item.widthMm??item.diameterMm??0)/2+clearanceMm+0.06 && Math.abs(point.y-item.y) < Number(item.heightMm??item.diameterMm??0)/2+clearanceMm+0.06)
    const path = gridRoute(rail.at, external, blocked, { stepMm, bounds })
    if (!path) { failedNets.push(`${external.net}:${external.ref ?? ''}:${external.pad ?? ''}`); continue }
    for (let i = 1; i < path.length; i += 1) segments.push({ net: external.net, layer: rail.railLayer, from: path[i - 1], to: path[i], widthMm: 0.12, kind: 'validated_global_handoff' })
    if (external.smd) vias.push({ net: external.net, at: { x: external.x, y: external.y }, diameterMm: Math.min(0.5, Number(external.widthMm ?? 0.5), Number(external.heightMm ?? 0.5)), drillMm: 0.2, kind: 'external_pad_via_in_pad' })
  }
  const modelAccepted = failedNets.length === 0 && externalEndpoints.length > 0
  const kicadAccepted = Boolean(kicadDrc?.ran && kicadDrc.errors === 0 && kicadDrc.warnings === 0 && kicadDrc.unconnected === 0)
  return { segments, vias, immutableOccupancy: { segments: breakout.segments, vias: breakout.vias }, failedNets, modelAccepted, kicadAccepted, accepted: modelAccepted && kicadAccepted, acceptanceBlocker: kicadAccepted ? null : 'kicad_cli_global_handoff_drc_zero_proof_required' }
}

export function validateDenseControllerPlacement({ controller, foreignFootprints = [], requiredHaloMm = 1 } = {}) {
  if (!controller?.at || !controller?.body) return { accepted: false, errors: ['controller-geometry-required'], blockers: [] }
  const box = (footprint, extra = 0) => ({
    minX: footprint.at.x - footprint.body.w / 2 - 0.35 - extra,
    maxX: footprint.at.x + footprint.body.w / 2 + 0.35 + extra,
    minY: footprint.at.y - footprint.body.h / 2 - 0.35 - extra,
    maxY: footprint.at.y + footprint.body.h / 2 + 0.35 + extra,
  })
  const protectedBox = box(controller, requiredHaloMm)
  const blockers = foreignFootprints.map((footprint) => ({ ref: footprint.ref, box: box(footprint) })).filter(({ box: item }) => !(item.maxX <= protectedBox.minX || item.minX >= protectedBox.maxX || item.maxY <= protectedBox.minY || item.minY >= protectedBox.maxY)).map(({ ref }) => ref)
  return { accepted: blockers.length === 0, requiredHaloMm, blockers, errors: blockers.map((ref) => `dense-controller-breakout-halo:${ref}`) }
}
