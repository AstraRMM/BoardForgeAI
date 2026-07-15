import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const DEFAULT_LIMIT = 1024 * 1024

export function findKiCadCli({ env = process.env, platform = process.platform } = {}) {
  const candidates = [
    env.KICAD_CLI,
    ...(platform === 'win32' ? [
      'C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe',
      'C:\\Program Files\\KiCad\\10\\bin\\kicad-cli.exe',
      'C:\\Program Files\\KiCad\\9.0\\bin\\kicad-cli.exe',
      'C:\\Program Files\\KiCad\\8.0\\bin\\kicad-cli.exe',
    ] : []),
    'kicad-cli',
  ].filter(Boolean)
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 5000, windowsHide: true })
    if (!probe.error && probe.status === 0) return { available: true, command: candidate, version: `${probe.stdout || probe.stderr}`.trim(), candidates }
  }
  return { available: false, command: null, version: null, candidates }
}

export function validationArgs(file, outputFile) {
  if (file.endsWith('.kicad_sch')) return ['sch', 'erc', '--exit-code-violations', '--output', outputFile, file]
  if (file.endsWith('.kicad_pcb')) return ['pcb', 'drc', '--exit-code-violations', '--output', outputFile, file]
  return null
}

export async function runBounded(command, args, { cwd, timeoutMs = 15_000, outputLimit = DEFAULT_LIMIT, env = process.env } = {}) {
  const started = performance.now()
  return await new Promise((resolve) => {
    let stdout = ''; let stderr = ''; let timedOut = false; let settled = false; let cleanup
    const child = spawn(command, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
    const append = (current, chunk) => `${current}${chunk}`.slice(-outputLimit)
    child.stdout?.on('data', chunk => { stdout = append(stdout, chunk) })
    child.stderr?.on('data', chunk => { stderr = append(stderr, chunk) })
    const timer = setTimeout(() => {
      timedOut = true
      cleanup = killProcessTree(child.pid)
    }, timeoutMs)
    const finish = (exitCode, signal, spawnError = null) => {
      if (settled) return
      settled = true; clearTimeout(timer)
      resolve({
        command, args, pid: child.pid ?? null, exitCode, signal, timedOut, spawnError: spawnError?.message ?? null,
        stdout, stderr, cleanup: cleanup ?? { attempted: false, method: null, status: null, error: null },
        durationMs: +(performance.now() - started).toFixed(3),
        status: spawnError ? 'SPAWN_ERROR' : timedOut ? 'TIMEOUT_CLEANED' : exitCode === 0 ? 'PASSED' : 'VALIDATION_FAILED',
      })
    }
    child.on('error', error => finish(null, null, error))
    child.on('close', (code, signal) => finish(code, signal))
  })
}

export function killProcessTree(pid, platform = process.platform) {
  if (!pid) return { attempted: false, method: null, status: null, error: 'missing pid' }
  try {
    if (platform === 'win32') {
      const killed = spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
      return { attempted: true, method: 'taskkill /t /f', status: killed.status, error: killed.error?.message ?? null, stdout: killed.stdout?.trim() ?? '', stderr: killed.stderr?.trim() ?? '' }
    }
    try { process.kill(-pid, 'SIGKILL') } catch { process.kill(pid, 'SIGKILL') }
    return { attempted: true, method: 'SIGKILL process group', status: 0, error: null }
  } catch (error) {
    return { attempted: true, method: platform === 'win32' ? 'taskkill /t /f' : 'SIGKILL process group', status: null, error: error.message }
  }
}

export async function validateFile({ cli, file, reportFile, timeoutMs = 15_000 }) {
  const args = validationArgs(file, reportFile)
  if (!args) return { file, status: 'UNSUPPORTED_FILE', syntax: null }
  const result = await runBounded(cli, args, { cwd: path.dirname(file), timeoutMs })
  return { file, reportFile, syntax: [cli, ...args], ...result, status: classifyValidation(result) }
}

export function classifyValidation(result) {
  if (result.status !== 'VALIDATION_FAILED') return result.status
  const output = `${result.stdout}\n${result.stderr}`
  if (/failed to load|parse error|invalid (?:board|schematic|token|syntax)/i.test(output)) return 'SYNTAX_OR_LOAD_ERROR'
  if (/found\s+\d+\s+(?:violations?|unconnected items?)/i.test(output)) return 'VIOLATIONS_FOUND'
  return 'VALIDATION_FAILED'
}

export async function writeValidationReport(outputRoot, report) {
  await mkdir(outputRoot, { recursive: true })
  const json = path.join(outputRoot, 'BoardForge_M3_KiCad_CLI_Validation_Report.json')
  const md = path.join(outputRoot, 'BoardForge_M3_KiCad_CLI_Validation_Report.md')
  await writeFile(json, `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(md, renderMarkdown(report))
  return { json, md }
}

function renderMarkdown(report) {
  return `# BoardForge M3 KiCad CLI validation\n\n- Status: ${report.status}\n- CLI: ${report.cli.available ? `${report.cli.command} (${report.cli.version})` : 'unavailable'}\n- Timeout: ${report.timeoutMs} ms per file\n- Passed: ${report.summary.passed}\n- ERC/DRC violations: ${report.summary.violations ?? 0}\n- Syntax/load errors: ${report.summary.syntaxOrLoadErrors ?? 0}\n- Other validation failures: ${report.summary.failed - (report.summary.violations ?? 0) - (report.summary.syntaxOrLoadErrors ?? 0)}\n- Timed out and cleaned: ${report.summary.timedOut}\n- Skipped: ${report.summary.skipped}\n\n## Stall finding\n\n${report.stallFinding}\n\n## Commands\n\n${report.results.map(item => `- ${path.basename(item.file)}: ${item.status}; exit=${item.exitCode ?? 'none'}; duration=${item.durationMs ?? 0} ms; syntax=\`${(item.syntax || []).join(' ')}\``).join('\n')}\n`
}
