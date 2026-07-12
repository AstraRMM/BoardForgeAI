export const CRITICAL_REJECT_REASONS = [
  'forbidden_via',
  'board_outline_changed',
  'mounting_holes_moved',
  'parts_footprints_packages_changed',
  'netlist_changed',
  'pads_deleted',
  'fatal_kicad_parse_error',
]

export function summarizeDrcReport(report = {}) {
  const violations = report.violations || []
  const counts = {}
  for (const violation of violations) {
    counts[violation.type || 'unknown'] = (counts[violation.type || 'unknown'] || 0) + 1
  }
  const unconnected = Number(report.unconnected ?? report.unconnectedCount ?? (report.unconnected_items || []).length ?? 0)
  return {
    totalViolations: Number(report.totalViolations ?? violations.length ?? 0),
    errors: Number(report.errors ?? violations.filter((v) => v.severity === 'error').length ?? 0),
    warnings: Number(report.warnings ?? violations.filter((v) => v.severity === 'warning').length ?? 0),
    unconnected,
    shorts: Number(report.shorts ?? counts.shorting_items ?? counts.shorting ?? 0),
    forbiddenVias: Number(report.forbiddenVias ?? counts.forbidden_via ?? 0),
    tracksCrossing: Number(report.tracksCrossing ?? counts.tracks_crossing ?? 0),
    clearance: Number(report.clearance ?? counts.clearance ?? 0),
    holeClearance: Number(report.holeClearance ?? counts.hole_clearance ?? 0),
    copperEdge: Number(report.copperEdge ?? counts.copper_edge_clearance ?? 0),
    solderMask: Number(report.solderMask ?? counts.solder_mask_bridge ?? 0),
    dangling: Number(report.dangling ?? (counts.track_dangling || 0) + (counts.via_dangling || 0)),
    counts,
  }
}

export function rejectRouterResult(result = {}) {
  const reasons = []
  const summary = summarizeDrcReport(result.drc || result)
  if (summary.forbiddenVias > 0) reasons.push('forbidden_via')
  if (result.boardOutlineChanged || result.originalSpec?.boardOutlineChanged) reasons.push('board_outline_changed')
  if (result.mountingHolesMoved || result.originalSpec?.mountingHolesChanged) reasons.push('mounting_holes_moved')
  if (
    result.partsFootprintsPackagesChanged
    || result.originalSpec?.partsChanged
    || result.originalSpec?.footprintsChanged
    || result.originalSpec?.packagesChanged
  ) reasons.push('parts_footprints_packages_changed')
  if (result.netlistChanged || result.originalSpec?.padsNetsChanged) reasons.push('netlist_changed')
  if (result.padsDeleted) reasons.push('pads_deleted')
  if (result.fatalKiCadParseError) reasons.push('fatal_kicad_parse_error')
  return {
    rejected: reasons.length > 0,
    reasons,
  }
}

export function scoreRouterResult(result = {}) {
  const summary = summarizeDrcReport(result.drc || result)
  const rejection = rejectRouterResult(result)
  const score =
    summary.shorts * 1_000_000
    + summary.forbiddenVias * 900_000
    + summary.unconnected * 10_000
    + summary.tracksCrossing * 8_000
    + summary.clearance * 500
    + summary.holeClearance * 450
    + summary.copperEdge * 350
    + summary.dangling * 200
    + summary.solderMask * 100
    + summary.totalViolations
    + Number(result.destructiveCopperChanges || 0) * 50
  return {
    backend: result.backend || 'unknown',
    rejected: rejection.rejected,
    rejectReasons: rejection.reasons,
    score: rejection.rejected ? Number.POSITIVE_INFINITY : score,
    summary,
  }
}

export function chooseBestRouterResult(results = []) {
  const scored = results.map(scoreRouterResult).sort((a, b) => a.score - b.score)
  return {
    scored,
    best: scored.find((candidate) => !candidate.rejected) || null,
  }
}
