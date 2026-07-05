export const JOB_STATUSES = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
})

export const JOB_TYPES = Object.freeze([
  'validate',
  'route',
  'repair',
  'export',
  'review',
  'health',
  'risk',
  'routeability',
  'diff',
  'preview',
  'blockers',
  'lessons',
  'readiness',
  'fixtures',
  'create_project',
  'custom_outline_validate',
  'custom_outline_seed',
  'variants',
  'make-manufacturable',
  'sourcing_verify',
  'quote_readiness',
  'make_sourcable',
  'alternative_parts',
  'supplier_matrix',
  'digikey_lookup',
  'digikey_live_lookup',
  'digikey_provider_health',
  'digikey_quote_depth',
  'digikey_supplychain_capability',
  'import_benchmark',
  'manufacturing_authenticity',
  'jlcpcb_readiness',
  'library_coverage',
  'security_privacy',
  'performance_benchmark',
  'engineering_copilot',
  'timeline',
  'run_fixture',
  'run_readiness_report',
  'run_board_review',
  'generate_preview',
  'project_health',
  'manufacturing_risk',
  'routeability_explanation',
  'board_diff',
  'applied_lessons',
  'blocker_report',
])

export function createJobRecord({ jobId, projectId = 'unknown', type, payload = {} }) {
  if (!JOB_TYPES.includes(type)) {
    throw new Error(`unsupported_job_type:${type}`)
  }
  const now = new Date().toISOString()
  return {
    jobId,
    projectId,
    type,
    status: JOB_STATUSES.QUEUED,
    progress: 0,
    stage: 'queued',
    startedAt: null,
    finishedAt: null,
    logs: [{ timestamp: now, message: `Queued ${type}` }],
    artifactPaths: [],
    error: null,
    payload,
  }
}

export function publicJobRecord(job) {
  return {
    jobId: job.jobId,
    projectId: job.projectId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    logs: job.logs || [],
    artifactPaths: job.artifactPaths || [],
    error: job.error || null,
  }
}

