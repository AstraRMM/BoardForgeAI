import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createLocalArtifactApi } from '../local-artifact-api.mjs'
import { runOddShapeWebFlowProof } from '../../engine/odd-shape-web-flow-proof.mjs'
import { canRunPremiumAction } from '../../auth/entitlement-gate.mjs'
import { okResponse, errorResponse, routeNotFound } from './response-schema.mjs'
import { requirePublishConfirm, validateProjectPath } from './request-validator.mjs'
import { createJobQueue } from '../jobs/job-queue.mjs'
import { routeJobRequest } from './job-routes.mjs'
import { writeBoardReviewReports } from '../../review/board-review-engine.mjs'
import { writeProjectHealthScore } from '../project-health-score.mjs'
import { writeManufacturingRiskReport } from '../../manufacturing/manufacturability-risk-score.mjs'
import { writeRouteabilityExplanation } from '../../routeability/routeability-explainer.mjs'
import { writeProjectDiffReport } from '../../diff/project-version-diff.mjs'
import { writeBoardPreview } from '../../preview/board-preview-generator.mjs'
import { writeBlockerReport } from '../../blockers/blocker-report.mjs'
import { writeAppliedLessonsReport } from '../../solution-library/applied-lessons-report.mjs'
import { routePairingRequest } from './pairing-routes.mjs'
import { checkFirstRunSetup } from '../setup/setup-status.mjs'
import { writeVariantComparisonReport } from '../../variants/variant-report.mjs'
import { runMakeManufacturableWorkflow } from '../../workflows/make-manufacturable-workflow.mjs'
import { writeProjectTimeline } from '../../timeline/project-timeline.mjs'
import { runImportWizard } from '../../import/import-wizard.mjs'
import { writeEvidenceIndex } from '../../evidence/evidence-index.mjs'
import { writeAlphaLaunchReport } from '../../launch/alpha-launch-report.mjs'
import { publicProviderConfig } from '../../config/provider-config.mjs'
import { createDigiKeyAuthClient } from '../../sourcing/digikey/digikey-auth-client.mjs'
import { createPartLookupService } from '../../sourcing/part-lookup-service.mjs'
import { verifyBomSourcing } from '../../sourcing/bom-sourcing-verifier.mjs'
import { writeQuoteReadinessReport } from '../../sourcing/quote-readiness-report.mjs'
import { writeAlternativePartReport } from '../../sourcing/alternative-part-report.mjs'
import { runMakeSourcableWorkflow } from '../../workflows/make-sourcable-workflow.mjs'
import { outlinePresetsResponse, createOutlineSeed, validateOutlineSeed, generateOutlineKiCadProject, readOutlineStatus, readOutlineReports } from '../../outline/custom-outline-workflow.mjs'
import { createKiCadCandidateService } from '../kicad/candidate-transaction-service.mjs'

export function createLocalServerRouter({ rootDir, logDir, auth, kicadValidator } = {}) {
  const api = createLocalArtifactApi({ rootDir })
  const jobs = createJobQueue({ rootDir, api })
  const kicadCandidates = createKiCadCandidateService({ rootDir, ...(kicadValidator ? { kicadValidator } : {}) })

  return async function routeLocalServer({ method, pathname, payload = {}, query = new URLSearchParams(), origin = null }) {
    try {
      const pairingResponse = await routePairingRequest({ method, pathname, payload, auth, origin })
      if (pairingResponse) return pairingResponse

      const jobResponse = await routeJobRequest({ method, pathname, payload, query, rootDir, jobs })
      if (jobResponse) return jobResponse

      if (method === 'GET' && pathname === '/health') {
        return okResponse({ status: 'BOARD_FORGE_LOCAL_SERVER_HEALTHY', data: { service: 'BoardForge Local Engine Service', rootDir, localhostOnly: true } })
      }
      if (method === 'POST' && pathname === '/v2/kicad/candidates') return okResponse({ status: 'KICAD_CANDIDATE_READY', data: await kicadCandidates.apply(payload) })
      if (method === 'POST' && pathname === '/kicad/v2/candidate/write') return okResponse({ status: 'KICAD_CANDIDATE_READY', data: await kicadCandidates.apply({ ...payload, id: payload.id || payload.candidateId, sourceHash: payload.sourceHash || payload.baseDocumentHash }) })
      if (method === 'POST' && pathname === '/kicad/v2/candidate/validate') return okResponse({ status: 'KICAD_CANDIDATE_VALIDATION_RECORDED', data: await kicadCandidates.validate(payload.id || payload.candidateId) })
      if (method === 'POST' && pathname === '/kicad/v2/candidate/promote') return okResponse({ status: 'KICAD_CANDIDATE_PROMOTED_LOCAL', data: await kicadCandidates.promote(payload.id || payload.candidateId) })
      if (method === 'POST' && pathname === '/kicad/v2/candidate/discard') return okResponse({ status: 'KICAD_CANDIDATE_DISCARDED', data: await kicadCandidates.discard(payload.id || payload.candidateId) })
      const contractCandidateRoute = pathname.match(/^\/kicad\/v2\/candidate\/([^/]+)\/(status|reports|discard)$/)
      if (contractCandidateRoute) {
        const [, id, action] = contractCandidateRoute
        if (method === 'GET' && action === 'status') return okResponse({ status: 'KICAD_CANDIDATE_STATUS', data: await kicadCandidates.status(id) })
        if (method === 'GET' && action === 'reports') return okResponse({ status: 'KICAD_CANDIDATE_REPORTS', data: await kicadCandidates.reports(id) })
        if (method === 'POST' && action === 'discard') return okResponse({ status: 'KICAD_CANDIDATE_DISCARDED', data: await kicadCandidates.discard(id) })
      }
      const candidateRoute = pathname.match(/^\/v2\/kicad\/candidates\/([^/]+)\/(status|reports|promote-as-local|discard)$/)
      if (candidateRoute) {
        const [, id, action] = candidateRoute
        if (method === 'GET' && action === 'status') return okResponse({ status: 'KICAD_CANDIDATE_STATUS', data: await kicadCandidates.status(id) })
        if (method === 'GET' && action === 'reports') return okResponse({ status: 'KICAD_CANDIDATE_REPORTS', data: await kicadCandidates.reports(id) })
        if (method === 'POST' && action === 'promote-as-local') return okResponse({ status: 'KICAD_CANDIDATE_PROMOTED_LOCAL', data: await kicadCandidates.promote(id) })
        if (method === 'POST' && action === 'discard') return okResponse({ status: 'KICAD_CANDIDATE_DISCARDED', data: await kicadCandidates.discard(id) })
      }
      if (method === 'GET' && pathname === '/status') {
        return okResponse({ status: 'BOARD_FORGE_LOCAL_SERVER_STATUS', data: { ...(await api.status()), port: 38991, logDir, version: 'local-alpha', workspace: rootDir, entitlement: canRunPremiumAction('create_project') } })
      }
      if (method === 'GET' && pathname === '/projects/dashboard') {
        const result = await api.projectDashboard()
        return okResponse({
          status: 'BOARD_FORGE_PROJECT_DASHBOARD_DATA',
          data: publicProjectDashboard(result.dashboard),
          warnings: result.warnings,
        })
      }
      if (method === 'GET' && pathname === '/readiness') {
        const result = await api.projectDashboard()
        const summary = result.dashboard.summary
        return okResponse({
          status: 'BOARD_FORGE_READINESS_STATUS',
          data: {
            label: summary.totalProjects ? 'Local project evidence available' : 'No local project evidence recorded',
            source: 'canonical local project dashboard artifacts',
            summary,
            scoreAvailable: false,
            reason: 'BoardForge does not calculate a release score unless a dedicated readiness artifact has been generated locally.',
          },
          warnings: result.warnings,
          artifactPaths: result.artifactPaths,
        })
      }
      if (method === 'GET' && pathname === '/fixtures') {
        return okResponse({ status: 'BOARD_FORGE_FIXTURE_STATUS', data: { fixtureRoot: rootDir, fixturesCommand: 'npm run fixtures:run', reportCommand: 'npm run report:90:quick -- --fresh' } })
      }
      if (method === 'GET' && pathname === '/sourcing/status') {
        return okResponse({ status: 'BOARD_FORGE_SOURCING_STATUS', data: { ...publicProviderConfig(), sourcingStatus: 'NOT_CHECKED', stockStatus: 'UNKNOWN', assemblyAvailability: 'UNKNOWN', noFakeStock: true } })
      }
      if (method === 'GET' && pathname === '/integrations/digikey/status') {
        const authClient = createDigiKeyAuthClient()
        return okResponse({ status: 'BOARD_FORGE_DIGIKEY_STATUS', data: await authClient.healthCheck() })
      }
      if (method === 'POST' && pathname === '/integrations/digikey/test') {
        const authClient = createDigiKeyAuthClient()
        return okResponse({ status: 'BOARD_FORGE_DIGIKEY_TEST', data: await authClient.healthCheck() })
      }
      if (method === 'POST' && pathname === '/integrations/digikey/lookup') {
        const lookup = await createPartLookupService().lookup({ mpn: payload.mpn, digiKeyPartNumber: payload.digiKeyPartNumber, keyword: payload.keyword })
        return okResponse({ status: 'BOARD_FORGE_DIGIKEY_LOOKUP', data: lookup })
      }
      if (method === 'GET' && pathname === '/setup/status') {
        return okResponse({ status: 'BOARD_FORGE_FIRST_RUN_SETUP_STATUS', data: checkFirstRunSetup() })
      }
      if (method === 'GET' && pathname === '/outline/presets') {
        return okResponse({ status: 'BOARD_FORGE_OUTLINE_PRESETS', data: outlinePresetsResponse() })
      }
      if (method === 'POST' && pathname === '/outline/seed') {
        const seed = createOutlineSeed(payload)
        return okResponse({ status: 'BOARD_FORGE_OUTLINE_SEEDED', data: seed })
      }
      if (method === 'POST' && pathname === '/outline/validate') {
        const seed = payload.seed || createOutlineSeed(payload)
        const validation = validateOutlineSeed(seed)
        return okResponse({ status: validation.status, data: { seed, validation }, warnings: validation.warnings })
      }
      if (method === 'POST' && (pathname === '/outline/generate-kicad' || pathname === '/outline/generate-board')) {
        const seed = payload.seed || createOutlineSeed(payload)
        const projectDir = payload.projectDir || path.join(rootDir, seed.id)
        const guard = validateProjectPath(projectDir)
        if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_OUTLINE_PROJECT_PATH_REFUSED', error: guard.reason })
        const result = await generateOutlineKiCadProject({ ...payload, seed, projectDir })
        return okResponse({ status: result.status, data: result, artifactPaths: result.artifactPaths, warnings: result.validation.warnings })
      }
      const outlineRoute = pathname.match(/^\/outline\/([^/]+)\/?([^/]*)$/)
      if (outlineRoute) {
        const outlineId = decodeURIComponent(outlineRoute[1])
        const action = outlineRoute[2] || 'status'
        const projectDir = payload.projectDir || query.get('projectDir') || path.join(rootDir, outlineId)
        const guard = validateProjectPath(projectDir)
        if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_OUTLINE_PATH_REFUSED', error: guard.reason })
        if (method === 'GET' && action === 'status') return okResponse({ status: 'BOARD_FORGE_OUTLINE_STATUS', data: await readOutlineStatus(projectDir) })
        if (method === 'GET' && action === 'reports') return okResponse({ status: 'BOARD_FORGE_OUTLINE_REPORTS', data: await readOutlineReports(projectDir) })
      }
      if (method === 'GET' && pathname === '/evidence') {
        const result = await writeEvidenceIndex({ rootDir })
        return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
      }
      if (method === 'GET' && pathname === '/alpha/launch-gate') {
        const result = await writeAlphaLaunchReport({ rootDir })
        return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
      }
      if (method === 'POST' && pathname === '/import/wizard') {
        const result = await runImportWizard({ sourceDir: payload.sourceDir, sandboxDir: payload.sandboxDir })
        return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
      }
      if (method === 'POST' && pathname === '/intake/start') {
        const result = await api.startIntake(payload)
        return okResponse({ status: 'BOARD_FORGE_INTAKE_STARTED', data: publicIntakeResponse(result, payload.projectId) })
      }
      if (method === 'POST' && pathname === '/intake/answer') {
        const result = await api.answerIntake(payload)
        return okResponse({ status: 'BOARD_FORGE_INTAKE_ANSWERED', data: publicIntakeResponse(result, payload.projectId) })
      }
      const intakeSession = pathname.match(/^\/intake\/session\/(.+)$/)
      if (method === 'GET' && intakeSession) {
        const projectId = decodeURIComponent(intakeSession[1])
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(projectId)) return errorResponse({ status: 'BOARD_FORGE_INTAKE_SESSION_REFUSED', error: 'project reference is invalid' })
        const sessionFile = path.join(rootDir, projectId, 'BoardForge_Conversation_Session.json')
        return okResponse({ status: 'BOARD_FORGE_INTAKE_SESSION', data: JSON.parse(await readFile(sessionFile, 'utf8')), artifactPaths: [sessionFile] })
      }
      if (method === 'POST' && pathname === '/brief/generate') {
        const result = await api.generateBrief(payload)
        return okResponse({ status: 'BOARD_FORGE_BRIEF_GENERATED', data: publicIntakeResponse(result, payload.projectId) })
      }
      if (method === 'POST' && pathname === '/brief/approve') {
        const result = await api.approveBrief(payload)
        return okResponse({ status: 'BOARD_FORGE_BRIEF_APPROVED', data: publicIntakeResponse(result, payload.projectId) })
      }
      if (method === 'POST' && pathname === '/project/create') {
        const entitlement = canRunPremiumAction('create_project')
        if (payload.oddShapeProof === true) {
          const projectDir = payload.projectDir || path.join(rootDir, payload.projectId || 'BF-LOCALHOST-SERVICE-DEMO-01_REV_A')
          const guard = validateProjectPath(projectDir)
          if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_PROJECT_CREATE_REFUSED', error: guard.reason })
          const result = await runOddShapeWebFlowProof({ projectDir })
          return okResponse({ status: 'BOARD_FORGE_PROJECT_CREATED_BY_LOCALHOST_SERVICE', data: { ...result, entitlement }, warnings: entitlement.allowed ? [] : entitlement.blockers, artifactPaths: [result.projectFiles.pcb, result.manufacturing.zip] })
        }
        const result = await api.createProject(payload)
        return okResponse({ status: result.status, data: publicProjectCreateResponse(result, payload.projectId, entitlement), warnings: entitlement.allowed ? [] : entitlement.blockers, artifactPaths: [result.manifestPath, ...(Object.values(result.projectFiles || {}))].filter(Boolean) })
      }

      const projectRoute = pathname.match(/^\/project\/([^/]+)\/?([^/]*)$/)
      if (projectRoute) {
        const projectId = decodeURIComponent(projectRoute[1])
        const action = projectRoute[2] || 'status'
        const projectDir = payload.projectDir || query.get('projectDir') || path.join(rootDir, projectId)
        const guard = validateProjectPath(projectDir)
        if (!guard.allowed) return errorResponse({ status: 'BOARD_FORGE_PROJECT_PATH_REFUSED', error: guard.reason })

        if (method === 'GET' && action === 'status') return okResponse({ status: 'BOARD_FORGE_PROJECT_STATUS', data: await api.projectStatus({ projectDir }) })
        if (method === 'GET' && action === 'manifest') return okResponse({ status: 'BOARD_FORGE_PROJECT_MANIFEST', data: JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8')), artifactPaths: [path.join(projectDir, 'BoardForge_Project_Manifest.json')] })
        // The dashboard must consume the artifact written by the local project
        // workflow, rather than reconstructing a card from browser fixtures.
        // This route is read-only and remains subject to the same project-path
        // guard and localhost/token checks as every other project route.
        if (method === 'GET' && action === 'dashboard') {
          const artifactPath = path.join(projectDir, 'BoardForge_Project_Dashboard_Data.json')
          return okResponse({
            status: 'BOARD_FORGE_PROJECT_DASHBOARD_DATA',
            data: JSON.parse(await readFile(artifactPath, 'utf8')),
            artifactPaths: [artifactPath],
          })
        }
        if (method === 'GET' && action === 'reports') return okResponse({ status: 'BOARD_FORGE_PROJECT_REPORTS', data: publicProjectReports(await api.reports({ projectDir })) })
        if (method === 'GET' && action === 'downloads') return okResponse({ status: 'BOARD_FORGE_PROJECT_DOWNLOADS', data: publicProjectDownloads(await api.downloads({ projectDir })) })
        if (method === 'POST' && action === 'publish') {
          requirePublishConfirm(payload)
          const result = await api.publishProject({ projectDir, confirm: true })
          return okResponse({ status: result.status, data: result, artifactPaths: [path.join(projectDir, 'BoardForge_Project_Manifest.json')] })
        }
        if (method === 'POST' && action === 'archive') return okResponse({ status: 'BOARD_FORGE_PROJECT_ARCHIVED', data: await api.archiveProject({ projectDir }) })
        if (method === 'POST' && action === 'keep-local') return okResponse({ status: 'BOARD_FORGE_PROJECT_KEPT_LOCAL', data: await api.keepLocal({ projectDir }) })
        if (method === 'POST' && ['validate', 'route', 'repair', 'export'].includes(action)) {
          const status = await api.projectStatus({ projectDir })
          const actionToEntitlement = { validate: 'create_project', route: 'route_board', repair: 'repair_drc', export: 'export_manufacturing' }
          const entitlement = canRunPremiumAction(actionToEntitlement[action])
          return okResponse({
            status: `BOARD_FORGE_PROJECT_${action.toUpperCase()}_LOCAL_ALPHA_RECORDED`,
            data: { action, projectDir, projectStatus: status, sandboxRequired: true, noFakeCloudExecution: true, entitlement },
            warnings: [`${action} is local-engine guarded; this alpha route records the action and reads local validation artifacts.`, ...(entitlement.allowed ? [] : entitlement.blockers)],
          })
        }
        if (method === 'POST' && action === 'review') {
          const result = await writeBoardReviewReports({ projectDir })
          return okResponse({ status: result.status, data: result.review, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'health') {
          const result = await writeProjectHealthScore({ projectDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'risk') {
          const result = await writeManufacturingRiskReport({ projectDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'routeability') {
          const result = await writeRouteabilityExplanation({ projectDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'diff') {
          const result = await writeProjectDiffReport({ projectDir, compareToDir: payload.compareToDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'preview') {
          const status = await api.projectStatus({ projectDir })
          const result = await writeBoardPreview({ projectDir, projectName: projectId, status: { drc: status.validation?.drc, erc: status.validation?.erc, manufacturing: status.manufacturing?.state } })
          return okResponse({ status: 'BOARD_FORGE_BOARD_PREVIEW_WRITTEN', data: result.preview, artifactPaths: [result.json, result.svg] })
        }
        if (method === 'POST' && action === 'lessons') {
          const result = await writeAppliedLessonsReport({ projectDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'blockers') {
          const result = await writeBlockerReport({ projectDir })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'variants') {
          const result = await writeVariantComparisonReport({ projectDir, projectId })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'make-manufacturable') {
          const status = await api.projectStatus({ projectDir })
          const result = await runMakeManufacturableWorkflow({ projectDir, status: status.validation || {} })
          return okResponse({ status: result.status, data: result, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'sourcing-verify') {
          const result = await verifyBomSourcing({ projectDir, rows: payload.rows })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'quote-readiness') {
          const result = await writeQuoteReadinessReport({ projectDir, rows: payload.rows || [], providerConfigured: publicProviderConfig().providers.digikey.configured })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'alternatives') {
          const result = await writeAlternativePartReport({ projectDir, rows: payload.rows || [], lookupService: createPartLookupService() })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'make-sourcable') {
          const result = await runMakeSourcableWorkflow({ projectDir, rows: payload.rows })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
        if (method === 'POST' && action === 'timeline') {
          const result = await writeProjectTimeline({ projectDir, events: payload.events || [] })
          return okResponse({ status: result.status, data: result.report, artifactPaths: result.artifactPaths })
        }
      }

      return routeNotFound({ method, pathname })
    } catch (error) {
      return errorResponse({ status: error.status || 'BOARD_FORGE_LOCAL_SERVER_ROUTE_ERROR', error })
    }
  }
}

function publicIntakeResponse(result = {}, projectId = '') {
  const session = result.session || {}
  return {
    projectId: String(projectId || '').replace(/[^A-Za-z0-9_-]/g, ''),
    session: {
      sessionId: session.sessionId,
      originalPrompt: session.originalPrompt,
      boardType: session.boardType,
      currentStage: session.currentStage,
      questionsAsked: session.questionsAsked || [],
      questionsToAsk: session.plan?.questionsToAsk || [],
      assumptions: session.assumptions || [],
      risks: session.risks || [],
      approvalStatus: session.approvalStatus,
      projectState: session.projectState,
    },
    brief: result.brief ? publicBrief(result.brief) : undefined,
  }
}

function publicProjectCreateResponse(result = {}, projectId = '', entitlement = {}) {
  return {
    projectId: String(projectId || '').replace(/[^A-Za-z0-9_-]/g, ''),
    projectCreated: Boolean(result.projectCreated),
    projectState: result.publish?.projectState || null,
    briefApproved: Boolean(result.brief?.briefApproved),
    blockers: Array.isArray(result.blockers) ? result.blockers : [],
    entitlement: {
      allowed: Boolean(entitlement.allowed),
      action: entitlement.action || 'create_project',
    },
  }
}

/** The browser may list helper projects but never receives protected workspace paths. */
function publicProjectDashboard(dashboard = {}) {
  return {
    schema: dashboard.schema,
    generatedAt: dashboard.generatedAt,
    summary: dashboard.summary,
    projects: (dashboard.projects || []).map((project) => ({
      ...project,
      boardPath: null,
      schematicPath: null,
      sourceManifest: null,
      reports: Object.fromEntries(Object.keys(project.reports || {}).map((key) => [key, 'recorded locally'])),
      replayCommand: null,
      importSandbox: project.importSandbox ? { ...project.importSandbox, report: 'Recorded locally' } : undefined,
      localOnly: true,
    })),
  }
}

/** Browser views need artifact availability and engineering state, not local paths. */
function publicProjectReports(manifest = {}) {
  return {
    projectId: manifest.projectId || null,
    projectName: manifest.projectName || null,
    status: manifest.status || null,
    validation: {
      drcViolations: manifest.validation?.drcViolations ?? manifest.validation?.drc ?? null,
      ercViolations: manifest.validation?.ercViolations ?? manifest.validation?.erc ?? null,
      unconnected: manifest.validation?.unconnected ?? manifest.validation?.unconnectedCount ?? null,
      forbiddenVias: manifest.validation?.forbiddenVias ?? manifest.validation?.forbiddenViasCount ?? null,
    },
    reports: Object.keys(manifest.reports || {}).map((id) => ({ id, available: true })),
  }
}

function publicProjectDownloads(downloads = {}) {
  return {
    readiness: downloads.readiness || null,
    assembly: downloads.assembly || null,
    artifacts: {
      gerbers: Boolean(downloads.gerbers),
      drill: Boolean(downloads.drill),
      bom: Boolean(downloads.bom),
      cpl: Boolean(downloads.cpl),
      package: Boolean(downloads.zip),
    },
    browserTransferAvailable: false,
  }
}

function publicBrief(brief = {}) {
  return {
    boardPurpose: brief.boardPurpose,
    boardType: brief.boardType,
    selectedArchitecture: brief.selectedArchitecture || [],
    assumptions: brief.assumptions || [],
    partsAndBlocksProposed: brief.partsAndBlocksProposed || [],
    boardOutlinePlan: brief.boardOutlinePlan,
    connectorPlan: brief.connectorPlan,
    powerPlan: brief.powerPlan,
    manufacturingTarget: brief.manufacturingTarget,
    briefApproved: Boolean(brief.briefApproved),
  }
}
