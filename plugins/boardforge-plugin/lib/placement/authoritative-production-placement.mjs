import { resolveAuthoritativeKiCadFootprint, transformAuthoritativePads } from '../components/authoritative-kicad-footprint-resolver.mjs'
import { pointInPolygon } from '../geometry.mjs'
import {board007PlacementPreferences} from '../phase2c/board007-placement-route-contract.mjs'
import {board008PlacementPreferences} from '../phase2c/board008-mechanical-placement-contract.mjs'

const ESP32_TOPOLOGY = {
  U1: { nx: .50, ny: .37, rotations: [0, 90, 270, 180] },
  J1: { nx: .15, ny: .50, rotations: [90, 270, 0, 180] },
  U2: { nx: .36, ny: .38, rotations: [0, 90, 270, 180] },
  J2: { nx: .85, ny: .52, rotations: [0, 180, 90, 270] },
  R1: { nx: .30, ny: .68, rotations: [0, 90, 180, 270] },
  R2: { nx: .37, ny: .68, rotations: [0, 90, 180, 270] },
}
const RP2040_TOPOLOGY = {
  J1:{nx:.13,ny:.50,rotations:[0,180]},D1:{nx:.27,ny:.55,rotations:[0,180]},
  U1:{nx:.50,ny:.50,rotations:[0,90,270,180]},U2:{nx:.70,ny:.50,rotations:[0,180,90,270]},
  U3:{nx:.38,ny:.25,rotations:[0,180,90,270]},J2:{nx:.80,ny:.50,rotations:[0,180]},
  R1:{nx:.22,ny:.75,rotations:[0,90,180,270]},R2:{nx:.28,ny:.75,rotations:[0,90,180,270]},
  C1:{nx:.42,ny:.28,rotations:[0,90,180,270]},C2:{nx:.50,ny:.28,rotations:[0,90,180,270]},C3:{nx:.58,ny:.28,rotations:[0,90,180,270]},
}
const USB_PD_SINK_TOPOLOGY = {
  // Rotate the receptacle so its contact row faces the left board edge. The
  // remaining packages retain collision-aware generic packing behind it.
  // nx=.21 makes the contact copper tangent to the notch clearance envelope.
  J1:{nx:.23,ny:.50,rotations:[90]},
}
const BOARD007_CAN_TOPOLOGY=board007PlacementPreferences()
const BOARD008_CAN_GATEWAY_TOPOLOGY=board008PlacementPreferences()

export const COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY = Object.freeze({
  mpn: 'ESP32-S3-WROOM-1U-N8R8',
  symbol: 'RF_Module:ESP32-S3-WROOM-1',
  footprint: 'RF_Module:ESP32-S3-WROOM-1U',
  outline: Object.freeze({ widthMm: 42, heightMm: 21, areaMm2: 882 }),
  antenna: 'External 2.4 GHz antenna required at the module U.FL/IPEX connector; verify antenna/cable placement in enclosure review.',
})

/** Resolve exact installed KiCad packages and place them before routing.
 * The returned pads are authoritative transformed package pads, never proof geometry.
 */
export function placeAuthoritativeProductionFootprints({
  components = [], outline, holes = [], topology = 'esp32-usb-sensor',
  courtyardClearanceMm = .25, edgeClearanceMm = .25, holeClearanceMm = .5,
  resolver = resolveAuthoritativeKiCadFootprint,
} = {}) {
  if (!Array.isArray(outline) || outline.length < 3) throw new TypeError('A closed board outline polygon is required before production placement')
  const bounds = polygonBounds(outline)
  const resolved = components.map(component => {
    const libId = component.footprint?.libId || component.footprint
    const authoritative = resolver(libId)
    return { ...component, libId, authoritative, localOccupancy: footprintOccupancy(authoritative) }
  })
  // Largest packages are committed first so small passives fill remaining legal sites.
  resolved.sort((a, b) => area(b.localOccupancy) - area(a.localOccupancy) || a.ref.localeCompare(b.ref))
  const placed = []
  for (const component of resolved) {
    const basePreference = topology === 'esp32-usb-sensor' ? ESP32_TOPOLOGY[component.ref] : topology === 'rp2040-instrument' ? RP2040_TOPOLOGY[component.ref] : topology === 'usb-c-pd-sink' ? USB_PD_SINK_TOPOLOGY[component.ref] : topology === 'can-controller-connector-ears' ? BOARD007_CAN_TOPOLOGY[component.ref] : topology === 'can-gateway-asymmetric-dual-port' ? BOARD008_CAN_GATEWAY_TOPOLOGY[component.ref] : null
    const preference = { ...(basePreference || {}), ...(component.preferredAt ? { nx: component.preferredAt.nx, ny: component.preferredAt.ny } : {}), ...(component.allowedRotations ? { rotations: component.allowedRotations } : {}) }
    const candidates = component.fixedAt ? [{ ...component.fixedAt, side: component.fixedAt.side || 'front' }] : candidateTransforms(preference, bounds)
    let winner = null
    for (const transform of candidates) {
      const occupancy = transformRect(component.localOccupancy, transform)
      const pads = transformAuthoritativePads(component.authoritative.pads, transform)
      const bodyOccupancy = transformRect(footprintBodyOccupancy(component.authoritative), transform)
      const rfPolicy = component.rfAntennaEdge ? { edge: component.rfAntennaEdge } : null
      if (!legalPlacement(occupancy, bodyOccupancy, pads, outline, holes, placed, { edgeClearanceMm, holeClearanceMm, courtyardClearanceMm }, rfPolicy, bounds, transform.rotation)) continue
      winner = {
        ref: component.ref, value: component.value, mpn: component.mpn, libId: component.libId,
        sourceFile: component.authoritative.sourceFile, at: transform, occupancy, bodyOccupancy, rfAntennaPolicy: rfPolicy, pads,
        endpoints: pads.map(pad => ({ ref: component.ref, pad: pad.number, netName: component.pinMap?.[pad.number] || null, x: pad.x, y: pad.y, layers: pad.layers, drill: pad.drill })),
      }
      break
    }
    if (!winner) throw placementError(component.ref, component.libId)
    placed.push(winner)
  }
  const byInputOrder = placed.sort((a, b) => components.findIndex(c => c.ref === a.ref) - components.findIndex(c => c.ref === b.ref))
  return {
    schema: 'boardforge.authoritative-production-placement.v1', topology, resolvedBeforeRouting: true,
    placements: byInputOrder,
    endpoints: byInputOrder.flatMap(item => item.endpoints),
    occupancy: byInputOrder.map(({ ref, occupancy }) => ({ ref, ...occupancy })),
  }
}

export function footprintOccupancy(footprint) {
  const courtyard = primitivePoints(footprint.definition, 'F.CrtYd')
  const points = courtyard.length ? courtyard : footprint.pads.flatMap(p => [
    { x: p.x - p.widthMm / 2, y: p.y - p.heightMm / 2 }, { x: p.x + p.widthMm / 2, y: p.y + p.heightMm / 2 },
  ])
  if (!points.length) throw new Error(`Cannot derive occupancy for ${footprint.libId}`)
  const bounds = polygonBounds(points)
  return { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY, source: courtyard.length ? 'F.CrtYd' : 'pads' }
}

export function footprintBodyOccupancy(footprint) {
  const fab = primitivePoints(footprint.definition, 'F.Fab')
  if (!fab.length) return padOccupancy(footprint.pads)
  const b=polygonBounds(fab)
  return { minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY,width:b.width,height:b.height,source:'F.Fab' }
}

function candidateTransforms(preference, bounds) {
  const pref = { nx: .5, ny: .5, rotations: [0, 90, 180, 270], ...(preference || {}) }
  const origin = { x: bounds.minX + pref.nx * bounds.width, y: bounds.minY + pref.ny * bounds.height }
  const offsets = [{ x: 0, y: 0 }]
  for (let radius = 1; radius <= 16; radius++) for (let dx = -radius; dx <= radius; dx++) for (const dy of [-radius, radius]) offsets.push({ x: dx * 1.25, y: dy * 1.25 })
  for (let radius = 1; radius <= 16; radius++) for (let dy = -radius + 1; dy < radius; dy++) for (const dx of [-radius, radius]) offsets.push({ x: dx * 1.25, y: dy * 1.25 })
  return offsets.flatMap(offset => pref.rotations.map(rotation => ({ x: origin.x + offset.x, y: origin.y + offset.y, rotation, side: 'front' })))
}

function legalPlacement(rect, body, pads, outline, holes, placed, rules, rfPolicy, boardBounds, rotation) {
  if (rfPolicy) {
    if (!['top','right','bottom','left'].includes(rfPolicy.edge) || rotationEdge(rotation) !== rfPolicy.edge) return false
    if (!singleEdgeRfCourtyard(rect, boardBounds, rfPolicy.edge, rules.edgeClearanceMm)) return false
    // RF exception never applies to copper, mask, drills, or the physical module envelope.
    if (rectCorners(expand(body, rules.edgeClearanceMm)).some(point => !pointInPolygon(point, outline))) return false
    if (pads.some(pad => rectCorners(expand(padRect(pad), rules.edgeClearanceMm)).some(point => !pointInPolygon(point, outline)))) return false
  } else if (rectCorners(expand(rect, rules.edgeClearanceMm)).some(point => !pointInPolygon(point, outline))) return false
  for (const hole of holes) {
    const radius = Number(hole.radiusMm ?? hole.diameterMm / 2 ?? hole.drillMm / 2 ?? 0) + rules.holeClearanceMm
    if (circleRectDistance({ x: hole.x, y: hole.y }, rfPolicy ? body : rect) < radius) return false
  }
  // Full courtyard intersection is retained, including the in-board portion of an RF keepout.
  return !placed.some(other => boundsOverlap(rect, other.occupancy, rules.courtyardClearanceMm))
}

function transformRect(rect, { x, y, rotation }) {
  // Match KiCad's Y-down board-coordinate rotation convention. This matters
  // for asymmetric courtyards such as vertical pin headers.
  const radians = -rotation * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians)
  const points = rectCorners(rect).map(p => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c }))
  const b = polygonBounds(points)
  return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY, x: b.minX, y: b.minY, width: b.width, height: b.height, source: rect.source }
}

function primitivePoints(text, layer) {
  const points = []
  for (const kind of ['fp_rect', 'fp_line']) for (let start = text.indexOf(`(${kind}`); start >= 0; start = text.indexOf(`(${kind}`, start + kind.length + 1)) {
    const block = balanced(text, start)
    if (!block || !new RegExp(`\\(layer\\s+"?${escapeRegex(layer)}"?\\)`).test(block)) continue
    for (const point of block.matchAll(/\((?:start|end)\s+(-?[\d.]+)\s+(-?[\d.]+)/g)) points.push({ x: Number(point[1]), y: Number(point[2]) })
  }
  return points
}

function polygonBounds(points) { const xs = points.map(p => p.x), ys = points.map(p => p.y); const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys); return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY } }
function rectCorners(r) { return [{ x: r.minX ?? r.x, y: r.minY ?? r.y }, { x: r.maxX ?? r.x + r.width, y: r.minY ?? r.y }, { x: r.maxX ?? r.x + r.width, y: r.maxY ?? r.y + r.height }, { x: r.minX ?? r.x, y: r.maxY ?? r.y + r.height }] }
function expand(r, n) { return { minX: r.minX - n, minY: r.minY - n, maxX: r.maxX + n, maxY: r.maxY + n } }
function area(r) { return r.width * r.height }
function boundsOverlap(a,b,c=0) { return !(a.maxX+c<=b.minX||b.maxX+c<=a.minX||a.maxY+c<=b.minY||b.maxY+c<=a.minY) }
function padOccupancy(pads) { const points = pads.flatMap(p => [{ x:p.x-p.widthMm/2, y:p.y-p.heightMm/2 },{ x:p.x+p.widthMm/2, y:p.y+p.heightMm/2 }]); const b=polygonBounds(points); return { minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY,width:b.width,height:b.height,source:'pads' } }
function padRect(p) { return { minX:p.x-p.widthMm/2,minY:p.y-p.heightMm/2,maxX:p.x+p.widthMm/2,maxY:p.y+p.heightMm/2 } }
function rotationEdge(rotation) { return ['top','right','bottom','left'][((Math.round(rotation/90)%4)+4)%4] }
function singleEdgeRfCourtyard(r,b,edge,c) { const outside={top:r.minY < b.minY+c,right:r.maxX > b.maxX-c,bottom:r.maxY > b.maxY-c,left:r.minX < b.minX+c}; return outside[edge] && Object.entries(outside).every(([name,value])=>name===edge||!value) }
function circleRectDistance(p, r) { const dx = Math.max(r.minX - p.x, 0, p.x - r.maxX), dy = Math.max(r.minY - p.y, 0, p.y - r.maxY); return Math.hypot(dx, dy) }
function placementError(ref, libId) { const error = new Error(`No legal authoritative production placement for ${ref} (${libId})`); error.code = 'AUTHORITATIVE_PRODUCTION_PLACEMENT_BLOCKED'; error.ref = ref; error.libId = libId; return error }
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function balanced(text, start) { let depth = 0, quoted = false, escaped = false; for (let i = start; i < text.length; i++) { const ch = text[i]; if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue } if (ch === '"') quoted = true; else if (ch === '(') depth++; else if (ch === ')' && --depth === 0) return text.slice(start, i + 1) } return null }
