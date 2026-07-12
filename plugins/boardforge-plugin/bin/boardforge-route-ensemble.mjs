#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { runRouterBackendManager } from '../lib/routing/router-backend-manager.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const drcPath = arg('drc')
const baselineDrc = drcPath && fs.existsSync(drcPath) ? JSON.parse(fs.readFileSync(drcPath, 'utf8')) : {}
const report = await runRouterBackendManager(board, {
  baselineDrc,
  reportJson: path.join(outDir, 'boardforge-router-ensemble-report.json'),
  reportMd: path.join(outDir, 'BoardForge_Router_Ensemble_Report.md'),
})
console.log(JSON.stringify(report, null, 2))
