import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const contractDir = path.join(repoRoot, 'contracts', 'local-engine', 'v1')

test('phase 2b frozen localhost contract is unique and represented by Node routers', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(contractDir, 'routes.json'), 'utf8'))
  assert.equal(manifest.contractVersion, '1.0.0')
  assert.equal(new Set(manifest.routes).size, manifest.routes.length)
  assert.ok(manifest.routes.length >= 60)
  const source = [
    'routes.mjs', 'job-routes.mjs', 'pairing-routes.mjs',
  ].map((name) => fs.readFileSync(path.join(repoRoot, 'plugins', 'boardforge-plugin', 'lib', 'platform', 'local-server', name), 'utf8')).join('\n')
  for (const route of manifest.routes) {
    const routePath = route.slice(route.indexOf(' ') + 1)
    const stableFragment = routePath.replaceAll(':id', '').replace(/\/$/, '')
    for (const segment of stableFragment.split('/').filter(Boolean)) assert.ok(source.includes(segment), `${route} is absent from router sources`)
  }
})

test('phase 2b typed envelope fixtures satisfy the frozen JSON schema invariants', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(contractDir, 'fixtures.json'), 'utf8'))
  const schema = JSON.parse(fs.readFileSync(path.join(contractDir, 'contract.schema.json'), 'utf8'))
  assert.equal(fixtures.contractVersion, schema.properties.contractVersion.const)
  const keys = ['ok', 'status', 'data', 'errors', 'warnings', 'artifactPaths']
  for (const item of fixtures.cases) {
    assert.match(item.request.path, /^\//)
    assert.ok(['GET', 'POST'].includes(item.request.method))
    assert.deepEqual(Object.keys(item.response).sort(), [...keys].sort())
    assert.match(item.response.status, /^BOARD_FORGE_/)
    assert.equal(item.response.ok, item.response.errors.length === 0)
  }
})

test('initial KiCad round-trip fixture is complete and structurally balanced', () => {
  const fixtureDir = path.join(repoRoot, 'fixtures', 'kicad-roundtrip', 'minimal')
  const pro = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'minimal.kicad_pro'), 'utf8'))
  assert.equal(pro.meta.filename, 'minimal.kicad_pro')
  for (const extension of ['kicad_pcb', 'kicad_sch']) {
    const text = fs.readFileSync(path.join(fixtureDir, `minimal.${extension}`), 'utf8')
    assert.match(text, new RegExp(`^\\(kicad_${extension === 'kicad_pcb' ? 'pcb' : 'sch'} `))
    let depth = 0
    for (const character of text.replace(/"(?:\\.|[^"\\])*"/g, '')) {
      if (character === '(') depth += 1
      if (character === ')') depth -= 1
      assert.ok(depth >= 0, `${extension} closes an unopened expression`)
    }
    assert.equal(depth, 0, `${extension} has unbalanced expressions`)
  }
  const board = fs.readFileSync(path.join(fixtureDir, 'minimal.kicad_pcb'), 'utf8')
  const schematic = fs.readFileSync(path.join(fixtureDir, 'minimal.kicad_sch'), 'utf8')
  assert.match(board, /\(layer "Edge\.Cuts"\)/)
  assert.match(board, /BF-ROUNDTRIP/)
  assert.match(schematic, /ROUNDTRIP_NET/)
})
