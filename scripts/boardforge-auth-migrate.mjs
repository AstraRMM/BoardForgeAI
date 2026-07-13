#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

loadLocalEnv('.env.local')
const command = 'npx auth@latest migrate --config ./apps/web/src/lib/auth.ts'
if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  console.log(JSON.stringify({ status: 'AUTH_MIGRATION_BLOCKED', reason: 'DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL must be present.', command }, null, 2))
  process.exitCode = 2
} else if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ status: 'AUTH_MIGRATION_READY', command, apply: 'npm run boardforge:auth-migrate -- --apply' }, null, 2))
} else {
  const result = spawnSync('npx', ['auth@latest', 'migrate', '--config', './apps/web/src/lib/auth.ts'], { stdio: 'inherit', shell: process.platform === 'win32' })
  process.exitCode = result.status ?? 1
}

function loadLocalEnv(file) {
  const result = spawnSync(process.execPath, ['-e', `const fs=require('fs');if(fs.existsSync(process.argv[1]))process.stdout.write(fs.readFileSync(process.argv[1],'utf8'))`, file], { encoding: 'utf8' })
  for (const line of (result.stdout || '').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}
