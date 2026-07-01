import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { check3dModelCoverage } from './kicad-3d-model-checker.mjs'

export async function write3dModelCoverageReport({ outputDir, footprints = [] } = {}) {
  await mkdir(outputDir, { recursive: true })
  const coverage = check3dModelCoverage(footprints)
  const jsonFile = path.join(outputDir, 'BoardForge_3D_Model_Coverage.json')
  const mdFile = path.join(outputDir, 'BoardForge_3D_Model_Coverage_Report.md')
  await writeFile(jsonFile, JSON.stringify(coverage, null, 2), 'utf8')
  await writeFile(mdFile, markdown(coverage), 'utf8')
  return { coverage, jsonFile, mdFile }
}

function markdown(coverage) {
  const lines = [
    '# BoardForge 3D Model Coverage Report',
    '',
    `Coverage score: ${coverage.coverageScore}/100`,
    `Footprints checked: ${coverage.footprintsChecked}`,
    `Models resolved: ${coverage.modelsResolved}`,
    `Missing/placeholders disclosed: ${coverage.placeholdersOrDisclosedMissing + coverage.missing}`,
    '',
    '| Ref | Footprint | Status | Source | Model exists | Risk |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const row of coverage.rows) {
    lines.push(`| ${row.ref} | ${row.footprint} | ${row.status} | ${row.source} | ${row.modelExists ? 'yes' : 'no'} | ${row.risk} |`)
  }
  return `${lines.join('\n')}\n`
}
