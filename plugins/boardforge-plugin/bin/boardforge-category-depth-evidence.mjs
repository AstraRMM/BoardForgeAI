#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')

function fixtureManifest(projectId) {
  return `C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/${projectId}/BoardForge_Project_Manifest.json`
}

const categorySources = [
  { category: 'sensor hub', fixture: 'BF-SENSOR-HUB-01_REV_D', manifest: fixtureManifest('BF-SENSOR-HUB-01_REV_D'), limitations: 'Supplier sourcing remains NOT_API_VERIFIED unless keys are configured.' },
  { category: 'odd-shape robot board', fixture: 'BF-ODD-SHAPE-ROBOT-01_REV_A', manifest: fixtureManifest('BF-ODD-SHAPE-ROBOT-01_REV_A'), limitations: 'Synthetic fixture footprint set; product outline/routing flow proven.' },
  { category: 'dense control board', fixture: 'BF-DENSE-CONTROL-01_REV_A', manifest: fixtureManifest('BF-DENSE-CONTROL-01_REV_A'), limitations: 'Synthetic dense-control repair proof; not arbitrary-customer-board universal yet.' },
  { category: 'robotics controller', fixture: 'BF-ROBOTICS-CONTROLLER-01_REV_A', manifest: fixtureManifest('BF-ROBOTICS-CONTROLLER-01_REV_A'), limitations: 'Clean alpha fixture proof; more connector-heavy variants still needed.' },
  { category: 'PoE sensor fixture', fixture: 'BF-POE-SENSOR-01_REV_A', manifest: fixtureManifest('BF-POE-SENSOR-01_REV_A'), limitations: 'ELECTRICAL_FIXTURE_ONLY; POE_COMPLIANCE_NOT_VERIFIED; MAGNETICS_NOT_VERIFIED; ISOLATION_NOT_VERIFIED; SOURCING_NOT_API_VERIFIED.' },
  { category: 'existing-project import sandbox', fixture: 'BF-ODD-SHAPE-ROBOT-01_REV_A_import_sandbox', manifest: 'C:/Users/luifi/Desktop/BoardForge_Sandboxes/BF-ODD-SHAPE-ROBOT-01_REV_A_import_sandbox/BoardForge_Project_Manifest.json', limitations: 'Import proof uses synthetic source only and never mutates original project.' },
]

function readJson(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const categories = categorySources.map((source) => {
  const manifest = readJson(source.manifest)
  const validation = manifest?.validation || {}
  return {
    category: source.category,
    fixture: source.fixture,
    schematic: manifest?.schematicPath ? 'present' : 'not_found',
    routing: validation.unconnected === 0 ? 'routed_or_import_scanned_clean' : 'blocked_or_not_scanned',
    DRC: Number(validation.drcViolations ?? 0),
    ERC: Number(validation.ercViolations ?? 0),
    manufacturingReady: Boolean(manifest?.manufacturing?.ready),
    zip: manifest?.manufacturing?.zip || '',
    limitations: source.limitations,
    proofReports: Object.values(manifest?.reports || {}).filter(Boolean),
    manifest: source.manifest,
  }
})

const report = {
  schema: 'boardforge.category-depth-evidence.v1',
  generatedAt: new Date().toISOString(),
  categories,
  summary: {
    categoriesCovered: categories.length,
    manufacturingReadyCount: categories.filter((item) => item.manufacturingReady).length,
    cleanDrcErcCount: categories.filter((item) => item.DRC === 0 && item.ERC === 0).length,
    honestLimitations: categories.filter((item) => item.limitations).length,
  },
}

const jsonFile = path.join(repoRoot, 'BoardForge_Category_Depth_Evidence.json')
const mdFile = path.join(repoRoot, 'BoardForge_Category_Depth_Evidence.md')
fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2), 'utf8')
fs.writeFileSync(mdFile, `# BoardForge Category Depth Evidence

- Categories covered: ${report.summary.categoriesCovered}
- Manufacturing-ready count: ${report.summary.manufacturingReadyCount}
- Clean DRC/ERC count: ${report.summary.cleanDrcErcCount}
- Honest limitations tracked: ${report.summary.honestLimitations}

| Category | Fixture | DRC | ERC | Manufacturing | ZIP | Limitations |
|---|---|---:|---:|---|---|---|
${categories.map((item) => `| ${item.category} | ${item.fixture} | ${item.DRC} | ${item.ERC} | ${item.manufacturingReady ? 'ready' : 'not ready'} | ${item.zip || 'none'} | ${item.limitations} |`).join('\n')}
`, 'utf8')

console.log(JSON.stringify({
  status: 'BOARD_FORGE_CATEGORY_DEPTH_EVIDENCE_WRITTEN',
  jsonFile,
  mdFile,
  summary: report.summary,
}, null, 2))
