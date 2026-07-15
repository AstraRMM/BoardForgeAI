import test from 'node:test';
import assert from 'node:assert/strict';
import { manifest } from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs';
import { ACCEPTANCE_SCHEMA, LEARNING_SCHEMA, appendLearningEntry, evaluateBoardAcceptance, validateChallengeManifest, validateLearningEntry } from '../lib/challenge/phase2c-challenge.mjs';

test('50-board manifest is unique, useful, compactness-bounded, and meets custom outline quota', () => {
  const result = validateChallengeManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.customOutlineCount, 32);
  assert.equal(new Set(manifest.boards.map((board) => board.architectureClass)).size >= 20, true);
  assert.equal(manifest.boards.some((board) => /(^|_)ESC($|_)/.test(board.id)), false);
  assert.equal(manifest.boards.some((board) => /(^|_)FC($|_)/.test(board.id)), false);
});

test('acceptance rejects reports, zero DRC, and synthetic sourcing without complete proof', () => {
  const result = evaluateBoardAcceptance({
    schema: ACCEPTANCE_SCHEMA,
    validation: { ercViolations: 0, drcViolations: 0, kicadCliRan: true },
    sourcing: { digikey: { liveVerified: false }, mouser: { liveVerified: false } },
  });
  assert.equal(result.accepted, false);
  assert.match(result.failures.join('\n'), /artifact schematic lacks verified evidence/);
  assert.match(result.failures.join('\n'), /DigiKey sourcing is not live verified/);
});

test('failed attempts cannot be logged as learning without reusable outcome', () => {
  const result = validateLearningEntry({ schema: LEARNING_SCHEMA, boardId: '001_X', attemptId: 'a1', failedStage: 'routing', rootCause: 'congestion', outcome: {} });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /engine change, regression test, or documented limitation/);
});

test('learning ledger is immutable and content-addressed', () => {
  const entry = { schema: LEARNING_SCHEMA, boardId: '001_ESP32_SENSOR_HUB', attemptId: 'a1', failedStage: 'placement', rootCause: 'antenna keepout omitted', outcome: { engineChange: 'enforce RF keepouts', regressionTest: 'rf-keepout-placement-001' }, retry: { status: 'pending' } };
  const original = { schema: LEARNING_SCHEMA, entries: [] };
  const updated = appendLearningEntry(original, entry);
  assert.equal(original.entries.length, 0);
  assert.equal(updated.entries.length, 1);
  assert.match(updated.entries[0].digest, /^[a-f0-9]{64}$/);
});
