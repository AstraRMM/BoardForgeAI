import path from 'node:path'
import { detectFreeRoutingBackend } from './router-backend-freeRouting.mjs'
import { detectTopoRBackend } from './router-backend-topor.mjs'
import { detectElectraBackend } from './router-backend-electra.mjs'
import { detectKiCadShoveBackend } from './router-backend-kicad-shove.mjs'
import { chooseBestRouterResult } from './router-result-scorer.mjs'
import { writeRouterEnsembleReport } from './router-ensemble-report.mjs'

export function detectRouterBackends(options = {}) {
  return [
    detectFreeRoutingBackend(options),
    detectTopoRBackend(options),
    detectElectraBackend(options),
    detectKiCadShoveBackend(options),
    {
      id: 'boardforge_internal',
      name: 'BoardForge internal exact/local/regional router',
      available: true,
      missing: [],
      scope: 'finishing',
    },
  ]
}

export async function runRouterBackendManager(boardPath, options = {}) {
  const backends = detectRouterBackends(options)
  const candidateRoot = options.candidateRoot || path.join(path.dirname(boardPath), 'boardforge-router-candidates')
  const baselineResult = options.baselineResult || {
    backend: 'current_board',
    drc: options.baselineDrc || {},
    boardPath,
    originalSpec: options.originalSpec || {},
  }
  const routerResults = [baselineResult, ...(options.routerResults || [])]
  const { scored, best } = chooseBestRouterResult(routerResults)
  const report = {
    boardPath,
    candidateRoot,
    backends,
    scored,
    best,
    selectedBackend: best?.backend || null,
    mode: options.dryRun === false ? 'execute_available_backends' : 'detect_and_score',
  }
  if (options.reportJson || options.reportMd) {
    await writeRouterEnsembleReport(report, { jsonPath: options.reportJson, markdownPath: options.reportMd })
  }
  return report
}
