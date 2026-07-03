import path from 'node:path'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { hashProjectFiles, writeSourceProtectionReport } from './source-protection-report.mjs'
import { validateProjectPath } from '../platform/local-server/request-validator.mjs'

export async function runImportWizard({ sourceDir, sandboxDir }) {
  const sourceGuard = validateProjectPath(sourceDir)
  if (!sourceGuard.allowed) throw new Error(`source_refused:${sourceGuard.reason}`)
  const sandboxGuard = validateProjectPath(sandboxDir)
  if (!sandboxGuard.allowed) throw new Error(`sandbox_refused:${sandboxGuard.reason}`)
  await mkdir(sandboxDir, { recursive: true })
  const before = await hashProjectFiles(sourceDir)
  await cp(sourceDir, sandboxDir, { recursive: true, force: true })
  const after = await hashProjectFiles(sourceDir)
  const sourceProtection = await writeSourceProtectionReport({ sourceDir, sandboxDir, before, after })
  const report = {
    status: sourceProtection.report.sourceUntouched ? 'BOARD_FORGE_IMPORT_WIZARD_COMPLETED' : 'BOARD_FORGE_IMPORT_WIZARD_BLOCKED',
    sourceDir,
    sandboxDir,
    sourceUntouched: sourceProtection.report.sourceUntouched,
    sandboxModifiedOnly: true,
    nextAction: 'Run Make Manufacturable on the sandbox copy.',
  }
  const jsonPath = path.join(sandboxDir, 'BoardForge_Import_Report.json')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  return { status: report.status, report, artifactPaths: [jsonPath, sourceProtection.mdPath] }
}
