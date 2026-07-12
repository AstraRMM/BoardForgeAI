#!/usr/bin/env node
import { runRealBoardProof, REAL_BOARD_PROOF_ROOT } from '../lib/real-board-proof.mjs'

function parseArgs(argv) {
  const options = { fresh: false, outputRoot: REAL_BOARD_PROOF_ROOT }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--fresh') {
      options.fresh = true
    } else if (arg === '--output-root') {
      options.outputRoot = argv[index + 1]
      index += 1
    } else if (arg === '--board') {
      options.board = argv[index + 1]
      index += 1
    }
  }
  return options
}

try {
  const summary = await runRealBoardProof(parseArgs(process.argv.slice(2)))
  console.log(JSON.stringify({
    status: summary.status,
    outputRoot: summary.outputRoot,
    boardsAttempted: summary.boardsAttempted,
    passed: summary.passed,
    blocked: summary.blocked,
    manufacturingReady: summary.manufacturingReady,
    lessonsSaved: summary.lessonsSaved,
  }, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
}
