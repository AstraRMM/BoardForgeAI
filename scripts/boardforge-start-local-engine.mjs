#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const child = spawn('npm', ['run', 'boardforge:local-server'], { shell: true, detached: true, stdio: 'ignore' })
child.unref()
await writeFile('BoardForge_Local_Engine_Launcher_Log.md', `# BoardForge Local Engine Launcher\n\nStarted local engine process ${child.pid}.\n\nPairing code: run \\`npm run boardforge:local-health\\` and open setup in the live website.\n`)
console.log(JSON.stringify({ status: 'BOARD_FORGE_LOCAL_ENGINE_START_REQUESTED', pid: child.pid }, null, 2))
