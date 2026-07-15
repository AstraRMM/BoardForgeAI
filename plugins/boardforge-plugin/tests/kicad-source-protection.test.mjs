import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { enforceCandidatePaths, isProtectedProjectName } from '../lib/platform/kicad/source-protection.mjs'

test('KiCad candidate protection permits only the candidate subtree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boardforge-safe-'))
  const source = path.join(root, 'project.kicad_sch'); fs.writeFileSync(source, '(kicad_sch)')
  const candidate = path.join(root, '.boardforge', 'candidates', 'c1', 'project.kicad_sch')
  fs.mkdirSync(path.dirname(candidate), { recursive: true })
  assert.equal(enforceCandidatePaths({ sourcePath: source, sandboxPath: root, candidatePath: candidate }).allowed, true)
  assert.equal(enforceCandidatePaths({ sourcePath: source, sandboxPath: root, candidatePath: source }).status, 'BLOCKED_SOURCE_MUTATION')
  assert.equal(enforceCandidatePaths({ sourcePath: source, sandboxPath: root, candidatePath: path.join(root, 'escape.kicad_sch') }).status, 'BLOCKED_INVALID_SANDBOX')
})

test('protected hardware project aliases are refused case-insensitively', () => {
  for (const name of ['ESC', 'fc', 'flight-controller', 'flight_controller', 'FN-ESC', 'FN-FC']) assert.equal(isProtectedProjectName(name), true)
})
