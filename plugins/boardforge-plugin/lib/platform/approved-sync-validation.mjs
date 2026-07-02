import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defaultPublishState, transitionPublishState } from './project-publish-state.mjs'
import { approveProjectForDashboard, canPublishToDashboard, filterDashboardPublished, markDashboardPublished } from './project-publish-gate.mjs'

export async function runApprovedSyncValidation({ outputDir = process.cwd() } = {}) {
  await mkdir(outputDir, { recursive: true })
  const draft = { id: 'draft', publish: defaultPublishState() }
  const candidate = { id: 'candidate', publish: transitionPublishState(transitionPublishState(defaultPublishState(), 'approve_brief'), 'mark_candidate') }
  const approved = approveProjectForDashboard(candidate, { actor: 'validation' })
  const blockedPublish = canPublishToDashboard(approved, { confirm: false })
  const published = markDashboardPublished(approved, { actor: 'validation' })
  const rejected = { id: 'rejected', publish: transitionPublishState(defaultPublishState(), 'reject_brief') }
  const failed = { id: 'failed', publish: transitionPublishState(defaultPublishState(), 'fail_experiment') }
  const dashboard = filterDashboardPublished([draft, candidate, rejected, failed, published])
  const result = {
    schema: 'boardforge.approved-sync-validation.v1',
    localDraftHidden: draft.publish.dashboardVisible === false && filterDashboardPublished([draft]).length === 0,
    localCandidateHidden: candidate.publish.dashboardVisible === false && filterDashboardPublished([candidate]).length === 0,
    publishBlockedWithoutConfirm: blockedPublish.allowed === false && blockedPublish.blockers.includes('publish_requires_explicit_confirm'),
    publishWithConfirm: published.dashboardVisible === true && published.projectState === 'dashboard_published',
    rejectedFailedHidden: filterDashboardPublished([rejected, failed]).length === 0,
    dashboardVisibleIds: dashboard.map((project) => project.id || project.projectId),
    flows: { draft, candidate, blockedPublish, published, rejected, failed },
  }
  const json = path.join(outputDir, 'BoardForge_Approved_Sync_Validation.json')
  const md = path.join(outputDir, 'BoardForge_Approved_Sync_Validation_Report.md')
  await writeFile(json, JSON.stringify(result, null, 2), 'utf8')
  await writeFile(md, approvedSyncMarkdown(result), 'utf8')
  return { result, files: { json, md } }
}

function approvedSyncMarkdown(result) {
  return `# BoardForge Approved Sync Validation

- Local draft hidden: ${result.localDraftHidden}
- Local candidate hidden: ${result.localCandidateHidden}
- Publish blocked without confirm: ${result.publishBlockedWithoutConfirm}
- Publish with confirm: ${result.publishWithConfirm}
- Rejected/failed hidden: ${result.rejectedFailedHidden}
- Dashboard visible IDs: ${result.dashboardVisibleIds.join(', ') || 'none'}

Only explicitly approved and confirmed projects may become dashboard-published.
`
}
