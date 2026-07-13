#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'

const baseUrl = (process.env.BOARDFORGE_AUTH_SMOKE_URL || process.env.BETTER_AUTH_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const authConfigured = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL)
const checks = []
for (const [name, path, expected, method] of [['login', '/login', [200], 'GET'], ['signup', '/signup', [200], 'GET'], ['pairing endpoint', '/api/auth/plugin/pairing/claim', [400, 503], 'POST'], ['status endpoint', '/api/auth/plugin/status', [401, 503], 'GET']]) checks.push(await check(name, path, expected, method))
const dashboard = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => null)
checks.push({ name: 'dashboard guard', passed: Boolean(dashboard && (authConfigured ? [307, 308].includes(dashboard.status) : dashboard.status === 200)), statusCode: dashboard?.status ?? null, expected: authConfigured ? 'redirect to login' : 'setup gate remains available' })
const report = { status: checks.every((check) => check.passed) ? 'BOARD_FORGE_AUTH_SMOKE_PASSED' : 'BOARD_FORGE_AUTH_SMOKE_BLOCKED', baseUrl, authConfigured, checks, limitation: 'This test proves public routes and honest auth setup behavior. Authenticated account and pairing verification requires a configured database plus a test account.' }
await (await import('node:fs/promises')).mkdir('tmp/auth', { recursive: true })
await writeFile('tmp/auth/BoardForge_Auth_Smoke_Report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (!checks.every((check) => check.passed)) process.exitCode = 1
async function check(name, path, expected, method) { try { const response = await fetch(`${baseUrl}${path}`, { method, redirect: 'manual', headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined, body: method === 'POST' ? '{}' : undefined, signal: AbortSignal.timeout(5000) }); return { name, statusCode: response.status, passed: expected.includes(response.status) } } catch { return { name, statusCode: null, passed: false } } }
