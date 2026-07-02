export const PROJECT_STATES = Object.freeze({
  LOCAL_DRAFT: 'local_draft',
  BRIEF_PENDING_APPROVAL: 'brief_pending_approval',
  BRIEF_APPROVED: 'brief_approved',
  BRIEF_REJECTED: 'brief_rejected',
  REVISION_REQUESTED: 'revision_requested',
  LOCAL_CANDIDATE: 'local_candidate',
  APPROVED_FOR_DASHBOARD: 'approved_for_dashboard',
  DASHBOARD_PUBLISHED: 'dashboard_published',
  ARCHIVED: 'archived',
  FAILED_EXPERIMENT: 'failed_experiment',
})

export function defaultPublishState(overrides = {}) {
  return normalizePublishState({
    projectState: PROJECT_STATES.LOCAL_DRAFT,
    publishApproved: false,
    dashboardVisible: false,
    syncStatus: 'not_synced',
    userApprovalRequired: true,
    approvalHistory: [],
    ...overrides,
  })
}

export function normalizePublishState(input = {}) {
  const projectState = Object.values(PROJECT_STATES).includes(input.projectState) ? input.projectState : PROJECT_STATES.LOCAL_DRAFT
  const publishApproved = Boolean(input.publishApproved) || projectState === PROJECT_STATES.APPROVED_FOR_DASHBOARD || projectState === PROJECT_STATES.DASHBOARD_PUBLISHED
  const briefApproved = Boolean(input.briefApproved) || [PROJECT_STATES.BRIEF_APPROVED, PROJECT_STATES.LOCAL_CANDIDATE, PROJECT_STATES.APPROVED_FOR_DASHBOARD, PROJECT_STATES.DASHBOARD_PUBLISHED].includes(projectState)
  const dashboardVisible = projectState === PROJECT_STATES.DASHBOARD_PUBLISHED
  return {
    schema: 'boardforge.project-publish-state.v1',
    projectState,
    publishApproved,
    briefApproved,
    briefApprovalStatus: briefApproved ? 'approved' : projectState === PROJECT_STATES.BRIEF_REJECTED ? 'rejected' : projectState === PROJECT_STATES.REVISION_REQUESTED ? 'revision_requested' : input.briefApprovalStatus || 'pending',
    dashboardVisible,
    syncStatus: input.syncStatus || (dashboardVisible ? 'synced' : 'not_synced'),
    userApprovalRequired: projectState !== PROJECT_STATES.DASHBOARD_PUBLISHED,
    approvalHistory: Array.isArray(input.approvalHistory) ? input.approvalHistory : [],
  }
}

export function transitionPublishState(state = {}, action, metadata = {}) {
  const current = normalizePublishState(state)
  const entry = { action, at: metadata.at || new Date().toISOString(), actor: metadata.actor || 'local_user', note: metadata.note || '' }
  if (action === 'mark_brief_pending') return normalizePublishState({ ...current, projectState: PROJECT_STATES.BRIEF_PENDING_APPROVAL, briefApproved: false, briefApprovalStatus: 'pending', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'approve_brief') return normalizePublishState({ ...current, projectState: PROJECT_STATES.BRIEF_APPROVED, briefApproved: true, briefApprovalStatus: 'approved', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'reject_brief') return normalizePublishState({ ...current, projectState: PROJECT_STATES.BRIEF_REJECTED, briefApproved: false, briefApprovalStatus: 'rejected', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'request_revision') return normalizePublishState({ ...current, projectState: PROJECT_STATES.REVISION_REQUESTED, briefApproved: false, briefApprovalStatus: 'revision_requested', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'mark_candidate') return normalizePublishState({ ...current, projectState: PROJECT_STATES.LOCAL_CANDIDATE, approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'approve_publish') return normalizePublishState({ ...current, projectState: PROJECT_STATES.APPROVED_FOR_DASHBOARD, publishApproved: true, approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'publish_dashboard') return normalizePublishState({ ...current, projectState: PROJECT_STATES.DASHBOARD_PUBLISHED, publishApproved: true, syncStatus: 'synced', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'keep_local') return normalizePublishState({ ...current, projectState: PROJECT_STATES.LOCAL_CANDIDATE, publishApproved: false, syncStatus: 'kept_local', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'archive') return normalizePublishState({ ...current, projectState: PROJECT_STATES.ARCHIVED, publishApproved: false, syncStatus: 'archived', approvalHistory: [...current.approvalHistory, entry] })
  if (action === 'fail_experiment') return normalizePublishState({ ...current, projectState: PROJECT_STATES.FAILED_EXPERIMENT, publishApproved: false, syncStatus: 'not_synced', approvalHistory: [...current.approvalHistory, entry] })
  throw new Error(`Unknown publish state action: ${action}`)
}
