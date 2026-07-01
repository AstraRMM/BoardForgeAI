import { resolve3dModel } from './3d-model-resolver.mjs'

export function check3dModelCoverage(footprints = [], options = {}) {
  const rows = footprints.map((item) => resolve3dModel(item, options.env || process.env))
  const pass = rows.filter((row) => row.status === 'PASS').length
  const warnings = rows.filter((row) => row.status === 'WARNING').length
  const fail = rows.filter((row) => row.status === 'FAIL').length
  const coverageScore = Math.max(0, Math.round(((pass + warnings * 0.65) / Math.max(1, rows.length)) * 100 - fail * 4))
  return {
    schema: 'boardforge.3d-model-coverage.v1',
    footprintsChecked: rows.length,
    modelsResolved: pass,
    placeholdersOrDisclosedMissing: warnings,
    missing: fail,
    coverageScore,
    rows,
  }
}
