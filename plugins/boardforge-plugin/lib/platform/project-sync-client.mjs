import { canPublishToDashboard, markDashboardPublished } from './project-publish-gate.mjs'
import { buildProjectSyncManifest } from './project-sync-manifest.mjs'

export function syncProjectToDashboard(project = {}, options = {}) {
  const gate = canPublishToDashboard(project, { confirm: Boolean(options.confirm) })
  if (!gate.allowed) {
    return {
      status: 'PROJECT_SYNC_BLOCKED_PENDING_APPROVAL',
      synced: false,
      blockers: gate.blockers,
      manifest: buildProjectSyncManifest(project),
    }
  }
  const published = markDashboardPublished(project, { actor: options.actor || 'local_user', note: 'dashboard publish confirmed' })
  return {
    status: 'PROJECT_SYNCED_TO_DASHBOARD',
    synced: true,
    blockers: [],
    manifest: buildProjectSyncManifest(published),
  }
}
