#!/usr/bin/env node
import { runImportedBoardSandboxRepairProof } from '../lib/repair/imported-board-repair-proof.mjs'

try {
  const result = await runImportedBoardSandboxRepairProof()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'sandboxed_imported_board_repair_proof_completed' ? 0 : 2)
} catch (error) {
  console.error(JSON.stringify({ status: 'IMPORTED_BOARD_REPAIR_PROOF_FAILED', error: error.message }, null, 2))
  process.exit(1)
}
