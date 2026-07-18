import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { executeJob } from '../lib/jobs.mjs'

test('production requirements job asks Board011 only for unresolved engineering decisions', async () => {
  const output = await executeJob({
    id: 'board011-questions',
    type: 'analyze_production_requirements',
    input: { boardId: '011_USB_HUB', blockerCodes: ['usb-hub-aggregate-5v-design-current-undeclared', 'usb-hub-exact-assets-unapproved'] },
  }, process.cwd())
  assert.equal(output.status, 'REQUIREMENTS_INPUT_REQUIRED')
  assert.equal(output.questions[0].id, 'five_v_input_source')
  assert.ok(output.questions.some((question) => question.id === 'resolve_usb-hub-exact-assets-unapproved'))
})

test('recorded production requirements stay outside the KiCad delivery folder', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'boardforge-requirements-'))
  const output = await executeJob({
    id: 'board005-record-answers',
    type: 'record_production_requirements',
    input: {
      boardId: 'USB_C_PD_SOURCE',
      blockerCodes: ['PD_SOURCE_EEPROM_CONFIGURATION_PROOF_MISSING'],
      answers: { pd_role: 'source', pdo_profile: '5 V / 3 A', vbus_current_limit_a: '3', dead_battery_behavior: 'not required' },
    },
  }, workspace)
  assert.equal(output.status, 'REQUIREMENTS_READY_FOR_REVALIDATION')
  assert.match(output.generatedFiles[0], /\\\.boardforge\\requirements\\005_usb_c_pd_source\.json$/i)
  const persisted = JSON.parse(await readFile(output.generatedFiles[0], 'utf8'))
  assert.equal(persisted.constraints.pd_role, 'source')
})
