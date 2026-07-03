#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const report = {
  status: 'BOARD_FORGE_DEV_LAUNCHER_READY',
  liveWebsite: 'Connect the live BoardForge website to this installed local engine bridge.',
  localEngineCommand: 'npm run boardforge:local-server',
  webDevCommand: 'npm run dev:web',
  privacy: 'Project files remain local unless user explicitly approves publish/sync.',
}

if (process.argv.includes('--start-engine')) {
  const child = spawn('npm', ['run', 'boardforge:local-server'], { stdio: 'inherit', shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  await writeFile('BoardForge_Dev_Launcher_Report.md', render(report), 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

function render(report) {
  return `# BoardForge Dev Launcher

- Status: ${report.status}
- Live website: ${report.liveWebsite}
- Local engine: ${report.localEngineCommand}
- Web dev: ${report.webDevCommand}
- Privacy: ${report.privacy}
`
}
