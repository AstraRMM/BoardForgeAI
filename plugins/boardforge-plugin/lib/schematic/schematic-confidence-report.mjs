import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildSchematicConfidenceGraph } from './schematic-confidence-graph.mjs'

export async function writeSchematicConfidenceReport({ outputDir, fixtures = [] } = {}) {
  await mkdir(outputDir, { recursive: true })
  const graphs = fixtures.map((fixture) => buildSchematicConfidenceGraph(fixture))
  const overallConfidence = Math.round(graphs.reduce((sum, item) => sum + item.overallConfidence, 0) / Math.max(1, graphs.length))
  const graph = {
    schema: 'boardforge.schematic-confidence-suite.v1',
    overallConfidence,
    fixtures: graphs,
  }
  const jsonFile = path.join(outputDir, 'BoardForge_Schematic_Confidence_Graph.json')
  const mdFile = path.join(outputDir, 'BoardForge_Schematic_Confidence_Report.md')
  await writeFile(jsonFile, JSON.stringify(graph, null, 2), 'utf8')
  await writeFile(mdFile, markdown(graph), 'utf8')
  return { graph, jsonFile, mdFile }
}

function markdown(graph) {
  const lines = [
    '# BoardForge Schematic Confidence Report',
    '',
    `Overall confidence: ${graph.overallConfidence}/100`,
    '',
    '| Fixture | Confidence | Power | MCU | Interfaces | Connectors | Sourcing | Risks |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const item of graph.fixtures) {
    lines.push(`| ${item.fixture} | ${item.overallConfidence} | ${item.powerTree} | ${item.mcuSupport} | ${item.interfaces} | ${item.connectors} | ${item.sourcing} | ${item.risks.length} |`)
  }
  lines.push('', '## Human Review Required')
  for (const item of graph.fixtures) {
    for (const review of item.requiredHumanReview) lines.push(`- ${item.fixture}: ${review}`)
  }
  return `${lines.join('\n')}\n`
}
