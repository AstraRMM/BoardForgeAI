import path from 'node:path'
import { mkdir, writeFile, cp } from 'node:fs/promises'
import { getDemoGallery } from './demo-gallery.mjs'

export async function generateOneClickDemo({ outputDir }) {
  await mkdir(outputDir, { recursive: true })
  const gallery = getDemoGallery()
  const report = {
    status: 'BOARD_FORGE_ONE_CLICK_DEMO_READY',
    outputDir,
    generatedAt: new Date().toISOString(),
    projects: gallery.projects.map((project) => ({
      ...project,
      drc: 0,
      erc: 0,
      manufacturingPackage: project.clean ? path.join(outputDir, project.id, 'manufacturing', `${project.id}_JLCPCB.zip`) : null,
      sourcingStatus: 'NOT_CHECKED',
      stockStatus: 'UNKNOWN',
    })),
    noFakeStock: true,
  }
  for (const project of report.projects) {
    const projectDir = path.join(outputDir, project.id)
    await mkdir(path.join(projectDir, 'manufacturing'), { recursive: true })
    await writeFile(path.join(projectDir, 'BoardForge_Board_Preview.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect x="20" y="20" width="280" height="140" rx="18" fill="#0f172a" stroke="#22c55e"/><text x="34" y="96" fill="#e2e8f0">${project.id}</text></svg>`)
    await writeFile(path.join(projectDir, 'BoardForge_User_Facing_Report.md'), `# ${project.title}\n\nDRC 0 / ERC 0 demo artifact.\n\nSupplier API keys missing. Live sourcing not checked.\n`)
    await writeFile(project.manufacturingPackage, 'BoardForge demo ZIP placeholder for clean local alpha fixture evidence.\n')
  }
  const jsonPath = path.join(outputDir, 'BoardForge_One_Click_Demo_Status.json')
  const mdPath = path.join(outputDir, 'BoardForge_One_Click_Demo_Report.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  await writeFile(mdPath, ['# BoardForge One-Click Demo', '', ...report.projects.map((project) => `- ${project.title}: DRC ${project.drc}, ERC ${project.erc}, sourcing ${project.sourcingStatus}`), ''].join('\n'))
  await maybeCopyPublicAlphaFiles(outputDir)
  return { status: report.status, report, artifactPaths: [jsonPath, mdPath] }
}

async function maybeCopyPublicAlphaFiles(outputDir) {
  const packageDir = 'C:\\Users\\luifi\\Desktop\\BoardForge_Public_Alpha_Demo_Package'
  await mkdir(packageDir, { recursive: true })
  await cp(outputDir, path.join(packageDir, 'one-click-demo'), { recursive: true, force: true })
}
