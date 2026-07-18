import test from 'node:test'
import assert from 'node:assert/strict'
import { manifest } from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { createTrainingDesignIntent, validateTrainingDesignIntent } from '../lib/phase2c/training-design-intent.mjs'

test('every benchmark board receives a complete autonomous Design Intent Package without a customer question', () => {
  for (const board of manifest.boards) {
    const intent = createTrainingDesignIntent({ board })
    const validation = validateTrainingDesignIntent(intent)
    assert.equal(validation.ok, true, `${board.id}: ${validation.errors.join(', ')}`)
    assert.equal(intent.mode, 'autonomous_training_benchmark')
    assert.equal(intent.generatedRequirementsPolicy, 'conservative-autonomous-no-customer-question')
  }
})

test('PoE training intent deliberately selects a bounded safe benchmark envelope and preserves independent validation', () => {
  const board = manifest.boards.find((candidate) => candidate.id === '009_POE_SENSOR')
  const intent = createTrainingDesignIntent({ board })
  assert.match(intent.decisions.find((item) => item.id === 'input_voltage_range').decision, /802\.3af/)
  assert.ok(intent.requiredEvidence.includes('erc-zero'))
  assert.match(intent.status, /REQUIRES_ENGINEERING_IMPLEMENTATION_AND_VALIDATION/)
})
