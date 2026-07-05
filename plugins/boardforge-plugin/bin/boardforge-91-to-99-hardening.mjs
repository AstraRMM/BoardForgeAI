#!/usr/bin/env node
import { writeReadinessGapAudit } from '../lib/readiness/readiness-gap-auditor.mjs'
import { writeDigiKeyQuoteDepthReport } from '../lib/sourcing/digikey/digikey-quote-normalizer.mjs'
import { writeSupplyChainCapabilityReport } from '../lib/sourcing/supply-chain-capability-report.mjs'
import { writeImportBenchmarkSuiteReport } from '../lib/import/import-benchmark-suite.mjs'
import { writeManufacturingPackageAuthenticityReport } from '../lib/manufacturing/package-authenticator.mjs'
import { writeJlcpcbReadinessReport } from '../lib/manufacturing/jlcpcb-readiness-checker.mjs'
import { writeLibraryCoverageReport } from '../lib/library/library-coverage-auditor.mjs'
import { write3dModelCoverageReport } from '../lib/library/model-3d-coverage-report.mjs'
import { scoreFootprintConfidence } from '../lib/library/footprint-confidence-score.mjs'
import { writeSecurityPrivacyReport } from '../lib/security/local-privacy-report.mjs'
import { writePerformanceBenchmark } from '../lib/performance/performance-benchmark.mjs'
import { writeReliabilityReport } from '../lib/reliability/reliability-report.mjs'
import { writeProjectNextActionsReport } from '../lib/copilot/project-explanation-generator.mjs'
import { writePublicAlphaDemoPackageManifest } from '../lib/demo/public-alpha-demo-package.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const rootDir = process.cwd()
const artifacts = []
for (const result of [
  await writeReadinessGapAudit({ rootDir }),
  await writeDigiKeyQuoteDepthReport({ projectDir: rootDir, productInfoRows: [{ MPN: 'RC0603FR-0710KL', sourcingStatus: 'VERIFIED_IN_STOCK', quantityAvailable: 1000 }] }),
  await writeSupplyChainCapabilityReport({ projectDir: rootDir, enabledApis: ['ProductInformationV4','Quote','SupplyChainAPI'] }),
  await writeImportBenchmarkSuiteReport(),
  await writeManufacturingPackageAuthenticityReport({ projectDir: rootDir }),
  await writeJlcpcbReadinessReport({ projectDir: rootDir, pcbFabReady: true, assemblyVerified: false }),
  await writeLibraryCoverageReport({ projectDir: rootDir }),
  await write3dModelCoverageReport({ projectDir: rootDir, components: [{ ref: 'U1', model3d: 'missing' }] }),
  await writeSecurityPrivacyReport({ projectDir: rootDir }),
  await writePerformanceBenchmark({ projectDir: rootDir }),
  await writeReliabilityReport({ projectDir: rootDir }),
  await writeProjectNextActionsReport({ projectDir: rootDir }),
  await writePublicAlphaDemoPackageManifest({ sourceRoot: rootDir }),
]) artifacts.push(...(result.artifactPaths || []))
const footprint = scoreFootprintConfidence({ symbolPresent: true, footprintPresent: true, packageMatch: 'unknown' })
await writeFile(path.join(rootDir, 'BoardForge_Footprint_Confidence_Report.json'), JSON.stringify({ status: 'BOARD_FORGE_FOOTPRINT_CONFIDENCE_WRITTEN', ...footprint }, null, 2), 'utf8')
await writeFile(path.join(rootDir, 'BoardForge_Footprint_Confidence_Report.md'), `# Footprint Confidence Report\n\n- Status: ${footprint.status}\n- Score: ${footprint.score}\n`, 'utf8')
artifacts.push(path.join(rootDir, 'BoardForge_Footprint_Confidence_Report.json'), path.join(rootDir, 'BoardForge_Footprint_Confidence_Report.md'))
console.log(JSON.stringify({ status: 'BOARD_FORGE_91_TO_99_HARDENING_REPORTS_WRITTEN', artifacts }, null, 2))
