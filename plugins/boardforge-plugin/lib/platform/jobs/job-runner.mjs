import { randomUUID } from 'node:crypto'
import { createJobRecord, JOB_STATUSES } from './job-status-schema.mjs'
import { writeBoardReviewReports } from '../../review/board-review-engine.mjs'
import { writeProjectHealthScore } from '../project-health-score.mjs'
import { writeManufacturingRiskReport } from '../../manufacturing/manufacturability-risk-score.mjs'
import { writeRouteabilityExplanation } from '../../routeability/routeability-explainer.mjs'
import { writeProjectDiffReport } from '../../diff/project-version-diff.mjs'
import { writeBoardPreview } from '../../preview/board-preview-generator.mjs'
import { writeBlockerReport } from '../../blockers/blocker-report.mjs'
import { writeAppliedLessonsReport } from '../../solution-library/applied-lessons-report.mjs'

export async function runJob({ store, api, type, projectId, payload = {} }) {
  const job = createJobRecord({ jobId: randomUUID(), projectId, type, payload })
  await store.write(job)
  return executeJob({ store, api, job })
}

export async function executeJob({ store, api, job }) {
  const started = new Date().toISOString()
  const running = {
    ...job,
    status: JOB_STATUSES.RUNNING,
    progress: 15,
    stage: 'running',
    startedAt: started,
    logs: [...job.logs, { timestamp: started, message: `Started ${job.type}` }],
  }
  await store.write(running)
  try {
    const result = await runJobType({ api, job: running })
    const finishedAt = new Date().toISOString()
    const succeeded = {
      ...running,
      status: JOB_STATUSES.SUCCEEDED,
      progress: 100,
      stage: 'complete',
      finishedAt,
      logs: [...running.logs, { timestamp: finishedAt, message: `Succeeded ${job.type}` }],
      artifactPaths: result.artifactPaths || [],
      result,
    }
    await store.write(succeeded)
    return succeeded
  } catch (error) {
    let blockerArtifacts = []
    if (job.payload?.projectDir) {
      try {
        const blockers = await writeBlockerReport({ projectDir: job.payload.projectDir })
        blockerArtifacts = blockers.artifactPaths || []
      } catch {}
    }
    const finishedAt = new Date().toISOString()
    const failed = {
      ...running,
      status: JOB_STATUSES.FAILED,
      progress: 100,
      stage: 'failed',
      finishedAt,
      logs: [...running.logs, { timestamp: finishedAt, message: `Failed ${job.type}: ${error.message}` }],
      artifactPaths: blockerArtifacts,
      error: { message: error.message },
    }
    await store.write(failed)
    return failed
  }
}

async function runJobType({ api, job }) {
  const projectDir = job.payload.projectDir
  if (['validate', 'route', 'repair', 'export'].includes(job.type)) {
    const status = await api.projectStatus({ projectDir })
    return { status: `BOARD_FORGE_${job.type.toUpperCase()}_JOB_RECORDED`, data: status, artifactPaths: [] }
  }
  if (['run_board_review', 'review'].includes(job.type)) return writeBoardReviewReports({ projectDir })
  if (['project_health', 'health'].includes(job.type)) return writeProjectHealthScore({ projectDir })
  if (['manufacturing_risk', 'risk'].includes(job.type)) return writeManufacturingRiskReport({ projectDir })
  if (['routeability_explanation', 'routeability'].includes(job.type)) return writeRouteabilityExplanation({ projectDir })
  if (['board_diff', 'diff'].includes(job.type)) return writeProjectDiffReport({ projectDir, compareToDir: job.payload.compareToDir })
  if (['generate_preview', 'preview'].includes(job.type)) return writeBoardPreview({ projectDir, projectName: job.projectId })
  if (['applied_lessons', 'lessons'].includes(job.type)) return writeAppliedLessonsReport({ projectDir })
  if (['blocker_report', 'blockers'].includes(job.type)) return writeBlockerReport({ projectDir })
  if (['run_readiness_report', 'readiness'].includes(job.type)) return { status: 'BOARD_FORGE_READINESS_JOB_RECORDED', artifactPaths: [] }
  if (['run_fixture', 'fixtures'].includes(job.type)) return { status: 'BOARD_FORGE_FIXTURE_JOB_RECORDED', artifactPaths: [] }
  if (job.type === 'custom_outline_validate') return { status: 'BOARD_FORGE_CUSTOM_OUTLINE_VALIDATION_JOB_RECORDED', artifactPaths: [] }
  if (job.type === 'custom_outline_seed') return { status: 'BOARD_FORGE_CUSTOM_OUTLINE_SEED_JOB_RECORDED', artifactPaths: [] }
  if (job.type === 'create_project') return api.createProject(job.payload)
  throw new Error(`unsupported_job_type:${job.type}`)
}
