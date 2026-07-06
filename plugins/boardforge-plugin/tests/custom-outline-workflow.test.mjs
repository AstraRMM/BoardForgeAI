import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createLocalServerRouter } from '../lib/platform/local-server/routes.mjs'
import { createOutlineSeed, generateOutlineKiCadProject, outlinePresetsResponse, validateOutlineSeed } from '../lib/outline/custom-outline-workflow.mjs'

test('custom outline presets cover flagship shape families', () => {
  const presets = outlinePresetsResponse().presets.map((preset) => preset.id)
  for (const id of ['rounded-rectangle', 'mounting-ears', 'octagon-chamfered', 'l-shape', 'u-shape', 'notched', 'drone-stack', 'wearable-puck', 'robotics-controller', 'crazy-polygon-valid', 'decorative-shield']) {
    assert.ok(presets.includes(id), `missing ${id}`)
  }
})

test('custom outline validation blocks self-intersecting sketches', () => {
  const seed = createOutlineSeed({ preset: 'crazy-polygon-self-intersection' })
  const validation = validateOutlineSeed(seed)
  assert.equal(validation.status, 'BLOCKED_SELF_INTERSECTION')
  assert.equal(validation.valid, false)
})

test('custom outline validation blocks hole edge clearance violations', () => {
  const seed = createOutlineSeed({ preset: 'rounded-rectangle' })
  seed.holes = [{ ref: 'H_BAD', x: 1, y: 1, diameterMm: 3.2 }]
  const validation = validateOutlineSeed(seed)
  assert.equal(validation.status, 'BLOCKED_HOLE_EDGE_CLEARANCE')
})

test('custom outline KiCad generation writes real outline artifacts only when valid', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-outline-valid-'))
  const seed = createOutlineSeed({ id: 'BF-OUTLINE-TEST-VALID-01', preset: 'mounting-ears' })
  const result = await generateOutlineKiCadProject({ seed, projectDir })
  assert.equal(result.status, 'OUTLINE_KICAD_PROJECT_READY')
  assert.ok(existsSync(path.join(projectDir, 'BF-OUTLINE-TEST-VALID-01.kicad_pcb')))
  assert.match(await readFile(path.join(projectDir, 'BF-OUTLINE-TEST-VALID-01.kicad_pcb'), 'utf8'), /Edge\.Cuts/)
  assert.ok(existsSync(path.join(projectDir, 'BoardForge_Project_Manifest.json')))
  await rm(projectDir, { recursive: true, force: true })
})

test('blocked custom outline does not write fake KiCad project files', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-outline-blocked-'))
  const seed = createOutlineSeed({ id: 'BF-OUTLINE-TEST-BLOCKED-01', preset: 'crazy-polygon-self-intersection' })
  const result = await generateOutlineKiCadProject({ seed, projectDir })
  assert.equal(result.status, 'OUTLINE_BLOCKED_BEFORE_KICAD')
  assert.equal(existsSync(path.join(projectDir, 'BF-OUTLINE-TEST-BLOCKED-01.kicad_pcb')), false)
  assert.ok(existsSync(path.join(projectDir, 'BoardForge_Outline_Validation_Report.md')))
  await rm(projectDir, { recursive: true, force: true })
})

test('local engine exposes custom outline routes', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-outline-server-'))
  const router = createLocalServerRouter({ rootDir })
  const presetResponse = await router({ method: 'GET', pathname: '/outline/presets' })
  assert.equal(presetResponse.ok, true)
  assert.ok(presetResponse.data.presets.length >= 10)
  const validateResponse = await router({ method: 'POST', pathname: '/outline/validate', payload: { preset: 'drone-stack' } })
  assert.equal(validateResponse.ok, true)
  assert.match(validateResponse.status, /^VALID/)
  const generateResponse = await router({ method: 'POST', pathname: '/outline/generate-kicad', payload: { preset: 'robotics-controller', id: 'BF-OUTLINE-LOCAL-ROBOT-01' } })
  assert.equal(generateResponse.ok, true)
  assert.equal(generateResponse.status, 'OUTLINE_KICAD_PROJECT_READY')
  await rm(rootDir, { recursive: true, force: true })
})
