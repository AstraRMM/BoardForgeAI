#!/usr/bin/env node
import path from 'node:path'
import { writeArbitraryPromptBreadthReport } from '../lib/arbitrary-prompt-breadth.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const { report, files } = writeArbitraryPromptBreadthReport({
  outputDir: path.join(repoRoot, 'fixtures', 'prompt-breadth'),
})

console.log(JSON.stringify({ status: report.status, promptsTested: report.promptsTested, passed: report.passed, failed: report.failed, files }, null, 2))
