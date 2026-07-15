import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'

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

function validateKiCadRun(run, label, add) {
  const real = run?.tool === 'kicad-cli' && Number.isInteger(run?.exitCode) && run?.reportPath && run?.executedAt
  add(`${label}_KICAD_CLI_EXECUTED`, Boolean(real), `${label} must include timestamped kicad-cli execution evidence and a report path.`)
  add(`${label}_ZERO_ERRORS`, real && run.exitCode === 0 && run.errors === 0 && run.violations === 0, `${label} must exit zero with zero errors and zero violations.`)
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
