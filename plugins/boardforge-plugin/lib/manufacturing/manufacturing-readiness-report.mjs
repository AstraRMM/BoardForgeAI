export function buildManufacturingReadinessReport({ manifest = {}, partVerification = {}, artifacts = {}, options = {} } = {}) {
  const validation = normalizeValidation(manifest.validation || options.validation || {})
  const artifactGates = buildArtifactGates({ manifest, artifacts })
  const partGate = buildPartVerificationGate(partVerification)
  const hardGates = [
    gate('shorts_zero', validation.shorts === 0, `${validation.shorts} short(s)`),
    gate('unconnected_zero', validation.unconnected === 0, `${validation.unconnected} unconnected item(s)`),
    gate('forbidden_vias_zero', validation.forbiddenVias === 0, `${validation.forbiddenVias} forbidden via(s)`),
    gate('drc_zero', validation.drcViolations === 0, `${validation.drcViolations} DRC violation(s)`),
    gate('erc_zero', validation.ercViolations === 0, `${validation.ercViolations} ERC violation(s)`),
    ...artifactGates,
    partGate,
  ]
  const blockers = hardGates.filter((item) => item.status === 'blocked')
  const warnings = [
    ...(partVerification.summary?.manualCandidates ? [{ code: 'MANUAL_SOURCING_CANDIDATES', count: partVerification.summary.manualCandidates }] : []),
    ...(partVerification.summary?.notChecked ? [{ code: 'SOURCING_NOT_CHECKED', count: partVerification.summary.notChecked }] : []),
  ]
  return {
    schema: 'boardforge.manufacturing-readiness-report.v1',
    generatedAt: options.generatedAt || new Date().toISOString(),
    projectId: manifest.projectId || options.projectId || 'unknown-project',
    status: blockers.length ? 'MANUFACTURING_BLOCKED' : warnings.length ? 'MANUFACTURING_NEEDS_REVIEW' : 'MANUFACTURING_READY',
    ready: blockers.length === 0,
    validation,
    gates: hardGates,
    blockers,
    warnings,
    policy: {
      noFakeManufacturingReadiness: true,
      requiresCleanDrcErc: true,
      requiresZeroUnconnected: true,
      requiresZeroForbiddenVias: true,
      requiresBomCplGerberDrillZip: true,
      requiresCriticalPinMapChecks: true,
    },
  }
}

export function canExportManufacturingPackage(input = {}) {
  const report = buildManufacturingReadinessReport(input)
  return {
    allowed: report.ready,
    status: report.status,
    blockers: report.blockers,
    report,
  }
}

function normalizeValidation(validation) {
  return {
    shorts: number(validation.shorts ?? validation.shorting),
    unconnected: number(validation.unconnected ?? validation.unrouted),
    forbiddenVias: number(validation.forbiddenVias ?? validation.forbiddenViasUsed),
    drcViolations: number(validation.drcViolations ?? validation.drc),
    ercViolations: number(validation.ercViolations ?? validation.erc),
  }
}

function buildArtifactGates({ manifest, artifacts }) {
  const manufacturing = manifest.manufacturing || {}
  const artifactMap = {
    gerbers: artifacts.gerbers,
    drill: artifacts.drill,
    bom: artifacts.bom,
    cpl: artifacts.cpl,
    jlcpcbZip: artifacts.jlcpcbZip || manufacturing.zip,
  }
  return [
    gate('gerbers_exported', present(artifactMap.gerbers), 'Gerbers missing'),
    gate('drill_exported', present(artifactMap.drill), 'Drill files missing'),
    gate('bom_exported', present(artifactMap.bom), 'BOM missing'),
    gate('cpl_exported', present(artifactMap.cpl), 'CPL missing'),
    gate('jlcpcb_zip_exported', present(artifactMap.jlcpcbZip), 'JLCPCB ZIP missing'),
  ]
}

function buildPartVerificationGate(partVerification) {
  const summary = partVerification.summary || {}
  const criticalFailures = number(summary.placeholders) + number(summary.outOfStock) + number(summary.obsolete)
  const unverified = number(summary.notChecked)
  const apiVerified = number(summary.apiVerified)
  const total = number(summary.total)
  if (criticalFailures > 0) return gate('critical_part_verification', false, `${criticalFailures} placeholder/out-of-stock/obsolete part(s)`)
  if (total > 0 && apiVerified === 0 && unverified > 0) return gate('critical_part_verification', false, `${unverified} part(s) not checked and no API verified sourcing`)
  return gate('critical_part_verification', true, `${apiVerified} API verified part(s), ${unverified} unchecked part(s)`)
}

function gate(name, pass, why) {
  return { name, status: pass ? 'passed' : 'blocked', why }
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Boolean(value.path || value.file || value.exists || value.status === 'generated')
  return Boolean(value)
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
