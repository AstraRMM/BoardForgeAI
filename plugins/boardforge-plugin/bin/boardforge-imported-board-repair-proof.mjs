#!/usr/bin/env node
import { runImportedBoardRepairSuite, runImportedBoardSandboxRepairProof } from '../lib/repair/imported-board-repair-proof.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

try {
  const suite = process.argv.includes('--suite')
  const result = suite
    ? await runImportedBoardRepairSuite()
    : await runImportedBoardSandboxRepairProof({ projectId: argValue('--project-id') || undefined })
  console.log(JSON.stringify(result, null, 2))
  process.exit(/completed$/.test(result.status) ? 0 : 2)
} catch (error) {
  console.error(JSON.stringify({ status: 'IMPORTED_BOARD_REPAIR_PROOF_FAILED', error: error.message }, null, 2))
  process.exit(1)
}
