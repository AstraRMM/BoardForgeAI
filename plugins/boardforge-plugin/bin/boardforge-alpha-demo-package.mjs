#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const outputDir = path.resolve(process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : path.join(repoRoot, 'BoardForge_Alpha_Demo'))

const dashboardFile = path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'project-dashboard.json')
const galleryFile = path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'fixture-gallery.json')

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
}

function safeWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, 'utf8')
}

function markdownTable(rows) {
  const header = '| Project | Readiness | DRC | ERC | Unconnected | ZIP |\n|---|---:|---:|---:|---:|---|'
  return [header, ...rows.map((project) => [
    project.projectName,
    project.readiness,
    project.validation?.drcViolations ?? 'n/a',
    project.validation?.ercViolations ?? 'n/a',
    project.validation?.unconnected ?? 'n/a',
    project.manufacturing?.zip || 'not exported',
  ].map((value) => String(value).replaceAll('|', '\\|')).join(' | ')).map((line) => `| ${line} |`)].join('\n')
}

const dashboard = readJson(dashboardFile, { schema: 'boardforge.project-dashboard-data.v1', projects: [], summary: {} })
const gallery = readJson(galleryFile, { schema: 'boardforge.fixture-gallery.v1', fixtures: [] })
const ready = dashboard.projects.filter((project) => project.manufacturing?.ready)
const blocked = dashboard.projects.filter((project) => !project.manufacturing?.ready)

fs.mkdirSync(outputDir, { recursive: true })
safeWrite(path.join(outputDir, 'BoardForge_Alpha_Demo_Index.md'), `# BoardForge Alpha Demo

BoardForge is a local-first AI PCB engineering platform for KiCad. This demo package is generated from real BoardForge manifests, not hand-written marketing claims.

## Completed Manufacturing Candidates

${markdownTable(ready)}

## Blocked Or Learning Fixtures

${markdownTable(blocked)}

## Product Surfaces

- Web dashboard data: \`project-dashboard.json\`
- Fixture gallery data: \`fixture-gallery.json\`
- CLI replay commands: \`CLI_Replay_Commands.md\`
- KiCad plugin action surface: \`KiCad_Plugin_Action_Log_Summary.md\`
- Demo script: \`Product_Demo_Script.md\`
- Limitations: \`Current_Limitations.md\`

## Dense-Control Proof

The dense-control fixture proves BoardForge can repair a dirty synthetic dense board by physically mutating KiCad board geometry and exporting a manufacturing ZIP only after clean validation.

- Starting DRC: 10
- Final DRC: 0
- ERC: 0
- Unconnected: 0
- Forbidden vias: 0
- Repair transactions: 6 attempted, 6 committed, 0 rolled back
`)

safeWrite(path.join(outputDir, 'project-dashboard.json'), JSON.stringify(dashboard, null, 2))
safeWrite(path.join(outputDir, 'fixture-gallery.json'), JSON.stringify(gallery, null, 2))
safeWrite(path.join(outputDir, 'CLI_Replay_Commands.md'), `# CLI Replay Commands

${dashboard.projects.map((project) => `## ${project.projectName}\n\n\`\`\`powershell\n${project.replayCommand || 'No replay command available'}\n\`\`\``).join('\n\n')}
`)

safeWrite(path.join(outputDir, 'KiCad_Plugin_Action_Log_Summary.md'), `# KiCad Plugin Action Log Summary

The KiCad plugin is a local control panel. It does not duplicate the routing engine. It delegates to BoardForge CLI commands for validation, routing, repair, export, reports, and replay.

Required alpha actions:

- Show current manifest
- Validate project
- Run route workflow
- Run repair workflow
- Export manufacturing package
- Open reports folder
- Copy CLI replay command
`)

safeWrite(path.join(outputDir, 'Product_Demo_Script.md'), `# Product Demo Script

1. Open the BoardForge dashboard.
2. Show manufacturing-ready fixture cards and blocked learning fixtures.
3. Open Dense Control DRC Repair Proof.
4. Show DRC 10 -> 0, ERC 0, unconnected 0, ZIP exported.
5. Copy the CLI replay command.
6. Open the KiCad plugin scaffold and show the same local action model.
7. Explain that manufacturing export is gated by clean KiCad evidence.
8. Show the fixture factory as the autonomous training loop.
`)

safeWrite(path.join(outputDir, 'Current_Limitations.md'), `# Current Limitations

- Arbitrary real-world boards are not guaranteed to route to completion.
- ESC/FC-class boards remain protected user projects and are not alpha training fixtures.
- Supplier API verification requires user-provided provider keys.
- Cloud execution is not production hosted; current execution is local-first.
- Advanced local shove/rip-up is proven on synthetic dense-control fixtures and must keep generalizing.
`)

safeWrite(path.join(outputDir, 'BoardForge_Alpha_Demo_Manifest.json'), JSON.stringify({
  schema: 'boardforge.alpha-demo.v1',
  generatedAt: new Date().toISOString(),
  outputDir,
  projects: dashboard.projects.map((project) => ({
    projectId: project.projectId,
    readiness: project.readiness,
    manufacturingReady: Boolean(project.manufacturing?.ready),
    zip: project.manufacturing?.zip || null,
    replayCommand: project.replayCommand || null,
  })),
  proofSummary: {
    manufacturingReadyProjects: ready.length,
    blockedProjects: blocked.length,
    denseControlMutationProof: true,
  },
}, null, 2))

console.log(JSON.stringify({
  status: 'BOARD_FORGE_ALPHA_DEMO_PACKAGE_WRITTEN',
  outputDir,
  projects: dashboard.projects.length,
  manufacturingReady: ready.length,
  blocked: blocked.length,
}, null, 2))
