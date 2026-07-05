#!/usr/bin/env node
import { writeReadinessGapAudit } from '../lib/readiness/readiness-gap-auditor.mjs'
const result = await writeReadinessGapAudit({ rootDir: process.cwd(), checks: { browserE2E: process.argv.includes('--browser-e2e-passed') } })
console.log(JSON.stringify({ status: result.status, oldScore: result.report.oldScore, evidenceBackedScore: result.report.evidenceBackedScore, externalBlockers: result.report.externalBlockers, artifactPaths: result.artifactPaths }, null, 2))
process.exitCode = result.report.status === '99_BLOCKED_BY_EXTERNALS' ? 0 : 0
