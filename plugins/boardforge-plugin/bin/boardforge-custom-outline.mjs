#!/usr/bin/env node
import path from 'node:path'
import { generateOutlineKiCadProject, createOutlineSeed, validateOutlineSeed } from '../lib/outline/custom-outline-workflow.mjs'

const args = parseArgs(process.argv.slice(2))
const preset = args.preset || 'rounded-rectangle'
const projectDir = args['project-dir'] || path.join(process.cwd(), 'BoardForge_Custom_Outline_Project')
const seed = createOutlineSeed({
  id: args.id,
  preset,
  widthMm: numberArg(args['width-mm']),
  heightMm: numberArg(args['height-mm']),
  density: args.density || 'compact',
})
const validation = validateOutlineSeed(seed)
const result = await generateOutlineKiCadProject({
  seed,
  validation,
  projectDir,
  layerCount: Number(args.layers || 2),
  devOverride: args['dev-override'] === 'true',
})

console.log(JSON.stringify({
  status: result.status,
  projectDir,
  outlineStatus: result.validation.status,
  routeabilityScore: result.validation.routeability.score,
  manufacturingRisk: result.validation.manufacturingRisk,
  artifacts: result.artifactPaths,
}, null, 2))

function parseArgs(values) {
  const parsed = {}
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = values[i + 1]
    if (!next || next.startsWith('--')) parsed[key] = 'true'
    else {
      parsed[key] = next
      i += 1
    }
  }
  return parsed
}

function numberArg(value) {
  if (value === undefined) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
