import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function scoreManufacturabilityRisk({ projectDir }) {
  const manifest = JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const validation = manifest.validation || {}
  const risks = []
  if ((validation.drc ?? 0) > 0) risks.push(risk('DRC errors', 'critical', 'KiCad DRC must be zero before fab release.'))
  if ((validation.forbiddenVias ?? 0) > 0) risks.push(risk('Forbidden vias', 'critical', 'Remove blind/buried/micro/via-in-pad usage.'))
  if (!manifest.manufacturing?.ready) risks.push(risk('Manufacturing package missing', 'high', 'Generate Gerbers, drill, BOM, CPL, and ZIP after validation.'))
  if (manifest.sourcing?.state !== 'ASSEMBLY_READY_VERIFIED') risks.push(risk('Assembly not supplier verified', 'medium', 'PCB fab can be ready while assembly stock remains NOT_CHECKED.'))
  const score = Math.max(0, 100 - risks.reduce((sum, item) => sum + item.points, 0))
  return { projectId: manifest.projectId || path.basename(projectDir), score, riskLevel: score >= 85 ? 'low' : score >= 65 ? 'medium' : 'high', risks, generatedAt: new Date().toISOString() }
}

export async function writeManufacturingRiskReport({ projectDir }) {
  const report = await scoreManufacturabilityRisk({ projectDir })
  const json = path.join(projectDir, 'BoardForge_Manufacturing_Risk_Report.json')
  const md = path.join(projectDir, 'BoardForge_Manufacturing_Risk_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Manufacturing Risk Report\n\n- Project: ${report.projectId}\n- Score: ${report.score}\n- Risk: ${report.riskLevel}\n\n${report.risks.map((item) => `- ${item.severity}: ${item.issue} — ${item.recommendation}`).join('\n') || '- No local manufacturability blockers detected.'}\n`, 'utf8')
  return { status: 'BOARD_FORGE_MANUFACTURING_RISK_WRITTEN', report, artifactPaths: [json, md] }
}

function risk(issue, severity, recommendation) {
  const points = severity === 'critical' ? 30 : severity === 'high' ? 20 : 8
  return { issue, severity, recommendation, points }
}
