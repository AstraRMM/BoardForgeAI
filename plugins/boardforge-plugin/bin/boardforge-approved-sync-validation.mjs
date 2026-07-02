#!/usr/bin/env node
import path from 'node:path'
import { runApprovedSyncValidation } from '../lib/platform/approved-sync-validation.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

const outputDir = path.resolve(argValue('--output', process.cwd()))
const result = await runApprovedSyncValidation({ outputDir })
console.log(JSON.stringify({ status: 'BOARD_FORGE_APPROVED_SYNC_VALIDATED', ...result }, null, 2))
