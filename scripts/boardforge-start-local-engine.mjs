#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.BOARDFORGE_LOCAL_ENGINE_PORT || 38991)
const baseUrl = `http://127.0.0.1:${port}`
const stateDir = path.resolve('.boardforge')
const pidFile = path.join(stateDir, 'local-engine.pid')
const logFile = path.resolve('BoardForge_Local_Engine_Launcher_Log.md')

await mkdir(stateDir, { recursive: true })

const running = await health()
if (running.ok) {
  await writeLauncherLog({ status: 'BOARD_FORGE_LOCAL_ENGINE_ALREADY_RUNNING', pid: null, baseUrl, health: running.body })
  console.log(JSON.stringify({ status: 'BOARD_FORGE_LOCAL_ENGINE_ALREADY_RUNNING', baseUrl, health: running.body }, null, 2))
  process.exit(0)
}

const serverScript = path.resolve('plugins/boardforge-plugin/bin/boardforge-local-server.mjs')
const child = spawn(process.execPath, [serverScript, '--port', String(port)], {
  cwd: process.cwd(),
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
})
child.unref()
await writeFile(pidFile, String(child.pid), 'utf8')

const started = await waitForHealth(10000)
const status = started.ok ? 'BOARD_FORGE_LOCAL_ENGINE_STARTED' : 'BOARD_FORGE_LOCAL_ENGINE_START_REQUESTED_HEALTH_PENDING'
await writeLauncherLog({ status, pid: child.pid, baseUrl, health: started.body || null })
console.log(JSON.stringify({ status, pid: child.pid, baseUrl, pidFile, health: started.body || null }, null, 2))
process.exit(started.ok ? 0 : 1)

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await health()
    if (result.ok) return result
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return { ok: false, body: null }
}

async function health() {
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) })
    return { ok: response.ok, body: await response.json().catch(() => null) }
  } catch {
    return { ok: false, body: null }
  }
}

async function writeLauncherLog({ status, pid, baseUrl, health }) {
  await writeFile(logFile, [
    '# BoardForge Local Engine Launcher',
    '',
    `- Status: ${status}`,
    `- PID: ${pid || 'already-running-or-unknown'}`,
    `- URL: ${baseUrl}`,
    `- Health: ${health ? 'online' : 'not confirmed'}`,
    '',
    'Pairing: run `npm run boardforge:local-health` and open setup in the live website.',
    'Stop: run `npm run boardforge:stop`.',
    '',
  ].join('\n'), 'utf8')
}
