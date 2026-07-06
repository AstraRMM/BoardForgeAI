#!/usr/bin/env node
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { createOutlineSeed, generateOutlineKiCadProject, validateOutlineSeed } from '../lib/outline/custom-outline-workflow.mjs'

const root = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : 'C:/Users/luifi/Desktop/BoardForge_Custom_Outline_Golden_Fixtures'

const fixtures = [
  ['BF-OUTLINE-ROUNDED-RECT-01', 'rounded-rectangle'],
  ['BF-OUTLINE-MOUNTING-EARS-01', 'mounting-ears'],
  ['BF-OUTLINE-OCTAGON-01', 'octagon-chamfered'],
  ['BF-OUTLINE-L-SHAPE-01', 'l-shape'],
  ['BF-OUTLINE-U-SHAPE-01', 'u-shape'],
  ['BF-OUTLINE-NOTCHED-01', 'notched'],
  ['BF-OUTLINE-DRONE-STACK-01', 'drone-stack'],
  ['BF-OUTLINE-WEARABLE-PUCK-01', 'wearable-puck'],
  ['BF-OUTLINE-ROBOTICS-CONTROLLER-01', 'robotics-controller'],
  ['BF-OUTLINE-CRAZY-POLYGON-VALID-01', 'crazy-polygon-valid'],
  ['BF-OUTLINE-CRAZY-POLYGON-BLOCKED-SELF-INTERSECTION-01', 'crazy-polygon-self-intersection'],
  ['BF-OUTLINE-TOO-NARROW-BLOCKED-01', 'rounded-rectangle', { widthMm: 6, heightMm: 50 }],
  ['BF-OUTLINE-HOLE-EDGE-CLEARANCE-BLOCKED-01', 'rounded-rectangle', { constraints: { holeToEdgeMm: 8 } }],
]

await mkdir(root, { recursive: true })
const summary = []
for (const [id, preset, overrides = {}] of fixtures) {
  const seed = createOutlineSeed({ id, preset, ...overrides })
  if (id.includes('HOLE-EDGE')) {
    seed.holes = [{ ref: 'H_BAD', x: 1, y: 1, diameterMm: 3.2 }]
  }
  if (id.includes('TOO-NARROW')) {
    seed.outline = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 50 }, { x: 0, y: 50 }]
    seed.holes = []
    seed.components = []
  }
  const validation = validateOutlineSeed(seed)
  const projectDir = path.join(root, id)
  const result = await generateOutlineKiCadProject({ seed, validation, projectDir })
  summary.push({ id, preset, status: validation.status, generated: result.status, projectDir })
}
const summaryFile = path.join(root, 'BoardForge_Custom_Outline_Golden_Fixture_Summary.json')
await writeFile(summaryFile, JSON.stringify({ schema: 'boardforge.custom-outline-fixtures.v1', root, fixtures: summary }, null, 2), 'utf8')
console.log(JSON.stringify({ status: 'BOARD_FORGE_CUSTOM_OUTLINE_FIXTURES_WRITTEN', root, summaryFile, fixtures: summary.length }, null, 2))
