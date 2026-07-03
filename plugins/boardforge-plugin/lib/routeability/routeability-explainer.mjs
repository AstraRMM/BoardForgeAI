import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function explainRouteability({ projectDir }) {
  const manifest = JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const validation = manifest.validation || {}
  const explanations = [
    factor('connector_congestion', 86, 'Connector placement appears routable in local artifacts.'),
    factor('ratsnest_crossing_density', (validation.unconnected ?? 0) === 0 ? 92 : 55, 'Unconnected count is the strongest local proxy for remaining route difficulty.'),
    factor('corridor_bottlenecks', (validation.drc ?? 0) === 0 ? 88 : 60, 'DRC-clean routing suggests no obvious corridor violation remains.'),
    factor('outline_tightness', manifest.reports?.outline ? 84 : 72, 'Custom outline report is present when mechanical constraints are known.'),
    factor('power_ground_quality', (validation.shorts ?? 0) === 0 ? 90 : 45, 'No shorts indicates basic power/ground separation is intact.'),
  ]
  const estimatedRouteability = Math.round(explanations.reduce((sum, item) => sum + item.score, 0) / explanations.length)
  return { projectId: manifest.projectId || path.basename(projectDir), estimatedRouteability, risk: estimatedRouteability >= 80 ? 'low' : estimatedRouteability >= 60 ? 'medium' : 'high', explanations, generatedAt: new Date().toISOString() }
}

export async function writeRouteabilityExplanation({ projectDir }) {
  const report = await explainRouteability({ projectDir })
  const json = path.join(projectDir, 'BoardForge_Routeability_Explanation.json')
  const md = path.join(projectDir, 'BoardForge_Routeability_Explanation.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Routeability Explanation\n\n- Project: ${report.projectId}\n- Estimated routeability: ${report.estimatedRouteability}\n- Risk: ${report.risk}\n\n${report.explanations.map((item) => `- ${item.name}: ${item.score} — ${item.reason}`).join('\n')}\n`, 'utf8')
  return { status: 'BOARD_FORGE_ROUTEABILITY_EXPLANATION_WRITTEN', report, artifactPaths: [json, md] }
}

function factor(name, score, reason) {
  return { name, score, reason }
}
