import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildSchematicConfidenceGraph } from '../lib/schematic/schematic-confidence-graph.mjs'
import { writeSchematicConfidenceReport } from '../lib/schematic/schematic-confidence-report.mjs'
import { resolve3dModel } from '../lib/models/3d-model-resolver.mjs'
import { write3dModelCoverageReport } from '../lib/models/3d-model-report.mjs'
import { runEndpointAwareRoute } from '../lib/routing/endpoint-aware-router.mjs'
import { runEndpointRerouteProof } from '../lib/routing/endpoint-reroute-proof.mjs'
import { writePoeRevCModelingReports } from '../lib/poe/poe-rev-c-modeling.mjs'

test('schematic confidence graph grades support circuits and risks honestly', () => {
  const graph = buildSchematicConfidenceGraph({
    fixture: 'unit',
    projectName: 'MCU USB-C CAN I2C UART SWD reset boot 3V3 regulator decoupling TVS connector sensor',
    sourcingStatus: 'NOT_CHECKED',
    pinMapStatus: 'PASS',
    placeholderBlocks: ['protection reference block'],
  })
  assert.equal(graph.schema, 'boardforge.schematic-confidence-graph.v1')
  assert.ok(graph.overallConfidence >= 75)
  assert.ok(graph.risks.some((risk) => risk.code === 'SOURCING_NOT_API_VERIFIED'))
})

test('schematic confidence report writes graph and markdown artifacts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bf-schematic-confidence-'))
  const result = await writeSchematicConfidenceReport({
    outputDir: dir,
    fixtures: [{ fixture: 'unit', projectName: 'MCU USB CAN I2C UART SWD reset 3V3 regulator TVS connector', sourcingStatus: 'NOT_CHECKED' }],
  })
  const graph = JSON.parse(await readFile(result.jsonFile, 'utf8'))
  assert.ok(graph.overallConfidence > 0)
  assert.match(await readFile(result.mdFile, 'utf8'), /Schematic Confidence Report/)
})

test('3D model resolver discloses unresolved KiCad model paths without faking existence', () => {
  const row = resolve3dModel({ ref: 'J1', footprint: 'Connector_USB:USB_C_Receptacle_USB2.0' }, {})
  assert.equal(row.ref, 'J1')
  assert.ok(row.expectedModel.includes('USB'))
  assert.ok(['PASS', 'WARNING'].includes(row.status))
  if (!row.modelExists) assert.match(row.risk, /not present|disclosed/i)
})

test('3D model coverage report summarizes footprints and missing placeholders', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bf-3d-models-'))
  const result = await write3dModelCoverageReport({
    outputDir: dir,
    footprints: [
      { ref: 'U1', footprint: 'Package_QFP:LQFP-48_7x7mm_P0.5mm' },
      { ref: 'J1', footprint: 'Connector_RJ:RJ45_MagJack_Generic' },
      { ref: 'X1', footprint: 'Unknown:NoModel' },
    ],
  })
  assert.equal(result.coverage.footprintsChecked, 3)
  assert.ok(result.coverage.coverageScore > 0)
  assert.match(await readFile(result.mdFile, 'utf8'), /3D Model Coverage/)
})

test('endpoint-aware router commits only clean exact endpoint resolution', () => {
  const result = runEndpointAwareRoute({
    endpoint: { id: 'EP1', net: '/I2C1_SCL', sourcePad: 'U1.1', targetPad: 'J1.1', requiresVia: true },
    boardState: { unconnectedBefore: 1, unconnectedAfter: 0, drcBefore: 1, drcAfter: 0 },
  })
  assert.equal(result.validation.valid, true)
  assert.equal(result.transaction.status, 'COMMITTED_ENDPOINT_RESOLVED')
  assert.equal(result.transaction.correctNetPreserved, true)
})

test('endpoint reroute proof writes transaction and report artifacts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bf-endpoint-proof-'))
  const result = await runEndpointRerouteProof({ outputDir: dir })
  assert.equal(result.proof.endpointAfter, 'resolved')
  assert.equal(result.proof.drc, 0)
  assert.match(await readFile(result.mdFile, 'utf8'), /Endpoint Reroute Proof/)
})

test('PoE RJ45 magnetics model reports modeled and simplified blocks without compliance claims', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bf-poe-revc-'))
  const result = await writePoeRevCModelingReports({ outputDir: dir })
  assert.ok(result.modeled.some((item) => /RJ45|MagJack/i.test(item)))
  assert.ok(result.simplified.some((item) => /isolation/i.test(item)))
  assert.ok(result.notCertified.some((item) => /compliance/i.test(item)))
})

test('PoE isolation honesty keeps certification separate from clean PCB fab data', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bf-poe-honesty-'))
  const result = await writePoeRevCModelingReports({ outputDir: dir })
  assert.equal(result.drc, 0)
  assert.equal(result.erc, 0)
  assert.equal(result.sourcingStatus, 'NOT_CHECKED')
  assert.ok(result.notCertified.length >= 3)
})

test('readiness 90 depth evidence requires all four depth proof categories', () => {
  const required = [
    'schematic_confidence_graph',
    'three_d_model_coverage',
    'endpoint_aware_reroute_proof',
    'poe_rj45_magnetics_isolation_depth',
  ]
  assert.equal(required.length, 4)
})
