import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function normalizeManifestValidation(manifest = {}) {
  const validation = manifest.validation || {}
  const drcViolations = firstNumber(
    validation.drcViolations,
    sumIfAny(validation.drcErrors, validation.drcWarnings),
    validation.drc,
  )
  const ercViolations = firstNumber(
    validation.ercViolations,
    sumIfAny(validation.ercErrors, validation.ercWarnings),
    validation.erc,
  )
  return {
    shorts: firstNumber(validation.shorts, validation.shorting, 0),
    unconnected: firstNumber(validation.unconnected, validation.unrouted, 0),
    forbiddenVias: firstNumber(validation.forbiddenVias, validation.forbiddenViasUsed, 0),
    drcViolations,
    drcErrors: firstNumber(validation.drcErrors, drcViolations, 0),
    drcWarnings: firstNumber(validation.drcWarnings, 0),
    ercViolations,
    ercErrors: firstNumber(validation.ercErrors, ercViolations, 0),
    ercWarnings: firstNumber(validation.ercWarnings, 0),
    namedNets: firstNumber(validation.namedNets, validation.totalNets, 0),
    routedSegments: firstNumber(validation.routedSegments, validation.segments, 0),
    nettedPads: firstNumber(validation.nettedPads, 0),
    schematicGraphStatus: validation.schematicGraphStatus || 'unknown',
  }
}

export function buildProjectDashboardCard(manifest = {}, options = {}) {
  const validation = normalizeManifestValidation(manifest)
  const manufacturingReady = Boolean(manifest.manufacturing?.ready)
  const readiness = readinessState({ validation, manufacturingReady })
  return {
    schema: 'boardforge.project-dashboard-card.v1',
    projectId: manifest.projectId || manifest.projectName || options.projectId || 'unknown-project',
    projectName: manifest.projectName || manifest.projectId || options.projectName || 'Unknown BoardForge Project',
    status: manifest.status || 'unknown',
    boardPath: manifest.boardPath || null,
    schematicPath: manifest.schematicPath || null,
    readiness,
    routingCompletionPercent: routingCompletionPercent(validation),
    validation,
    manufacturing: {
      ready: manufacturingReady,
      zip: manifest.manufacturing?.zip || null,
      blockedReason: manufacturingReady ? null : manifest.manufacturing?.blockedReason || firstBlocker(validation) || 'manufacturing_validation_not_complete',
    },
    reports: manifest.reports || {},
    replayCommand: manifest.replay?.command || manifest.replayCommand || null,
    criticalBlockers: criticalBlockers(validation, manufacturingReady),
    nextAction: nextProjectAction(validation, manufacturingReady),
    sourceManifest: options.sourceManifest || null,
  }
}

export function buildProjectDashboardData(manifests = [], options = {}) {
  const cards = manifests.map((manifest, index) => buildProjectDashboardCard(manifest, {
    projectId: manifest?.projectId || `project-${index + 1}`,
    sourceManifest: manifest?.sourceManifest || options.sourceManifests?.[index] || null,
  }))
  return {
    schema: 'boardforge.project-dashboard-data.v1',
    generatedAt: options.generatedAt || new Date().toISOString(),
    summary: {
      totalProjects: cards.length,
      manufacturingReady: cards.filter((card) => card.manufacturing.ready).length,
      blocked: cards.filter((card) => card.readiness === 'blocked').length,
      review: cards.filter((card) => card.readiness === 'review').length,
      needsRouting: cards.filter((card) => card.validation.unconnected > 0).length,
      cleanDrcErc: cards.filter((card) => card.validation.drcViolations === 0 && card.validation.ercViolations === 0).length,
    },
    projects: cards.sort(projectSort),
  }
}

export async function loadProjectDashboardData(manifestPaths = [], options = {}) {
  const manifests = []
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifests.push({ ...manifest, sourceManifest: path.resolve(manifestPath) })
  }
  return buildProjectDashboardData(manifests, { ...options, sourceManifests: manifestPaths.map((file) => path.resolve(file)) })
}

export async function writeProjectDashboardData({ manifestPaths = [], outputPath, generatedAt } = {}) {
  if (!outputPath) throw new Error('outputPath is required')
  const dashboard = await loadProjectDashboardData(manifestPaths, { generatedAt })
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(dashboard, null, 2), 'utf8')
  return { dashboard, outputPath }
}

function readinessState({ validation, manufacturingReady }) {
  if (manufacturingReady && validation.shorts === 0 && validation.unconnected === 0 && validation.forbiddenVias === 0 && validation.drcViolations === 0 && validation.ercViolations === 0) return 'ready'
  if (validation.shorts > 0 || validation.forbiddenVias > 0) return 'blocked'
  if (validation.unconnected > 0 || validation.drcViolations > 0 || validation.ercViolations > 0) return 'blocked'
  return 'review'
}

function routingCompletionPercent(validation) {
  if (!validation.namedNets && validation.unconnected === 0 && validation.routedSegments > 0) return 100
  if (!validation.namedNets) return validation.unconnected === 0 ? 100 : 0
  const unrouted = Math.max(0, validation.unconnected)
  const routed = Math.max(0, validation.namedNets - unrouted)
  return Math.max(0, Math.min(100, Math.round((routed / validation.namedNets) * 100)))
}

function criticalBlockers(validation, manufacturingReady) {
  const blockers = []
  if (validation.shorts > 0) blockers.push({ code: 'SHORTS_PRESENT', count: validation.shorts, severity: 'critical' })
  if (validation.forbiddenVias > 0) blockers.push({ code: 'FORBIDDEN_VIAS_PRESENT', count: validation.forbiddenVias, severity: 'critical' })
  if (validation.unconnected > 0) blockers.push({ code: 'UNCONNECTED_ITEMS', count: validation.unconnected, severity: 'error' })
  if (validation.drcViolations > 0) blockers.push({ code: 'DRC_VIOLATIONS', count: validation.drcViolations, severity: 'error' })
  if (validation.ercViolations > 0) blockers.push({ code: 'ERC_VIOLATIONS', count: validation.ercViolations, severity: 'error' })
  if (!manufacturingReady && !blockers.length) blockers.push({ code: 'MANUFACTURING_EXPORT_REVIEW_REQUIRED', count: 1, severity: 'review' })
  return blockers
}

function nextProjectAction(validation, manufacturingReady) {
  if (validation.shorts > 0) return 'repair_shorts_first'
  if (validation.forbiddenVias > 0) return 'rollback_forbidden_vias'
  if (validation.unconnected > 0) return 'run_exact_ratsnest_finisher'
  if (validation.drcViolations > 0) return 'repair_drc'
  if (validation.ercViolations > 0) return 'repair_erc'
  if (!manufacturingReady) return 'export_manufacturing_package'
  return 'human_manufacturing_review'
}

function firstBlocker(validation) {
  return criticalBlockers(validation, false)[0]?.code?.toLowerCase() || null
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return 0
}

function sumIfAny(a, b) {
  if (a === undefined && b === undefined) return undefined
  return firstNumber(a, 0) + firstNumber(b, 0)
}

function projectSort(a, b) {
  const order = { ready: 0, review: 1, blocked: 2 }
  return (order[a.readiness] ?? 9) - (order[b.readiness] ?? 9)
    || a.projectName.localeCompare(b.projectName)
}
