#!/usr/bin/env node
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.BOARDFORGE_LOCAL_ENGINE_PORT || 38991)
const baseUrl = `http://127.0.0.1:${port}`
const pidFile = path.resolve('.boardforge/local-engine.pid')
const reportPath = path.resolve('BoardForge_Local_Engine_Stop_Report.md')

let pid = null
try {
  pid = Number((await readFile(pidFile, 'utf8')).trim())
} catch {}

let killed = false
let message = 'No managed BoardForge local engine PID file was found.'
if (pid && Number.isFinite(pid)) {
  try {
    process.kill(pid)
    killed = true
    message = `Stopped managed BoardForge local engine process ${pid}.`
    await rm(pidFile, { force: true })
  } catch (error) {
    message = `Could not stop process ${pid}: ${error.message}. If it is still running, close that process manually.`
  }
}

const stillRunning = await health()
const status = killed && !stillRunning.ok ? 'BOARD_FORGE_LOCAL_ENGINE_STOPPED' : stillRunning.ok ? 'BOARD_FORGE_LOCAL_ENGINE_STILL_RUNNING' : 'BOARD_FORGE_LOCAL_ENGINE_NOT_RUNNING'
await writeFile(reportPath, [
  '# BoardForge Local Engine Stop Report',
  '',
  `- Status: ${status}`,
  `- PID: ${pid || 'unknown'}`,
  `- URL: ${baseUrl}`,
  `- Message: ${message}`,
  '',
].join('\n'), 'utf8')

console.log(JSON.stringify({ status, pid, baseUrl, message }, null, 2))
process.exit(status === 'BOARD_FORGE_LOCAL_ENGINE_STILL_RUNNING' ? 1 : 0)

async function health() {
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(800) })
    return { ok: response.ok }
  } catch {
    return { ok: false }
  }
}
