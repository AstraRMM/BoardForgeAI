#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { summarizeChallenge } from '../plugins/boardforge-plugin/lib/phase2c/challenge-benchmark.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const arg = (name) => { const i=process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : null }
const ledgerPath = path.resolve(arg('--ledger') || path.join(repo, 'reports', 'phase2c', 'BoardForge_50_Board_Attempt_Ledger.json'))
const outputDir = path.resolve(arg('--output') || path.join(repo, 'reports', 'phase2c'))
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { attempts: [] }
if (!Array.isArray(ledger.attempts)) throw new Error('Challenge ledger must contain an attempts array')
const report = { generatedAt:new Date().toISOString(), ledgerPath, ...summarizeChallenge(ledger.attempts) }
fs.mkdirSync(outputDir,{recursive:true})
fs.writeFileSync(path.join(outputDir,'BoardForge_50_Board_Final_Report.json'),JSON.stringify(report,null,2))
fs.writeFileSync(path.join(outputDir,'BoardForge_50_Board_Final_Report.md'), markdown(report))
console.log(JSON.stringify({status:report.status,accepted:report.accepted,rejected:report.rejected,target90:report.timing.classification,outputDir},null,2))

function markdown(r) {
  const failures=Object.entries(r.failureCategories).sort().map(([name,count])=>`| ${name} | ${count} |`).join('\n') || '| none recorded | 0 |'
  return `# BoardForge 50 Board Final Report

This report counts only attempts with every required engineering, manufacturing, live-sourcing, source-protection, and proof gate explicitly proven. Missing evidence is failure, not success.

- Status: **${r.status}**
- Accepted: ${r.accepted}/${r.targetCount}
- Rejected attempts: ${r.rejected}
- Success rate: ${(r.successRate*100).toFixed(1)}%
- Purposeful custom outlines: ${r.customOutlineCount}/${r.accepted} (${(r.customOutlineRatio*100).toFixed(1)}%)
- Average generation time: ${r.timing.averageGenerationMs ?? 'NOT_MEASURED'} ms
- 90-second target: **${r.timing.classification}**
- Average board area: ${r.metrics.averageBoardAreaMm2 ?? 'NOT_MEASURED'} mm²
- Average component density: ${r.metrics.averageComponentDensityPer1000Mm2 ?? 'NOT_MEASURED'} components/1000 mm²
- Average measured area utilization: ${r.metrics.averageAreaUtilization ?? 'NOT_MEASURED'}

## Failure categories

| Category | Occurrences |
|---|---:|
${failures}

## Closure blockers

${r.closureFailures.length ? r.closureFailures.map(x=>`- ${x}`).join('\n') : '- None'}
`
}
