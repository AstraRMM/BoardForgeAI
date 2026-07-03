import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function diffProjectVersions({ projectDir, compareToDir }) {
  const current = await readManifest(projectDir)
  const previous = compareToDir ? await readManifest(compareToDir) : null
  const currentValidation = current.validation || {}
  const previousValidation = previous?.validation || {}
  return {
    projectId: current.projectId || path.basename(projectDir),
    comparedTo: previous?.projectId || null,
    drcChange: change(previousValidation.drc, currentValidation.drc),
    ercChange: change(previousValidation.erc, currentValidation.erc),
    unconnectedChange: change(previousValidation.unconnected, currentValidation.unconnected),
    manufacturingReadinessChange: { before: previous?.manufacturing?.state || null, after: current.manufacturing?.state || null },
    boardStateChange: { before: previous?.projectState || null, after: current.projectState || null },
    filesAddedOrChanged: await fileSnapshot(projectDir),
    generatedAt: new Date().toISOString(),
  }
}

export async function writeProjectDiffReport({ projectDir, compareToDir }) {
  const report = await diffProjectVersions({ projectDir, compareToDir })
  const json = path.join(projectDir, 'BoardForge_Project_Diff_Report.json')
  const md = path.join(projectDir, 'BoardForge_Project_Diff_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Project Diff Report\n\n- Project: ${report.projectId}\n- Compared to: ${report.comparedTo || 'baseline unavailable'}\n- DRC: ${report.drcChange.before} -> ${report.drcChange.after}\n- ERC: ${report.ercChange.before} -> ${report.ercChange.after}\n- Unconnected: ${report.unconnectedChange.before} -> ${report.unconnectedChange.after}\n- Manufacturing: ${report.manufacturingReadinessChange.before} -> ${report.manufacturingReadinessChange.after}\n`, 'utf8')
  return { status: 'BOARD_FORGE_PROJECT_DIFF_WRITTEN', report, artifactPaths: [json, md] }
}

async function readManifest(dir) {
  return JSON.parse(await readFile(path.join(dir, 'BoardForge_Project_Manifest.json'), 'utf8'))
}

function change(before = null, after = null) {
  return { before, after, delta: typeof before === 'number' && typeof after === 'number' ? after - before : null }
}

async function fileSnapshot(projectDir) {
  const names = ['BoardForge_Project_Manifest.json', 'BoardForge_Board_Review_Report.json', 'BoardForge_Board_Preview.svg']
  const files = []
  for (const name of names) {
    try {
      const info = await stat(path.join(projectDir, name))
      files.push({ file: name, bytes: info.size })
    } catch {}
  }
  return files
}
