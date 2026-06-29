#!/usr/bin/env node
import path from 'node:path'
import { writeProjectDashboardData } from '../lib/platform/project-dashboard-data.mjs'

function valuesAfter(name) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1])
  }
  return values
}

function valueAfter(name, fallback = null) {
  const values = valuesAfter(name)
  return values.length ? values.at(-1) : fallback
}

const manifestPaths = valuesAfter('--manifest').map((file) => path.resolve(file))
const outputPath = path.resolve(valueAfter('--output', 'boardforge-dashboard-data.json'))

if (!manifestPaths.length) {
  console.error('Usage: boardforge-dashboard-data --manifest <boardforge-project-manifest.json> [--manifest <...>] --output <dashboard.json>')
  process.exit(2)
}

const { dashboard } = await writeProjectDashboardData({ manifestPaths, outputPath })
console.log(JSON.stringify({
  status: 'BOARD_FORGE_DASHBOARD_DATA_WRITTEN',
  outputPath,
  totalProjects: dashboard.summary.totalProjects,
  manufacturingReady: dashboard.summary.manufacturingReady,
  blocked: dashboard.summary.blocked,
}, null, 2))
