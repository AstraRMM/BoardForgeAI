import path from 'node:path'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'

export async function hashProjectFiles(projectDir) {
  const files = await collectFiles(projectDir)
  const hashes = []
  for (const file of files) {
    const data = await readFile(file)
    hashes.push({ file, sha256: createHash('sha256').update(data).digest('hex') })
  }
  return hashes
}

export async function writeSourceProtectionReport({ sourceDir, sandboxDir, before, after }) {
  const sourceUntouched = JSON.stringify(before) === JSON.stringify(after)
  const report = {
    status: sourceUntouched ? 'BOARD_FORGE_SOURCE_PROTECTION_PASSED' : 'BOARD_FORGE_SOURCE_PROTECTION_FAILED',
    sourceDir,
    sandboxDir,
    sourceUntouched,
    beforeCount: before.length,
    afterCount: after.length,
    message: sourceUntouched
      ? 'Original project was not modified. BoardForge works on a sandbox copy.'
      : 'Source hash changed; do not proceed without investigation.',
  }
  const mdPath = path.join(sandboxDir, 'BoardForge_Source_Protection_Report.md')
  await writeFile(mdPath, [
    '# BoardForge Source Protection Report',
    '',
    `Source untouched: ${sourceUntouched}`,
    `Source: ${sourceDir}`,
    `Sandbox: ${sandboxDir}`,
    '',
    report.message,
    '',
  ].join('\n'))
  return { report, mdPath }
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(full))
    else files.push(full)
  }
  return files.sort()
}
