#!/usr/bin/env node
import path from 'node:path'
import { buildMinimumDesignRelaxationOptions, writeMinimumDesignRelaxationReport } from '../lib/routing/minimum-design-relaxation-report.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const remainingUnconnected = Number(arg('remaining-unconnected', 0))
const report = {
  boardPath: board,
  options: buildMinimumDesignRelaxationOptions([], { remainingUnconnected }),
}
await writeMinimumDesignRelaxationReport(report, {
  jsonPath: path.join(outDir, 'boardforge-minimum-design-relaxation-report.json'),
  markdownPath: path.join(outDir, 'BoardForge_Minimum_Design_Relaxation_Report.md'),
})
console.log(JSON.stringify(report, null, 2))
