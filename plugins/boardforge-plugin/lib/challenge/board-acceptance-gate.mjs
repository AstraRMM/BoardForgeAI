import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import {productionPhysicalNetEquivalent} from '../components/production-asset-pin-schema.mjs'

const PLACEHOLDER = /placeholder|dummy|fake stock|example only|not for fabrication|todo/i
const LIVE_STATUSES = new Set(['IN_STOCK', 'LIMITED_STOCK', 'OUT_OF_STOCK'])

export async function evaluateBoardAcceptance(evidence = {}, options = {}) {
  const blockers = []
  const checks = []
  const add = (id, pass, detail) => {
    checks.push({ id, status: pass ? 'passed' : 'blocked', detail })
    if (!pass) blockers.push({ code: id, message: detail })
  }

  add('REAL_KICAD_SCHEMATIC', isKiCadPath(evidence.project?.schematic, '.kicad_sch'), 'A readable .kicad_sch source is required.')
  add('REAL_KICAD_PCB', isKiCadPath(evidence.project?.pcb, '.kicad_pcb'), 'A readable .kicad_pcb source is required.')
  await requireFile(evidence.project?.schematic, 'KICAD_SCHEMATIC_MISSING', add, { minBytes: 64 })
  await requireFile(evidence.project?.pcb, 'KICAD_PCB_MISSING', add, { minBytes: 64 })

  validateKiCadRun(evidence.erc, 'ERC', add)
  validateKiCadRun(evidence.drc, 'DRC', add)
  add('UNCONNECTED_ITEMS_ZERO', evidence.drc?.unconnectedItems === 0, `KiCad unconnected item count must be zero; got ${evidence.drc?.unconnectedItems ?? 'missing'}.`)

  const artifacts = evidence.manufacturing || {}
  for (const [kind, value, extension] of [
    ['GERBERS', artifacts.gerbers, null],
    ['DRILL', artifacts.drill, null],
    ['BOM', artifacts.bom, '.csv'],
    ['CPL', artifacts.cpl, '.csv'],
    ['MANUFACTURING_ZIP', artifacts.zip, '.zip'],
  ]) await requireArtifactSet(value, kind, extension, add)

  validateSourcing(evidence.sourcing, add, options)
  await validateProductionAssets(evidence, add)
  add('SOURCE_UNCHANGED', Boolean(evidence.sourceProtection?.unchanged) && sameHash(evidence.sourceProtection), 'Source hashes must be present, equal, and independently marked unchanged.')
  add('STRUCTURAL_PROOF', Boolean(evidence.proof?.rustReparsePassed && evidence.proof?.structuralDiff), 'Rust reparse and a structural diff are required.')
  add('COMPACTNESS_MEASURED', finitePositive(evidence.metrics?.boardAreaMm2) && finitePositive(evidence.metrics?.componentDensity), 'Measured positive board area and component density are required.')

  return {
    schema: 'boardforge.phase2c-board-acceptance.v1',
    status: blockers.length ? 'BOARD_REJECTED' : 'BOARD_ACCEPTED',
    accepted: blockers.length === 0,
    checks,
    blockers,
    evidenceDigest: digest(evidence),
  }
}

async function validateProductionAssets(evidence, add) {
  const components = Array.isArray(evidence.assetBindings?.components) ? evidence.assetBindings.components : []
  const complete = components.length > 0
  add('EXACT_MPN_EVERY_REF', complete && components.every(row => row.ref && row.mpn && row.exactMpnVerified === true), 'Every populated reference requires an exact verified manufacturer MPN.')
  add('PRODUCTION_SYMBOL_EVERY_REF', complete && components.every(row => productionAsset(row.symbol)), 'Every populated reference requires a production symbol; review/proof connector abstractions are forbidden.')
  add('PRODUCTION_FOOTPRINT_EVERY_REF', complete && components.every(row => productionAsset(row.footprint)), 'Every populated reference requires a production footprint; review/proof placeholders are forbidden.')
  add('PIN_MAP_VERIFIED_EVERY_REF', complete && components.every(row => row.pinMapVerified === true && (row.symbolPinMap||row.pinMap) && Object.keys(row.symbolPinMap||row.pinMap).length > 0 && (row.footprintPadMap||row.pinMap)), 'Every populated reference requires explicitly verified symbol-pin and footprint-pad maps.')

  let projected = false
  try {
    const [sch, pcb] = await Promise.all([readFile(evidence.project?.schematic, 'utf8'), readFile(evidence.project?.pcb, 'utf8')])
    const schRows = indexedBlocks(sch, 'symbol'), pcbRows = indexedBlocks(pcb, 'footprint')
    projected = complete && components.every(row => {
      const schBlock = schRows.get(row.ref), pcbBlock = pcbRows.get(row.ref)
      if (!schBlock || !pcbBlock) return false
      const symbol = capture(schBlock, /\(lib_id\s+"([^"]+)"\)/)
      const footprint = capture(pcbBlock, /^\(footprint\s+"([^"]+)"/)
      if (!sameAsset(symbol, row.symbol) || !sameAsset(footprint, row.footprint)) return false
      const symbolPinMap=row.symbolPinMap||row.pinMap,footprintPadMap=row.footprintPadMap||row.pinMap
      if(!Object.entries(symbolPinMap).every(([pin])=>schBlock.includes(`(pin "${pin}"`)))return false
      const unconnectedSymbolPins = Array.isArray(row.expectedUnconnectedSymbolPins) ? row.expectedUnconnectedSymbolPins : []
      if(!unconnectedSymbolPins.every((pin)=>schBlock.includes(`(pin "${pin}"`)))return false
      const padRows=indexedPads(pcbBlock)
      const connectedPads = Object.entries(footprintPadMap).every(([pad, net]) => {
        const padBlock=padRows.get(String(pad)),expected=String(net)
        if(!padBlock)return false
        // KiCad 10 saved boards use `(net "NAME")`; generated sources may
        // still use `(net CODE "NAME")`. Accept both canonical encodings.
        const match = padBlock.match(/\(net\s+(?:\d+\s+)?"([^"]+)"\)/)
        const physicalNet=match?.[1]
        return physicalNet === expected || productionPhysicalNetEquivalent({policy:row.physicalNetEquivalencePolicy,mpn:row.mpn,pad:String(pad),canonicalNet:expected,physicalNet})
      })
      // A canonical null is a deliberate no-connect assertion, never a
      // string-valued "null" net.  Require the actual physical pad to exist
      // and to remain netless so an unintended connection cannot be omitted
      // from the projection proof.
      const unconnectedPads = Array.isArray(row.expectedUnconnectedFootprintPads) ? row.expectedUnconnectedFootprintPads : []
      const expectedNcPads = unconnectedPads.every((pad) => {
        const padBlock = padRows.get(String(pad))
        const actualNet = capture(padBlock || '', /\(net\s+(?:\d+\s+)?"([^"]+)"\)/)
        // KiCad may serialize an isolated NC pad as its own generated
        // `unconnected-(...)` net.  Accept that encoding, but reject every
        // named electrical net (including a literal `null`).
        return Boolean(padBlock) && (!actualNet || actualNet.startsWith('unconnected-('))
      })
      return connectedPads && expectedNcPads
    })
  } catch {}
  add('BINDINGS_PROJECTED_INTO_KICAD', projected, 'Actual schematic symbols, PCB footprints, and pad-net maps must match the verified production bindings for every reference.')
}

const NON_PRODUCTION = /BoardForge:BF_CONN|reviewrequired|review_required|placeholder|proof/i
function productionAsset(value) { return typeof value === 'string' && value.includes(':') && !NON_PRODUCTION.test(value) }
function sameAsset(actual, expected) { return actual === expected || actual?.split(':').at(-1) === expected?.split(':').at(-1) }
function capture(text, pattern) { return text.match(pattern)?.[1] }
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function indexedBlocks(text, kind) {
  const rows = new Map(), needle = `(${kind}`
  for (let start = text.indexOf(needle); start >= 0; start = text.indexOf(needle, start + 1)) {
    let depth = 0, quoted = false, escaped = false, end = start
    for (; end < text.length; end++) {
      const ch = text[end]
      if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue }
      if (ch === '"') quoted = true
      else if (ch === '(') depth++
      else if (ch === ')' && --depth === 0) { end++; break }
    }
    const block = text.slice(start, end), ref = capture(block, /\(property\s+"Reference"\s+"([^"]+)"/)
    if (ref) rows.set(ref, block)
  }
  return rows
}
function indexedPads(footprintBlock){
  const rows=new Map(),needle='(pad '
  for(let start=footprintBlock.indexOf(needle);start>=0;start=footprintBlock.indexOf(needle,start+1)){
    let depth=0,quoted=false,escaped=false,end=start
    for(;end<footprintBlock.length;end++){const ch=footprintBlock[end];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"')quoted=true;else if(ch==='(')depth++;else if(ch===')'&&--depth===0){end++;break}}
    const block=footprintBlock.slice(start,end),number=block.match(/^\(pad\s+"?([^"\s)]+)"?/)?.[1]
    if(number&&!rows.has(number))rows.set(number,block)
  }
  return rows
}

function validateKiCadRun(run, label, add) {
  const real = run?.tool === 'kicad-cli' && Number.isInteger(run?.exitCode) && run?.reportPath && run?.executedAt
  add(`${label}_KICAD_CLI_EXECUTED`, Boolean(real), `${label} must include timestamped kicad-cli execution evidence and a report path.`)
  add(`${label}_ZERO_ERRORS`, real && run.exitCode === 0 && run.errors === 0 && run.violations === 0, `${label} must exit zero with zero errors and zero violations.`)
  // KiCad's JSON explicitly lists checks disabled by rule severity.  A clean
  // count with even one ignored check is not a full validation run.
  add(`${label}_NO_IGNORED_CHECKS`, real && Array.isArray(run.ignoredChecks) && run.ignoredChecks.length === 0, `${label} must run with no ignored or disabled KiCad checks.`)
}

function validateSourcing(sourcing, add, options) {
  const rows = Array.isArray(sourcing?.rows) ? sourcing.rows : []
  add('SOURCING_ROWS_PRESENT', rows.length > 0, 'At least one BOM sourcing row is required.')
  for (const provider of ['digikey', 'mouser']) {
    const allLive = rows.length > 0 && rows.every((row) => {
      const proof = row.providers?.[provider]
      return proof?.live === true && proof?.queriedAt && proof?.requestId && LIVE_STATUSES.has(proof.stockStatus) && Number.isFinite(proof.quantityAvailable) && proof.quantityAvailable >= 0
    })
    add(`LIVE_${provider.toUpperCase()}_EVERY_ROW`, allLive, `Every BOM row requires timestamped live ${provider} evidence; UNKNOWN, cached-only, missing, and synthetic results fail.`)
  }
  if (options.requireInStock !== false) {
    add('LIVE_STOCK_AVAILABLE', rows.length > 0 && rows.every((row) => ['digikey', 'mouser'].some((p) => Number(row.providers?.[p]?.quantityAvailable) > 0)), 'Every BOM row needs positive live stock at DigiKey or Mouser.')
  }
}

async function requireArtifactSet(value, kind, extension, add) {
  const files = Array.isArray(value) ? value : value ? [value] : []
  if (!files.length) return add(`${kind}_MISSING`, false, `${kind} artifact evidence is required.`)
  let valid = true
  for (const file of files) valid = await inspectFile(file, extension) && valid
  add(`${kind}_AUTHENTIC`, valid, `${kind} files must exist, be non-empty, match the expected extension, and contain no placeholder markers.`)
}

async function requireFile(file, id, add, { minBytes }) {
  let pass = false
  try { pass = Boolean(file) && (await stat(file)).size >= minBytes } catch {}
  add(id, pass, `${path.basename(file || 'missing')} must be a readable non-trivial file.`)
}

async function inspectFile(file, extension) {
  try {
    if (extension && path.extname(file).toLowerCase() !== extension) return false
    const info = await stat(file)
    if (!info.isFile() || info.size < 16) return false
    if (extension === '.zip') return inspectZip(await readFile(file))
    return !PLACEHOLDER.test(await readFile(file, 'utf8'))
  } catch { return false }
}

async function inspectZip(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true })
    const entries = Object.values(zip.files).filter((entry) => !entry.dir)
    if (!entries.length) return false
    const names = entries.map((entry) => entry.name.toLowerCase())
    const required = [
      names.some((name) => /\.(gtl|gbl|gts|gbs|gto|gbo|gbr)$/.test(name)),
      names.some((name) => /\.(drl|xln)$/.test(name)),
      names.some((name) => /bom.*\.csv$/.test(name)),
      names.some((name) => /(cpl|pos|position).*\.csv$/.test(name)),
    ]
    if (required.some((present) => !present)) return false
    for (const entry of entries) {
      const bytes = await entry.async('uint8array')
      if (!bytes.length || PLACEHOLDER.test(Buffer.from(bytes).toString('utf8'))) return false
    }
    return true
  } catch { return false }
}
function isKiCadPath(file, ext) { return typeof file === 'string' && path.extname(file).toLowerCase() === ext }
function finitePositive(value) { return Number.isFinite(value) && value > 0 }
function sameHash(proof) { return /^[a-f0-9]{64}$/i.test(proof.beforeSha256 || '') && proof.beforeSha256 === proof.afterSha256 }
function digest(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
