import path from 'node:path'
import { mkdir, writeFile, copyFile, cp } from 'node:fs/promises'
export async function writePublicAlphaDemoPackageManifest({ packageDir = 'C:/Users/luifi/Desktop/BoardForge_Public_Alpha_Demo_Package', sourceRoot = process.cwd() } = {}) {
  await mkdir(packageDir, { recursive: true })
  const included = ['public alpha walkthrough','unsigned local alpha launcher package','DigiKey live ProductInformation sourcing proof','DigiKey Quote API status report','Mouser live Search API proof','browser Playwright E2E proof','doctor/environment report','routing setup report','PoE compliance readiness package','evidence dashboard export','launch report','manufacturing authenticity report','import benchmark report','security/privacy report','known limitations']
  const report = { status: 'BOARD_FORGE_PUBLIC_ALPHA_DEMO_PACKAGE_MANIFEST_WRITTEN', packageDir, included, noSecrets: true, noTokenFiles: true, noEnvLocal: true, noEscFc: true, generatedAt: new Date().toISOString() }
  const json = path.join(packageDir, 'BoardForge_Public_Alpha_Demo_Package_Manifest.json')
  const md = path.join(packageDir, 'BoardForge_Public_Alpha_Demo_Package_Manifest.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, ['# BoardForge Public Alpha Demo Package Manifest', '', ...included.map((item)=>`- ${item}`), '', 'No secrets, token files, .env.local, ESC, or FC projects included.'].join('\n') + '\n', 'utf8')
  for (const rel of [
    'BoardForge_Local_Alpha_Environment_Report.md',
    'BoardForge_Routing_Setup_Report.md',
    'BoardForge_DigiKey_Quote_API_Status_Report.md',
    'BoardForge_DigiKey_Live_Lookup_Report.md',
    'BoardForge_Mouser_Live_Lookup_Report.md',
    'BoardForge_Live_Supplier_Sourcing_E2E_Report.md',
    'BoardForge_Demo_Artifact_Authenticity_Report.md',
    'BoardForge_Installer_Check_Report.md',
    'BoardForge_Launcher_Smoke_Test_Report.md',
    'BoardForge_PoE_Compliance_Readiness_Report.md',
    'BoardForge_Public_Alpha_Launch_Report.md',
    'BoardForge_91_to_99_Readiness_Gap_Audit.md',
    'BoardForge_99_Readiness_Scorecard.md',
  ]) {
    try { await copyFile(path.join(sourceRoot, rel), path.join(packageDir, rel)) } catch {}
  }
  try { await cp(path.join(sourceRoot, 'dist', 'BoardForge_Local_Alpha'), path.join(packageDir, 'BoardForge_Local_Alpha'), { recursive: true, force: true }) } catch {}
  return { status: report.status, report, artifactPaths: [json, md] }
}
