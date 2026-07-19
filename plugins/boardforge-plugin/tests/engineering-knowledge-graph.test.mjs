import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEngineeringKnowledgeGraph, createKnowledgeRecord, measureRequirementsIntelligence } from '../lib/phase2c/engineering-knowledge-graph.mjs'
import { analyzeRequirements } from '../lib/phase2c/requirements-intelligence.mjs'

const evidence = { status: 'MANUFACTURING_ACCEPTED', sourceProtection: { unchanged: true, afterSha256: 'a'.repeat(64) }, acceptance: { accepted: true, status: 'BOARD_ACCEPTED', evidenceDigest: 'b'.repeat(64) } }

test('only source-protected manufacturing acceptance can contribute reusable engineering knowledge', () => {
  const record = createKnowledgeRecord({ boardId: '004_USB_C_PD_SINK', family: 'usb-pd-sink', evidence, knowledge: [{ id: 'connector-esd', label: 'Connector-local ESD', domain: 'Protection', tags: ['usb', 'esd'], guidance: 'Place ESD at the connector.' }] })
  const graph = buildEngineeringKnowledgeGraph({ records: [record] })
  assert.equal(graph.summary.acceptedProjectCount, 1)
  assert.equal(graph.summary.patternCount, 1)
  assert.equal(graph.nodes.find((node) => node.type === 'engineering_pattern').reusePolicy, 'proposal_only_requires_new_project_validation')
  assert.throws(() => createKnowledgeRecord({ boardId: 'bad', family: 'usb-pd-sink', evidence: { ...evidence, status: 'MANUFACTURING_REJECTED' } }))
})

test('requirements intelligence metrics report questions, confidence, acceptance, and knowledge reuse without claiming acceptance', () => {
  const plan = analyzeRequirements({ boardId: '011_USB_HUB', validation: { errors: ['usb-hub-aggregate-5v-design-current-undeclared'] } })
  const metrics = measureRequirementsIntelligence({ plans: [plan], attempts: [{ attemptNumber: 1, acceptance: evidence.acceptance, manufacturingEvidence: evidence }], knowledgeGraph: { summary: { patternCount: 3 } } })
  assert.equal(metrics.averageQuestionsPerProject, 4)
  assert.equal(metrics.firstPassAcceptanceRate, 1)
  assert.equal(metrics.reusedEngineeringKnowledge, 3)
  assert.ok(metrics.averageDecisionConfidence > 0)
})
