import { normalizePublishState, PROJECT_STATES, transitionPublishState } from './project-publish-state.mjs'

export function canPublishToDashboard(manifest = {}, { confirm = false } = {}) {
  const state = normalizePublishState(manifest.publish || manifest)
  const blockers = []
  if (!confirm) blockers.push('publish_requires_explicit_confirm')
  if (![PROJECT_STATES.APPROVED_FOR_DASHBOARD, PROJECT_STATES.DASHBOARD_PUBLISHED].includes(state.projectState)) blockers.push('project_not_approved_for_dashboard')
  if (!state.publishApproved) blockers.push('publish_approval_missing')
  if ([PROJECT_STATES.ARCHIVED, PROJECT_STATES.FAILED_EXPERIMENT].includes(state.projectState)) blockers.push(`project_state_${state.projectState}_cannot_publish`)
  return {
    allowed: blockers.length === 0,
    state,
    blockers,
  }
}

export function approveProjectForDashboard(manifest = {}, metadata = {}) {
  const publish = transitionPublishState(manifest.publish || manifest, 'approve_publish', metadata)
  return { ...manifest, publish, projectState: publish.projectState, publishApproved: publish.publishApproved, dashboardVisible: publish.dashboardVisible, syncStatus: publish.syncStatus }
}

export function markDashboardPublished(manifest = {}, metadata = {}) {
  const gate = canPublishToDashboard(manifest, { confirm: true })
  if (!gate.allowed) return { ...manifest, publishAttempt: { allowed: false, blockers: gate.blockers } }
  const publish = transitionPublishState(manifest.publish || manifest, 'publish_dashboard', metadata)
  return { ...manifest, publish, projectState: publish.projectState, publishApproved: publish.publishApproved, dashboardVisible: publish.dashboardVisible, syncStatus: publish.syncStatus }
}

export function filterDashboardPublished(projects = []) {
  return projects.filter((project) => normalizePublishState(project.publish || project).projectState === PROJECT_STATES.DASHBOARD_PUBLISHED)
}
