#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { runRegionalRipupReroute } from '../lib/routing/regional-ripup-reroute.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const clusterPath = arg('cluster')
const cluster = clusterPath && fs.existsSync(clusterPath) ? JSON.parse(fs.readFileSync(clusterPath, 'utf8')).hardestRegion || JSON.parse(fs.readFileSync(clusterPath, 'utf8')) : {}
const result = runRegionalRipupReroute(board, cluster)
fs.writeFileSync(path.join(outDir, 'boardforge-regional-reroute-plan.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
