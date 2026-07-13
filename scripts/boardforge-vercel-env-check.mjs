#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

loadLocalEnv('.env.local')
const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'BETTER_AUTH_API_KEY', 'BOARDFORGE_AUTH_ORIGIN', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BOARDFORGE_APP_URL']
console.log(JSON.stringify({ status: 'BOARD_FORGE_VERCEL_AUTH_ENV_CHECK_COMPLETED', configured: Object.fromEntries(required.map((key) => [key, Boolean(process.env[key])])), valuesRedacted: true }, null, 2))
function loadLocalEnv(file) { const result = spawnSync(process.execPath, ['-e', `const fs=require('fs');if(fs.existsSync(process.argv[1]))process.stdout.write(fs.readFileSync(process.argv[1],'utf8'))`, file], { encoding: 'utf8' }); for (const line of (result.stdout || '').split(/\r?\n/)) { const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '') } }
