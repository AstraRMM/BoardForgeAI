import { buildProjectManifest } from '../platform/project-manifest.mjs'
import { choosePromotionCandidate } from '../routing/routeability-optimizer.mjs'

export const ENGINE_WORKFLOW_STEPS = Object.freeze([
  'createProjectFromPrompt',
  'generateSchematic',
  'assignSymbolsAndFootprints',
  'generateBoardOutline',
  'placeComponents',
  'generateRoutingRules',
  'runPreflight',
  'exportDsn',
  'runFreeRouting',
  'importSes',
  'runDrc',
  'runErc',
  'repairPostRoute',
  'generateManufacturingPackage',
  'writeProjectManifest',
  'writeDashboardData',
  'writeReports',
  'saveLessons',
])

export function createEnginePlan(project = {}, options = {}) {
  return {
    project,
    mode: options.mode || 'plan',
    steps: [...ENGINE_WORKFLOW_STEPS],
    hardGates: [
      'protected_path_guard',
      'zero_preroute_shorts_before_dsn',
      'routeability_promotion_gate',
      'manufacturing_requires_clean_validation',
    ],
  }
}

export function selectBestBoardCandidate(candidates = []) {
  return choosePromotionCandidate(candidates)
}

export function createDashboardManifest(project = {}, evidence = {}) {
  return buildProjectManifest(project, evidence)
}
