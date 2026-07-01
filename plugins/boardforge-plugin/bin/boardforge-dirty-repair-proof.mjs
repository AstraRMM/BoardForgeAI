#!/usr/bin/env node
import { runDirtyRepairProof } from '../lib/repair/drc-repair-supervisor.mjs'

const fixtureIndex = process.argv.indexOf('--fixture')
const fixtureFolder = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : undefined

try {
  const result = await runDirtyRepairProof({ fixtureFolder })
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'dirty_repair_manufacturing_candidate_generated' ? 0 : 2)
} catch (error) {
  console.error(JSON.stringify({ status: 'DIRTY_REPAIR_PROOF_FAILED', error: error.message }, null, 2))
  process.exit(1)
}
