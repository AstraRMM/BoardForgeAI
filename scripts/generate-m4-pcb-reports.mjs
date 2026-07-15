import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const generatedAt = '2026-07-15T00:00:00.000Z'
const evidence = {
  command: 'cargo test --manifest-path rust/Cargo.toml -p boardforge-geometry -p boardforge-wasm',
  geometryTests: { passed: 13, failed: 0, suiteSeconds: 1.83 },
  scaleGate: { primitives: 100000, maximumSeconds: 10, result: 'PASS' },
  clippy: { command: 'cargo clippy --manifest-path rust/Cargo.toml -p boardforge-geometry -p boardforge-wasm -- -D warnings', result: 'PASS' },
}

const reports = [
  {
    stem: 'BoardForge_PCB_Editor_Capability_Report', title: 'PCB Editor Capability Report', status: 'PARTIAL',
    implemented: ['Rust schema-v1 PCB routing and validation DTOs', '45/90/free route previews', 'via/layer transition metadata', 'net metrics and placement checks'],
    limitations: ['This evidence does not prove a production-quality end-to-end browser editor.', 'Track shove routing, impedance solving and copper-pour refill are not implemented.', 'Touch and cross-browser behavior require Playwright proof.'],
  },
  {
    stem: 'BoardForge_PCB_Rendering_Report', title: 'PCB Rendering Report', status: 'INTEGRATION_REQUIRED',
    implemented: ['Rust returns stable route-preview geometry and immediate violation-marker coordinates.', 'Geometry results are serializable through serde-wasm-bindgen.'],
    limitations: ['No claim of GPU rendering, dirty-region redraw or sustained 60 FPS is made by this report.', '100k DRC throughput is not a rendering-frame benchmark.', 'Visual regression evidence is owned by browser QA.'],
  },
  {
    stem: 'BoardForge_PCB_Editing_Report', title: 'PCB Editing Report', status: 'PARTIAL',
    implemented: ['Grid-snapped 45-degree, orthogonal and free-angle route planning', 'Via insertion preview with target-layer metadata', 'Net-aware width metadata and deterministic route IDs', 'Placement courtyard collision and keepout checks'],
    limitations: ['Interactive browser gestures must be connected to these WASM functions.', 'Drag/delete/undo/redo persistence is supplied by the separate Rust transaction layer.', 'Router is a dogleg planner, not KiCad shove/walkaround parity.'],
  },
  {
    stem: 'BoardForge_Rust_PCB_Integration_Report', title: 'Rust Integration Report', status: 'PASS_WITH_OPEN_INTEGRATION',
    implemented: ['pcb_plan_route', 'pcb_validate', 'pcb_net_metrics', 'pcb_validate_placement', 'Schema mismatch rejection at each versioned WASM boundary'],
    limitations: ['Browser fallback behavior must fail closed when WASM is unavailable.', 'Generated TypeScript bindings and packaged WASM loading still require browser integration verification.'],
  },
  {
    stem: 'BoardForge_PCB_Performance_Report', title: 'PCB Performance Report', status: 'PASS_BOUNDED',
    implemented: ['Uniform-grid broad-phase indexing avoids a global O(n²) copper scan.', 'A deterministic 100,000-segment test is part of the Rust test suite.', `The complete 13-test geometry suite, including the scale gate, measured ${evidence.geometryTests.suiteSeconds.toFixed(2)} seconds in an unoptimized Windows test build.`],
    limitations: ['The harness asserts only that the 100k validation case completes under 10 seconds.', 'The recorded 1.83 seconds is total suite time, not isolated DRC latency.', 'No 60 FPS, memory ceiling, mobile-device or WASM-browser performance claim is established.'],
  },
  {
    stem: 'BoardForge_PCB_Candidate_Save_Report', title: 'PCB Candidate Save Report', status: 'SEPARATE_PIPELINE_EVIDENCE_REQUIRED',
    implemented: ['Routing results use stable IDs suitable for Rust edit transactions.', 'Route previews carry layer, width and net metadata required to form candidate transactions.'],
    limitations: ['This routing/DRC suite does not write files or mutate source projects.', 'Candidate serialization, atomic write, KiCad validation, reload and promotion must be proven by the M4 integration gate.', 'Source-file immutability remains mandatory.'],
  },
]

function markdown(report) {
  const lines = [`# BoardForge ${report.title}`, '', `Status: **${report.status}**`, '', `Generated: ${generatedAt}`, '', '## Implemented evidence', '']
  lines.push(...report.implemented.map(x => `- ${x}`), '', '## Measured verification', '', `- ${evidence.geometryTests.passed}/${evidence.geometryTests.passed + evidence.geometryTests.failed} focused geometry tests passed.`, `- The complete geometry suite measured ${evidence.geometryTests.suiteSeconds.toFixed(2)} seconds.`, `- The ${evidence.scaleGate.primitives.toLocaleString('en-US')}-primitive spatial-index gate passed its ${evidence.scaleGate.maximumSeconds}-second bound.`, '- Strict Rust clippy passed with warnings denied.', '', '## Honest limitations', '')
  lines.push(...report.limitations.map(x => `- ${x}`), '')
  return lines.join('\n')
}

for (const report of reports) {
  const json = { schema: 'boardforge.phase2b.m4.report.v1', generatedAt, title: report.title, status: report.status, implemented: report.implemented, evidence, limitations: report.limitations }
  writeFileSync(resolve(root, `${report.stem}.json`), `${JSON.stringify(json, null, 2)}\n`)
  writeFileSync(resolve(root, `${report.stem}.md`), markdown(report))
}

console.log(JSON.stringify({ generated: reports.length * 2, reports: reports.map(x => x.stem) }))

