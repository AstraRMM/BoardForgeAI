#!/usr/bin/env node
import { runDenseControlDrcRepair } from '../lib/routing/dense-control-repair-workflow.mjs'

const fixtureIndex = process.argv.indexOf('--fixture')
const fixtureFolder = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : undefined

try {
  const result = await runDenseControlDrcRepair({ fixtureFolder })
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'dense_control_manufacturing_candidate_generated' ? 0 : 2)
} catch (error) {
  console.error(JSON.stringify({ status: 'DENSE_CONTROL_REPAIR_FAILED', error: error.message }, null, 2))
  process.exit(1)
}
