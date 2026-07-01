export function validateBomRows(rows = []) {
  const issues = []
  rows.forEach((row, index) => {
    for (const field of ['ref', 'quantity', 'footprint', 'mpn', 'sourcingStatus']) {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        issues.push({ type: 'BOM_FIELD_MISSING', row: index, field })
      }
    }
    if (row.sourcingStatus === 'PLACEHOLDER' && !row.placeholderDisclosure) {
      issues.push({ type: 'PLACEHOLDER_NOT_DISCLOSED', row: index, field: 'placeholderDisclosure' })
    }
  })
  return {
    schema: 'boardforge.bom-validation.v1',
    valid: issues.length === 0,
    rowCount: rows.length,
    issues,
  }
}

export function validateCplRows(rows = []) {
  const issues = []
  rows.forEach((row, index) => {
    for (const field of ['ref', 'x', 'y', 'rotation', 'side']) {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        issues.push({ type: 'CPL_FIELD_MISSING', row: index, field })
      }
    }
  })
  return {
    schema: 'boardforge.cpl-validation.v1',
    valid: issues.length === 0,
    rowCount: rows.length,
    issues,
  }
}

export function validateJlcpcbPackageContents(files = []) {
  const normalized = files.map((file) => String(file).toLowerCase())
  const required = {
    gerber: normalized.some((file) => /\.(gtl|gbl|gts|gbs|gto|gbo|gbr)$/.test(file)),
    drill: normalized.some((file) => /\.(drl|xln)$/.test(file)),
    bom: normalized.some((file) => /bom.*\.csv$/.test(file)),
    cpl: normalized.some((file) => /(cpl|pos|position).*\.csv$/.test(file)),
  }
  const missing = Object.entries(required).filter(([, present]) => !present).map(([name]) => name)
  return {
    schema: 'boardforge.jlcpcb-package-content-validation.v1',
    valid: missing.length === 0,
    required,
    missing,
  }
}

export function validateProductionPackage({ bomRows = [], cplRows = [], packageFiles = [] } = {}) {
  const bom = validateBomRows(bomRows)
  const cpl = validateCplRows(cplRows)
  const jlcpcb = validateJlcpcbPackageContents(packageFiles)
  return {
    schema: 'boardforge.production-package-validation.v1',
    valid: bom.valid && cpl.valid && jlcpcb.valid,
    bom,
    cpl,
    jlcpcb,
    blockers: [
      ...bom.issues,
      ...cpl.issues,
      ...jlcpcb.missing.map((field) => ({ type: 'PACKAGE_FILE_MISSING', field })),
    ],
  }
}
