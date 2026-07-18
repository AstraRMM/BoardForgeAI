import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeRequirements, recordRequirementAnswers } from '../lib/phase2c/requirements-intelligence.mjs'

test('Board005 asks only the USB-PD decisions that cannot be safely inferred', () => {
  const plan = analyzeRequirements({ boardId: '005_USB_C_PD_SOURCE', validation: { errors: ['PD_SOURCE_EEPROM_CONFIGURATION_PROOF_MISSING'] } })
  assert.equal(plan.status, 'REQUIREMENTS_INPUT_REQUIRED')
  assert.deepEqual(plan.questions.slice(0, 4).map((question) => question.id), ['pd_role', 'pdo_profile', 'vbus_current_limit_a', 'dead_battery_behavior'])
  assert.ok(plan.questions.every((question) => question.bucket === 'must_ask_user'))
  assert.ok(plan.safeInferences.some((item) => item.id === 'lifecycle_preference'))
  assert.equal(plan.requirementsGraph.schema, 'boardforge.phase2c.requirements-graph.v1')
  assert.equal(plan.requirementsGraph.autoProceedConfidence, 0.95)
  assert.equal(plan.requirementsGraph.nodes.find((node) => node.id === 'lifecycle_preference').autoProceed, true)
  assert.equal(plan.requirementsGraph.nodes.find((node) => node.id === 'pd_role').parentId, 'domain:USB-PD policy')
  assert.deepEqual(plan.questionBatches.map((batch) => batch.domain), ['USB-PD policy', 'Power'])
})

test('Board011 records answers as reusable constraints but never declares the proposal accepted', () => {
  const plan = analyzeRequirements({ boardId: '011_USB_HUB', validation: { errors: ['usb-hub-aggregate-5v-design-current-undeclared', 'usb-hub-exact-assets-unapproved'] } })
  const constraints = recordRequirementAnswers({ plan, answers: {
    five_v_input_source: 'regulated 12 V DC input', simultaneous_downstream_current_a: '3.0', fault_retry_policy: 'latch off', ambient_and_enclosure: '50 C sealed enclosure',
  } })
  assert.equal(constraints.schema, 'boardforge.phase2c.requirements-constraints.v1')
  assert.equal(constraints.status, 'REQUIREMENTS_INPUT_REQUIRED')
  assert.equal(constraints.constraints.five_v_input_source, 'regulated 12 V DC input')
  assert.ok(constraints.plan.questions.some((question) => question.id === 'resolve_usb-hub-exact-assets-unapproved'))
})
