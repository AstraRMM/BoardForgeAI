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
import { writeVariantComparisonReport } from '../../variants/variant-report.mjs'
import { runMakeManufacturableWorkflow } from '../../workflows/make-manufacturable-workflow.mjs'
import { writeProjectTimeline } from '../../timeline/project-timeline.mjs'
import { verifyBomSourcing } from '../../sourcing/bom-sourcing-verifier.mjs'
import { writeQuoteReadinessReport } from '../../sourcing/quote-readiness-report.mjs'
import { writeAlternativePartReport } from '../../sourcing/alternative-part-report.mjs'
import { writeSupplierMatrix } from '../../sourcing/provider-matrix.mjs'
import { runMakeSourcableWorkflow } from '../../workflows/make-sourcable-workflow.mjs'
import { createPartLookupService } from '../../sourcing/part-lookup-service.mjs'
import { getProviderConfig } from '../../config/provider-config.mjs'
import { loadBoardForgeEnv } from '../../config/env-loader.mjs'
import { probeDigiKeyQuoteDepth } from '../../sourcing/digikey/digikey-quote-client.mjs'
import { writeSupplyChainCapabilityReport } from '../../sourcing/supply-chain-capability-report.mjs'
import { writeManufacturingPackageAuthenticityReport } from '../../manufacturing/package-authenticator.mjs'
import { writeJlcpcbReadinessReport } from '../../manufacturing/jlcpcb-readiness-checker.mjs'
import { writeLibraryCoverageReport } from '../../library/library-coverage-auditor.mjs'
import { writeSecurityPrivacyReport } from '../../security/local-privacy-report.mjs'
import { writePerformanceBenchmark } from '../../performance/performance-benchmark.mjs'
import { writeReliabilityReport } from '../../reliability/reliability-report.mjs'
import { writeProjectNextActionsReport } from '../../copilot/project-explanation-generator.mjs'
import { createOutlineSeed, validateOutlineSeed, generateOutlineKiCadProject } from '../../outline/custom-outline-workflow.mjs'

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
  const { env } = loadBoardForgeEnv()
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
  if (['variant_generation', 'variants'].includes(job.type)) return writeVariantComparisonReport({ projectDir, projectId: job.projectId })
  if (['make_manufacturable', 'make-manufacturable'].includes(job.type)) return runMakeManufacturableWorkflow({ projectDir, status: job.payload.status || {} })
  if (job.type === 'sourcing_verify') return verifyBomSourcing({ projectDir, rows: job.payload.rows, env, lookupService: createPartLookupService({ env }) })
  if (job.type === 'quote_readiness') {
    const config = getProviderConfig({ env })
    return writeQuoteReadinessReport({ projectDir, rows: job.payload.rows || [], providerConfigured: config.providers.digikey.configured, buildQuantity: job.payload.buildQuantity || 10 })
  }
  if (job.type === 'make_sourcable') return runMakeSourcableWorkflow({ projectDir, rows: job.payload.rows, env, lookupService: createPartLookupService({ env }) })
  if (job.type === 'alternative_parts') return writeAlternativePartReport({ projectDir, rows: job.payload.rows || [], lookupService: createPartLookupService({ env }) })
  if (job.type === 'supplier_matrix') return writeSupplierMatrix({ projectDir, rows: job.payload.rows || [] })
  if (['digikey_lookup', 'digikey_live_lookup'].includes(job.type)) return { status: 'BOARD_FORGE_DIGIKEY_LOOKUP_JOB_COMPLETE', data: await createPartLookupService({ env }).lookup({ mpn: job.payload.mpn, keyword: job.payload.keyword }), artifactPaths: [] }
  if (job.type === 'digikey_provider_health') return { status: 'BOARD_FORGE_DIGIKEY_PROVIDER_HEALTH_JOB_COMPLETE', data: await createPartLookupService({ env }).status(), artifactPaths: [] }
  if (job.type === 'digikey_quote_depth') return probeDigiKeyQuoteDepth({ projectDir, rows: job.payload.rows || [] })
  if (job.type === 'digikey_supplychain_capability') return writeSupplyChainCapabilityReport({ projectDir, enabledApis: config.providers.digikey.enabledApis || [] })
  if (job.type === 'manufacturing_authenticity') return writeManufacturingPackageAuthenticityReport({ projectDir, zipPath: job.payload.zipPath })
  if (job.type === 'jlcpcb_readiness') return writeJlcpcbReadinessReport({ projectDir, assemblyVerified: Boolean(job.payload.assemblyVerified), pcbFabReady: job.payload.pcbFabReady !== false })
  if (job.type === 'library_coverage') return writeLibraryCoverageReport({ projectDir, components: job.payload.components || [] })
  if (job.type === 'security_privacy') return writeSecurityPrivacyReport({ projectDir })
  if (job.type === 'performance_benchmark') { const perf = await writePerformanceBenchmark({ projectDir }); const rel = await writeReliabilityReport({ projectDir }); return { status: 'BOARD_FORGE_PERFORMANCE_RELIABILITY_JOB_COMPLETE', artifactPaths: [...perf.artifactPaths, ...rel.artifactPaths], report: { performance: perf.report, reliability: rel.report } } }
  if (job.type === 'engineering_copilot') return writeProjectNextActionsReport({ projectDir, state: job.payload.state || {} })
  if (['project_timeline', 'timeline'].includes(job.type)) return writeProjectTimeline({ projectDir, events: job.payload.events || [] })
  if (['run_readiness_report', 'readiness'].includes(job.type)) return { status: 'BOARD_FORGE_READINESS_JOB_RECORDED', artifactPaths: [] }
  if (['run_fixture', 'fixtures'].includes(job.type)) return { status: 'BOARD_FORGE_FIXTURE_JOB_RECORDED', artifactPaths: [] }
  if (job.type === 'custom_outline_seed') return { status: 'BOARD_FORGE_CUSTOM_OUTLINE_SEEDED', seed: createOutlineSeed(job.payload), artifactPaths: [] }
  if (job.type === 'custom_outline_validate') {
    const seed = job.payload.seed || createOutlineSeed(job.payload)
    return { status: 'BOARD_FORGE_CUSTOM_OUTLINE_VALIDATED', seed, validation: validateOutlineSeed(seed), artifactPaths: [] }
  }
  if (['custom_outline_generate_kicad', 'custom_outline_generate_board', 'custom_outline_export'].includes(job.type)) {
    const seed = job.payload.seed || createOutlineSeed(job.payload)
    return generateOutlineKiCadProject({ ...job.payload, seed, projectDir: projectDir || job.payload.projectDir })
  }
  if (job.type === 'create_project') return api.createProject(job.payload)
  throw new Error(`unsupported_job_type:${job.type}`)
}

