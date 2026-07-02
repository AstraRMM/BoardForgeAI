import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildProjectSyncManifest } from './project-sync-manifest.mjs'

export async function writeProjectApprovalReport({ project = {}, outputDir } = {}) {
  if (!outputDir) throw new Error('outputDir is required')
  await mkdir(outputDir, { recursive: true })
  const state = buildProjectSyncManifest(project)
  const json = path.join(outputDir, 'BoardForge_Project_Approval_State.json')
  const markdown = path.join(outputDir, 'BoardForge_Project_Approval_Report.md')
  await writeFile(json, JSON.stringify(state, null, 2), 'utf8')
  await writeFile(markdown, approvalMarkdown(state), 'utf8')
  return { state, files: { json, markdown } }
}

function approvalMarkdown(state) {
  const validation = state.validation || {}
  const manufacturing = state.manufacturing || {}
  return `# BoardForge Project Approval Report

BoardForge completed this board.

## Status
- Project: ${state.projectName}
- State: ${state.projectState}
- DRC: ${validation.drcViolations ?? validation.drc ?? 'unknown'}
- ERC: ${validation.ercViolations ?? validation.erc ?? 'unknown'}
- Shorts: ${validation.shorts ?? 'unknown'}
- Unconnected: ${validation.unconnected ?? 'unknown'}
- Manufacturing ZIP: ${manufacturing.zip || 'not exported'}
- Sourcing: ${manufacturing.sourcing || manufacturing.assembly || 'not verified'}
- Compliance notes: ${manufacturing.compliance || 'review required when applicable'}

## What do you want to do?
1. Publish to dashboard
2. Keep local only
3. Revise and rerun
4. Archive this draft
5. Delete draft artifacts

BoardForge will not publish unless you explicitly choose publish.
`
}
