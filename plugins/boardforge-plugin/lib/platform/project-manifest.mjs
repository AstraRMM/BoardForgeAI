export function buildProjectManifest(project = {}, evidence = {}) {
  return {
    schema: 'boardforge.project-manifest.v1',
    projectId: project.id || project.name || 'unnamed-project',
    projectName: project.name || project.projectName || 'Unnamed BoardForge Project',
    boardPath: project.boardPath || null,
    schematicPath: project.schematicPath || null,
    status: evidence.status || 'in_progress',
    validation: {
      shorts: Number(evidence.shorts ?? 0),
      unconnected: Number(evidence.unconnected ?? 0),
      forbiddenVias: Number(evidence.forbiddenVias ?? 0),
      drcViolations: Number(evidence.drcViolations ?? evidence.drc ?? 0),
      ercViolations: Number(evidence.ercViolations ?? evidence.erc ?? 0),
    },
    manufacturing: {
      ready: Boolean(evidence.manufacturingReady),
      zip: evidence.manufacturingZip || null,
      blockedReason: evidence.manufacturingReady ? null : evidence.blockedReason || 'validation_not_complete',
    },
    reports: evidence.reports || {},
    replay: {
      command: evidence.replayCommand || null,
    },
  }
}

export function isManufacturingReadyManifest(manifest = {}) {
  const validation = manifest.validation || {}
  return Boolean(
    validation.shorts === 0 &&
    validation.unconnected === 0 &&
    validation.forbiddenVias === 0 &&
    validation.drcViolations === 0 &&
    validation.ercViolations === 0 &&
    manifest.manufacturing?.ready,
  )
}
