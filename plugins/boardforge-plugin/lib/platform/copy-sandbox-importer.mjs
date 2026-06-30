import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { assertPathIsAllowed } from './protected-path-guard.mjs'
import { buildProjectManifest } from './project-manifest.mjs'

const DEFAULT_SANDBOX_ROOT = 'C:\\Users\\luifi\\Desktop\\BoardForge_Sandboxes'

export function importProjectToSandbox(options = {}) {
  const source = path.resolve(options.source || options.sourcePath || '')
  if (!source || !fs.existsSync(source)) throw new Error(`Source project does not exist: ${options.source || ''}`)
  const sourceGuard = assertPathIsAllowed(source)
  if (!sourceGuard.allowed) {
    return blockedResult(source, sourceGuard)
  }

  const projectName = path.basename(source)
  const sandboxRoot = path.resolve(options.sandboxRoot || DEFAULT_SANDBOX_ROOT)
  const output = path.resolve(options.output || path.join(sandboxRoot, `${projectName}_import_sandbox`))
  const outputGuard = assertPathIsAllowed(output)
  if (!outputGuard.allowed) {
    return blockedResult(output, outputGuard)
  }

  const beforeHashes = hashProjectFiles(source)
  fs.rmSync(output, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.cpSync(source, output, { recursive: true, force: true })
  const afterHashes = hashProjectFiles(source)
  const originalUntouched = compareHashMaps(beforeHashes, afterHashes)

  const copiedManifest = readFirstJson([
    path.join(output, 'BoardForge_Project_Manifest.json'),
    path.join(output, 'boardforge-project-manifest.json'),
  ])
  const validation = copiedManifest?.validation || {}
  const manufacturing = copiedManifest?.manufacturing || {}
  const boardFile = findFirstFile(output, '.kicad_pcb')
  const schematicFile = findFirstFile(output, '.kicad_sch')
  const manifest = buildProjectManifest({
    id: `${projectName}_import_sandbox`,
    name: `${projectName} Import Sandbox`,
    boardPath: boardFile,
    schematicPath: schematicFile,
  }, {
    status: 'existing_project_import_sandbox_scanned',
    shorts: validation.shorts ?? validation.shortCount ?? 0,
    unconnected: validation.unconnected ?? 0,
    forbiddenVias: validation.forbiddenVias ?? 0,
    drcViolations: validation.drcViolations ?? validation.drcErrors ?? 0,
    ercViolations: validation.ercViolations ?? validation.ercErrors ?? 0,
    manufacturingReady: Boolean(manufacturing.ready),
    manufacturingZip: manufacturing.zip || null,
    reports: {
      importReport: path.join(output, 'BoardForge_Copy_Sandbox_Import_Report.md'),
    },
    replayCommand: `npm run boardforge:import-sandbox -- --source "${source}"`,
  })

  const result = {
    schema: 'boardforge.copy-sandbox-import.v1',
    status: originalUntouched ? 'COPY_SANDBOX_IMPORT_COMPLETED' : 'COPY_SANDBOX_IMPORT_FAILED_SOURCE_CHANGED',
    source,
    sandboxOutput: output,
    originalUntouched,
    protectedPathGuard: 'passed',
    copiedFiles: Object.keys(beforeHashes).length,
    sourceHashBefore: digestHashMap(beforeHashes),
    sourceHashAfter: digestHashMap(afterHashes),
    manifestGenerated: true,
    drcErcScannedFromCopy: Boolean(copiedManifest),
    validation: manifest.validation,
    manufacturing: manifest.manufacturing,
    boardFile,
    schematicFile,
    replayCommand: manifest.replay.command,
    reports: {
      json: path.join(output, 'BoardForge_Copy_Sandbox_Import_Report.json'),
      markdown: path.join(output, 'BoardForge_Copy_Sandbox_Import_Report.md'),
      manifest: path.join(output, 'BoardForge_Project_Manifest.json'),
    },
  }

  fs.writeFileSync(result.reports.manifest, JSON.stringify(manifest, null, 2), 'utf8')
  fs.writeFileSync(result.reports.json, JSON.stringify(result, null, 2), 'utf8')
  fs.writeFileSync(result.reports.markdown, importReportMarkdown(result), 'utf8')
  return result
}

function blockedResult(target, guard) {
  return {
    schema: 'boardforge.copy-sandbox-import.v1',
    status: 'COPY_SANDBOX_IMPORT_BLOCKED_PROTECTED_PATH',
    source: target,
    protectedPathGuard: 'blocked',
    reason: guard.reason,
    originalUntouched: true,
    sandboxOutput: null,
  }
}

function hashProjectFiles(root) {
  const files = listFiles(root)
  const hashes = {}
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    hashes[relative] = sha256(fs.readFileSync(file))
  }
  return hashes
}

function listFiles(root) {
  const out = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (['.git', 'node_modules'].includes(entry.name)) continue
      out.push(...listFiles(full))
    } else {
      out.push(full)
    }
  }
  return out.sort()
}

function compareHashMaps(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function digestHashMap(map) {
  return sha256(JSON.stringify(map))
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function readFirstJson(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) continue
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      return null
    }
  }
  return null
}

function findFirstFile(root, suffix) {
  return listFiles(root).find((file) => file.endsWith(suffix)) || null
}

function importReportMarkdown(result) {
  return `# BoardForge Copy Sandbox Import Report

- Status: ${result.status}
- Source: ${result.source}
- Sandbox output: ${result.sandboxOutput}
- Protected path guard: ${result.protectedPathGuard}
- Original untouched: ${result.originalUntouched}
- Copied files: ${result.copiedFiles}
- DRC/ERC scanned from copy: ${result.drcErcScannedFromCopy}
- Manifest generated: ${result.manifestGenerated}
- Shorts: ${result.validation?.shorts ?? 'n/a'}
- Unconnected: ${result.validation?.unconnected ?? 'n/a'}
- Forbidden vias: ${result.validation?.forbiddenVias ?? 'n/a'}
- DRC violations: ${result.validation?.drcViolations ?? 'n/a'}
- ERC violations: ${result.validation?.ercViolations ?? 'n/a'}
- Replay command: \`${result.replayCommand}\`
`
}
