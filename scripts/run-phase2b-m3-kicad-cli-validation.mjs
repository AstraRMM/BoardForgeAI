import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { findKiCadCli, validateFile, writeValidationReport } from './lib/kicad-cli-validation.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const fixtures = path.join(repo, 'fixtures/kicad-roundtrip/m3')
const outputRoot = path.join(repo, 'reports/kicad-roundtrip/m3')
const timeoutMs = Number(process.env.KICAD_CLI_TIMEOUT_MS || 15_000)
const cli = findKiCadCli()
const entries = await readdir(fixtures, { recursive: true, withFileTypes: true })
const files = entries.filter(e => e.isFile() && /\.kicad_(?:sch|pcb)$/.test(e.name)).map(e => path.resolve(e.parentPath, e.name)).sort()
const results = []
if (cli.available) {
  await mkdir(path.join(outputRoot, 'cli-output'), { recursive: true })
  for (const [index, file] of files.entries()) {
    const reportFile = path.join(outputRoot, 'cli-output', `${path.basename(file)}.${file.endsWith('.kicad_sch') ? 'erc' : 'drc'}.rpt`)
    console.error(`[KiCad CLI ${index + 1}/${files.length}] validating ${path.basename(file)}`)
    const result = await validateFile({ cli: cli.command, file, reportFile, timeoutMs })
    results.push(result)
    console.error(`[KiCad CLI ${index + 1}/${files.length}] ${result.status} in ${result.durationMs} ms`)
  }
} else {
  for (const file of files) results.push({ file, status: 'SKIPPED_CLI_UNAVAILABLE', syntax: null })
}
const summary = {
  passed: results.filter(r => r.status === 'PASSED').length,
  violations: results.filter(r => r.status === 'VIOLATIONS_FOUND').length,
  syntaxOrLoadErrors: results.filter(r => r.status === 'SYNTAX_OR_LOAD_ERROR').length,
  failed: results.filter(r => ['VALIDATION_FAILED', 'SPAWN_ERROR', 'VIOLATIONS_FOUND', 'SYNTAX_OR_LOAD_ERROR'].includes(r.status)).length,
  timedOut: results.filter(r => r.status === 'TIMEOUT_CLEANED').length,
  skipped: results.filter(r => r.status.startsWith('SKIPPED')).length,
}
const timedOut = results.filter(r => r.status === 'TIMEOUT_CLEANED')
const totalCliDurationMs = +results.reduce((sum, item) => sum + (item.durationMs || 0), 0).toFixed(3)
const maxCliDurationMs = +Math.max(0, ...results.map(item => item.durationMs || 0)).toFixed(3)
const stallFinding = timedOut.length
  ? `${timedOut.length} synthetic fixtures exceeded the bounded CLI deadline. Their process trees were forcibly cleaned. The evidence does not prove a parser deadlock; inspect captured stderr and retry each command outside BoardForge before assigning a KiCad root cause.`
  : `No bounded CLI stall reproduced. ${results.length} serial KiCad processes consumed ${totalCliDurationMs} ms (slowest ${maxCliDurationMs} ms). The apparent suite stall is consistent with serial KiCad 10 startup/validation latency plus no progress output; an internal KiCad deadlock was not reproduced.`
const report = { schema: 'boardforge.m3.kicad-cli-validation.v1', generatedAt: new Date().toISOString(), status: !cli.available ? 'CLI_UNAVAILABLE' : summary.timedOut ? 'STALL_REPRODUCED_AND_CLEANED' : summary.failed ? 'COMPLETED_WITH_VALIDATION_FAILURES' : 'PASSED', timeoutMs, cli, summary, totalCliDurationMs, maxCliDurationMs, stallFinding, results }
const paths = await writeValidationReport(outputRoot, report)
console.log(JSON.stringify({ ...report, results: undefined, paths }, null, 2))
if (process.env.REQUIRE_KICAD_CLI === '1' && (!cli.available || summary.timedOut || summary.failed)) process.exitCode = 1
