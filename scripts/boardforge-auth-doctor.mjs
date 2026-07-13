#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

loadLocalEnv('.env.local')

const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL']
const configured = Object.fromEntries(required.map((key) => [key, Boolean(process.env[key])]))
const report = { status: 'BOARD_FORGE_AUTH_DOCTOR_COMPLETED', configured, database: { reachable: false, authTables: false, boardforgeTables: false }, endpoints: { localEngine: 'not_checked', pairing: 'not_checked' }, nextAction: null }

if (configured.DATABASE_URL) {
  try {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
    await pool.query('SELECT 1')
    report.database.reachable = true
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    const names = new Set(tables.rows.map((row) => row.tablename))
    report.database.authTables = ['user', 'session', 'account', 'verification'].every((name) => names.has(name))
    report.database.boardforgeTables = ['boardforge_devices', 'boardforge_pairing_codes', 'boardforge_audit_logs'].every((name) => names.has(name))
    await pool.end()
  } catch (error) { report.database.error = safeError(error) }
}

const localUrl = process.env.BOARDFORGE_LOCAL_ENGINE_URL || 'http://127.0.0.1:47321'
report.endpoints.localEngine = await reach(`${localUrl}/auth/status`)
if (configured.BETTER_AUTH_URL) report.endpoints.pairing = await reach(`${process.env.BETTER_AUTH_URL.replace(/\/$/, '')}/api/auth/plugin/pairing/claim`)
report.nextAction = !required.every((key) => configured[key]) ? 'Configure the missing Vercel environment variables.' : !report.database.reachable ? 'Make DATABASE_URL reachable from this environment.' : !report.database.authTables ? 'Run npm run boardforge:auth-migrate -- --apply.' : 'Auth database is reachable; sign in and pair a test device.'

await mkdir('tmp/auth', { recursive: true })
await writeFile('tmp/auth/BoardForge_Auth_Doctor_Report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))

async function reach(url) { try { const response = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: 'manual' }); return { reachable: true, statusCode: response.status } } catch { return { reachable: false } } }
function safeError(error) { return error instanceof Error ? error.message.replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1[REDACTED]') : 'Unknown database error' }
function loadLocalEnv(file) { const result = spawnSync(process.execPath, ['-e', `const fs=require('fs');if(fs.existsSync(process.argv[1]))process.stdout.write(fs.readFileSync(process.argv[1],'utf8'))`, file], { encoding: 'utf8' }); for (const line of (result.stdout || '').split(/\r?\n/)) { const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '') } }
