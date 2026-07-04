import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function calculateProjectHealthScore({ projectDir }) {
  const manifest = await readManifest(projectDir)
  const validation = manifest.validation || {}
  const manufacturing = manifest.manufacturing || {}
  const sourcing = manifest.sourcing || {}
  const deductions = []

  if ((validation.drc ?? 0) > 0) deductions.push({ reason: 'drc_errors', points: 25 })
  if ((validation.erc ?? 0) > 0) deductions.push({ reason: 'erc_errors', points: 20 })
  if ((validation.shorts ?? 0) > 0) deductions.push({ reason: 'shorts_present', points: 30 })
  if ((validation.unconnected ?? 0) > 0) deductions.push({ reason: 'unconnected_items', points: 20 })
  if (!manufacturing.ready) deductions.push({ reason: 'manufacturing_package_missing', points: 15 })
  if (sourcing.state !== 'ASSEMBLY_READY_VERIFIED') deductions.push({ reason: 'assembly_sourcing_not_api_verified', points: 8 })
  if (sourcing.provider === 'digikey' && sourcing.status === 'BLOCKED_SUPPLIER_API') deductions.push({ reason: 'digikey_supplier_api_blocked', points: 10 })
  if ((sourcing.bomRiskCount ?? 0) > 0) deductions.push({ reason: 'bom_sourcing_risk', points: Math.min(20, sourcing.bomRiskCount * 4) })

  const score = Math.max(0, 100 - deductions.reduce((sum, item) => sum + item.points, 0))
  return {
    projectId: manifest.projectId || path.basename(projectDir),
    score,
    label: labelFor(score, validation, manufacturing, sourcing),
    inputs: { validation, manufacturing, sourcing },
    sourcingReadiness: {
      provider: sourcing.provider || 'digikey',
      bomVerificationCoverage: sourcing.bomVerificationCoverage ?? 0,
      quoteReadiness: sourcing.quoteReadiness || 'NOT_CHECKED',
      noFakeStock: true,
    },
    deductions,
    generatedAt: new Date().toISOString(),
  }
}

export async function writeProjectHealthScore({ projectDir }) {
  const report = await calculateProjectHealthScore({ projectDir })
  const json = path.join(projectDir, 'BoardForge_Project_Health_Score.json')
  const md = path.join(projectDir, 'BoardForge_Project_Health_Score.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Project Health Score\n\n- Project: ${report.projectId}\n- Score: ${report.score}\n- Label: ${report.label}\n\n## Deductions\n${report.deductions.map((item) => `- ${item.reason}: -${item.points}`).join('\n') || '- None'}\n`, 'utf8')
  return { status: 'BOARD_FORGE_PROJECT_HEALTH_SCORE_WRITTEN', report, artifactPaths: [json, md] }
}

function labelFor(score, validation, manufacturing, sourcing) {
  if ((validation.drc ?? 0) > 0 || (validation.erc ?? 0) > 0 || (validation.shorts ?? 0) > 0) return 'Needs Work'
  if ((validation.unconnected ?? 0) > 0) return 'Routable'
  if (manufacturing.ready && sourcing.state !== 'ASSEMBLY_READY_VERIFIED') return 'Assembly Not Verified'
  if (manufacturing.ready) return 'PCB Fab Ready'
  if (score >= 80) return 'Ready for Review'
  return 'Blocked'
}

async function readManifest(projectDir) {
  return JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8'))
}
