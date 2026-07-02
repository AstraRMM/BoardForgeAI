#!/usr/bin/env node
import path from 'node:path'
import { runCrazyOutlineStressSuite } from '../lib/outline/crazy-outline-stress-suite.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

const rootDir = path.resolve(argValue('--root', 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-CRAZY-OUTLINE-STRESS'))
const summary = await runCrazyOutlineStressSuite({ rootDir })
console.log(JSON.stringify({ status: 'BOARD_FORGE_CRAZY_OUTLINE_STRESS_COMPLETED', summary }, null, 2))
