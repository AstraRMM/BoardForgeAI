#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { analyzeRouteability } from '../lib/routing/routeability-optimizer.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const drcPath = arg('drc')
const drcReport = drcPath && fs.existsSync(drcPath) ? JSON.parse(fs.readFileSync(drcPath, 'utf8')) : {}
const result = analyzeRouteability(board, { drcReport })
fs.writeFileSync(path.join(outDir, 'boardforge-routeability-analysis.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
