import { defaultPublishState, normalizePublishState } from './project-publish-state.mjs'

export function buildProjectSyncManifest(project = {}) {
  const publish = normalizePublishState(project.publish || defaultPublishState(project))
  return {
    schema: 'boardforge.project-sync-manifest.v1',
    projectId: project.projectId || project.id || 'unknown-project',
    projectName: project.projectName || project.name || project.projectId || 'Unknown Project',
    projectState: publish.projectState,
    publishApproved: publish.publishApproved,
    dashboardVisible: publish.dashboardVisible,
    syncStatus: publish.syncStatus,
    userApprovalRequired: publish.userApprovalRequired,
    approvalHistory: publish.approvalHistory,
    validation: project.validation || {},
    manufacturing: project.manufacturing || {},
    reports: project.reports || {},
  }
}
