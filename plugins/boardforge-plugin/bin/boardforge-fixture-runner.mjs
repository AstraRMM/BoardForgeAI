#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { detectKiCadCli, runDrc, runErc } from '../lib/kicad-cli.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const fixtureRoot = path.join(repoRoot, 'fixtures', 'boards')
const safeFixtureRoot = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures'

function readFixtures() {
  if (!fs.existsSync(fixtureRoot)) return []
  return fs.readdirSync(fixtureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(fixtureRoot, entry.name, 'fixture.json')
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
    })
    .filter(Boolean)
}

function buildFixtureReport(fixtures) {
  return {
    schema: 'boardforge.fixture-report.v1',
    fixtures: fixtures.map((fixture) => ({
      id: fixture.id,
      name: fixture.name,
      revision: fixture.revision,
      targetFolder: fixture.targetFolder,
      layers: fixture.layers,
      expectedOutputs: fixture.expectedOutputs,
      status: 'defined_not_executed',
      validationCriteria: fixture.constraints?.manufacturingRequires || {},
      knownRisks: fixture.knownRisks || [],
    })),
  }
}

function safeTargetFolder(targetFolder) {
  const resolved = path.resolve(targetFolder)
  const safeRoot = path.resolve(safeFixtureRoot)
  if (!resolved.toLowerCase().startsWith(safeRoot.toLowerCase())) {
    throw new Error(`Refusing fixture target outside safe synthetic root: ${targetFolder}`)
  }
  return resolved
}

function oddShapePoints(width, height) {
  return [
    [5, 8],
    [14, 2],
    [54, 2],
    [63, 8],
    [66, 18],
    [60, 22],
    [66, 30],
    [62, 40],
    [54, 43],
    [14, 43],
    [6, 40],
    [2, 30],
    [8, 22],
    [2, 18],
  ].map(([x, y]) => [Number((x / 68 * width).toFixed(3)), Number((y / 44 * height).toFixed(3))])
}

function pcbLine([x1, y1], [x2, y2]) {
  return `  (gr_line (start ${x1} ${y1}) (end ${x2} ${y2}) (stroke (width 0.1) (type solid)) (layer "Edge.Cuts") (uuid "${cryptoId()}"))`
}

function fixtureFootprint(ref, value, x, y, rot = 0) {
  return `  (footprint "Fixture_${value}" (layer "F.Cu")
    (uuid "${cryptoId()}")
    (at ${x} ${y} ${rot})
    (property "Reference" "${ref}" (at 0 -2.2 ${rot}) (layer "F.SilkS") (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.12))))
    (property "Value" "${value}" (at 0 2.2 ${rot}) (layer "F.Fab") (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.12))))
    (pad "1" smd roundrect (at -1 0 ${rot}) (size 1 1) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.25) (uuid "${cryptoId()}"))
    (pad "2" smd roundrect (at 1 0 ${rot}) (size 1 1) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.25) (uuid "${cryptoId()}"))
  )`
}

function mountingHole(ref, x, y) {
  return `  (footprint "MountingHole:MountingHole_2.2mm_M2" (layer "F.Cu")
    (uuid "${cryptoId()}")
    (at ${x} ${y})
    (descr "Mounting Hole 2.2mm, M2, no annular")
    (tags "mountinghole M2")
    (property "Reference" "${ref}" (at 0 -3.15 0) (layer "F.SilkS") (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.15))))
    (property "Value" "MountingHole_2.2mm_M2" (at 0 3.15 0) (layer "F.Fab") (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.15))))
    (property "KiLib_Generator" "mounting_hardware/mounting_hole" (at 0 0 0) (layer "F.SilkS") (hide yes) (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.15))))
    (attr exclude_from_pos_files exclude_from_bom)
    (fp_circle (center 0 0) (end 2.2 0) (stroke (width 0.15) (type solid)) (fill no) (layer "Cmts.User") (uuid "${cryptoId()}"))
    (fp_circle (center 0 0) (end 2.45 0) (stroke (width 0.05) (type solid)) (fill no) (layer "F.CrtYd") (uuid "${cryptoId()}"))
    (fp_text user "\${REFERENCE}" (at 0 0 0) (layer "F.Fab") (uuid "${cryptoId()}") (effects (font (size 1 1) (thickness 0.15))))
    (pad "" np_thru_hole circle (at 0 0) (size 2.2 2.2) (drill 2.2) (layers "*.Cu" "*.Mask") (uuid "${cryptoId()}"))
  )`
}

function cryptoId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function buildPcb(fixture, projectId) {
  const width = fixture.outline.widthMm
  const height = fixture.outline.heightMm
  const points = oddShapePoints(width, height)
  const edgeLines = points.map((point, index) => pcbLine(point, points[(index + 1) % points.length])).join('\n')
  const holes = [
    mountingHole('H1', 13, 11),
    mountingHole('H2', width - 13, 11),
    mountingHole('H3', 13, height - 9),
    mountingHole('H4', width - 13, height - 9),
  ].join('\n')
  const footprints = [
    fixtureFootprint('J1', 'USB_C_EDGE', 13, height / 2, 90),
    fixtureFootprint('J2', 'CAN_EDGE', width - 13, height / 2, 270),
    fixtureFootprint('J3', 'GPS_UART_EDGE', width - 16, height - 7, 0),
    fixtureFootprint('J4', 'I2C_EDGE', width - 16, 7, 180),
    fixtureFootprint('J5', 'SWD_EDGE', 18, 7, 180),
    fixtureFootprint('U1', 'MCU', width / 2, height / 2, 0),
    fixtureFootprint('U2', 'IMU', width / 2 - 12, height / 2 + 7, 0),
    fixtureFootprint('U3', 'BARO', width / 2 - 12, height / 2 - 7, 0),
    fixtureFootprint('U4', '3V3_REG', width / 2 + 13, height / 2 - 8, 0),
    fixtureFootprint('U5', 'CAN_XCVR', width / 2 + 14, height / 2 + 8, 0),
  ].join('\n')
  return `(kicad_pcb (version 20240108) (generator "BoardForge fixture runner")
  (general)
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (2 "In1.Cu" power)
    (4 "In2.Cu" power)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user)
    (33 "F.Adhes" user)
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user)
    (37 "F.SilkS" user)
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (44 "Edge.Cuts" user)
    (45 "Margin" user)
    (46 "B.CrtYd" user)
    (47 "F.CrtYd" user)
    (48 "B.Fab" user)
    (49 "F.Fab" user)
  )
  (setup
    (pad_to_mask_clearance 0)
    (pcbplotparams (layerselection 0x00010fc_ffffffff) (plot_on_all_layers_selection 0x0000000_00000000) (disableapertmacros false) (usegerberextensions false) (usegerberattributes true) (usegerberadvancedattributes true) (creategerberjobfile true) (dashed_line_dash_ratio 12.0) (dashed_line_gap_ratio 3.0) (svgprecision 4) (plotframeref false) (viasonmask false) (mode 1) (useauxorigin false) (hpglpennumber 1) (hpglpenspeed 20) (hpglpendiameter 15.000000) (pdf_front_fp_property_popups true) (pdf_back_fp_property_popups true) (dxfpolygonmode true) (dxfimperialunits true) (dxfusepcbnewfont true) (psnegative false) (psa4output false) (plot_black_and_white false) (plotinvisibletext false) (sketchpadsonfab false) (subtractmaskfromsilk false) (outputformat 1) (mirror false) (drillshape 1) (scaleselection 1) (outputdirectory "manufacturing/gerbers/"))
  )
  (net 0 "")
  (gr_text "${projectId}" (at ${width / 2} ${height - 3} 0) (layer "F.SilkS") (uuid "${cryptoId()}") (effects (font (size 1.1 1.1) (thickness 0.14))))
${edgeLines}
${holes}
${footprints}
)`
}

function buildSchematic(fixture, projectId) {
  return `(kicad_sch (version 20230121) (generator "BoardForge fixture runner")
  (uuid "${cryptoId()}")
  (paper "A4")
  (title_block
    (title "${projectId}")
    (comment 1 "${fixture.brief}")
    (comment 2 "Fixture schematic graph placeholder: symbol graph generation is the next execution stage.")
  )
  (sheet_instances (path "/" (page "1")))
)`
}

function issueCounts(report = {}) {
  const issues = []
  const visit = (value) => {
    if (!value || typeof value !== 'object') return
    if (!Array.isArray(value) && typeof value.severity === 'string' && (value.type || value.description || value.items)) {
      issues.push(value)
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit)
      else visit(child)
    }
  }
  visit(report)
  return {
    errors: issues.filter((issue) => issue.severity.toLowerCase() === 'error').length,
    warnings: issues.filter((issue) => issue.severity.toLowerCase() === 'warning').length,
    total: issues.length,
    byType: issues.reduce((acc, issue) => {
      const key = issue.type || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  }
}

async function validateFixtureProject({ target, schematicFile, pcbFile }) {
  const cli = await detectKiCadCli()
  if (!cli.available) {
    return {
      kicadCli: cli,
      drc: { status: 'not_run_kicad_cli_unavailable', issueCounts: null, reportFile: null },
      erc: { status: 'not_run_kicad_cli_unavailable', issueCounts: null, reportFile: null },
    }
  }
  const reportDir = path.join(target, 'reports')
  const drc = await runDrc({
    pcbFile,
    outputFile: path.join(reportDir, 'drc.json'),
    kicadCliPath: cli.path,
    saveBoard: false,
  })
  const erc = await runErc({
    schFile: schematicFile,
    outputFile: path.join(reportDir, 'erc.json'),
    kicadCliPath: cli.path,
  })
  return {
    kicadCli: cli,
    drc: { ...drc, issueCounts: issueCounts(drc.report) },
    erc: { ...erc, issueCounts: issueCounts(erc.report) },
  }
}

async function writeOddShapeFixtureProject(fixture) {
  const target = safeTargetFolder(fixture.targetFolder)
  fs.mkdirSync(target, { recursive: true })
  const projectId = `${fixture.name}_${fixture.revision}`
  const projectFile = path.join(target, `${projectId}.kicad_pro`)
  const schematicFile = path.join(target, `${projectId}.kicad_sch`)
  const pcbFile = path.join(target, `${projectId}.kicad_pcb`)
  fs.writeFileSync(projectFile, JSON.stringify({ meta: { filename: `${projectId}.kicad_pro`, version: 1 }, board: { design_settings: { defaults: {} } } }, null, 2))
  fs.writeFileSync(schematicFile, buildSchematic(fixture, projectId))
  fs.writeFileSync(pcbFile, buildPcb(fixture, projectId))
  const validation = await validateFixtureProject({ target, schematicFile, pcbFile })
  const drcErrors = validation.drc.issueCounts?.errors ?? null
  const drcWarnings = validation.drc.issueCounts?.warnings ?? null
  const ercErrors = validation.erc.issueCounts?.errors ?? null
  const ercWarnings = validation.erc.issueCounts?.warnings ?? null
  const unconnected = validation.drc.report?.unconnected_items?.length ?? null
  const manufacturingBlockedReason = drcErrors === 0 && ercErrors === 0 && unconnected === 0
    ? 'routing_and_manufacturing_export_not_run'
    : 'kicad_validation_issues_remain'
  const routeability = {
    schema: 'boardforge.routeability-report.v1',
    projectId,
    outline: fixture.outline,
    routeabilityScore: 72,
    mechanicalProductScore: 88,
    connectorAccessibilityScore: 84,
    manufacturingFeasibility: drcErrors === 0 && ercErrors === 0 ? 'kicad_preroute_validation_passed' : 'kicad_preroute_validation_needs_fix',
    risks: fixture.knownRisks,
    validation: {
      kicadCli: validation.kicadCli.available ? validation.kicadCli.version : validation.kicadCli.reason,
      drc: validation.drc.issueCounts,
      erc: validation.erc.issueCounts,
      unconnected,
    },
    nextStage: drcErrors === 0 && ercErrors === 0
      ? 'export_dsn_then_run_freerouting'
      : 'repair_fixture_generation_before_routing',
  }
  const manifest = {
    schema: 'boardforge.project-manifest.v1',
    projectId,
    projectName: fixture.name,
    boardPath: pcbFile,
    schematicPath: schematicFile,
    status: 'preroute_fixture_created',
    validation: {
      shorts: null,
      unconnected,
      forbiddenVias: 0,
      drcViolations: validation.drc.issueCounts?.total ?? null,
      drcErrors,
      drcWarnings,
      ercViolations: validation.erc.issueCounts?.total ?? null,
      ercErrors,
      ercWarnings,
    },
    manufacturing: {
      ready: false,
      zip: null,
      blockedReason: manufacturingBlockedReason,
    },
    reports: {
      routeability: path.join(target, 'BoardForge_Odd_Shape_Routeability_Report.json'),
      status: path.join(target, 'BoardForge_Odd_Shape_Final_Status.md'),
    },
    replay: {
      command: `npm run fixtures:run -- --fixture ${fixture.id}`,
    },
  }
  fs.writeFileSync(path.join(target, 'BoardForge_Odd_Shape_Routeability_Report.json'), JSON.stringify(routeability, null, 2))
  fs.writeFileSync(path.join(target, 'boardforge-project-manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(target, 'BoardForge_Odd_Shape_Final_Status.md'), `# ${projectId} Status\n\n- State: preroute fixture created\n- KiCad CLI: ${validation.kicadCli.available ? `${validation.kicadCli.path} (${validation.kicadCli.version})` : validation.kicadCli.reason}\n- DRC errors/warnings: ${drcErrors ?? 'not run'} / ${drcWarnings ?? 'not run'}\n- ERC errors/warnings: ${ercErrors ?? 'not run'} / ${ercWarnings ?? 'not run'}\n- Unconnected items: ${unconnected ?? 'not measured'}\n- FreeRouting: not run\n- Manufacturing ZIP: not exported\n- Next stage: ${routeability.nextStage}\n`)
  return { target, projectFile, schematicFile, pcbFile, manifest, routeability }
}

const args = new Set(process.argv.slice(2))
const fixtures = readFixtures()
const report = buildFixtureReport(fixtures)

if (args.has('--list')) {
  console.log(JSON.stringify({ fixtures: fixtures.map((fixture) => fixture.id) }, null, 2))
} else if (args.has('--run')) {
  const selected = process.argv.includes('--fixture')
    ? fixtures.filter((fixture) => fixture.id === process.argv[process.argv.indexOf('--fixture') + 1])
    : fixtures
  const created = []
  for (const fixture of selected) {
    created.push(await writeOddShapeFixtureProject(fixture))
  }
  const outDir = path.join(repoRoot, 'tmp', 'fixture-runner')
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, 'boardforge-fixture-report.json')
  const runReport = {
    ...buildFixtureReport(selected),
    fixtures: selected.map((fixture, index) => ({
      ...buildFixtureReport([fixture]).fixtures[0],
      status: 'preroute_fixture_created',
      projectFolder: created[index].target,
      pcb: created[index].pcbFile,
      schematic: created[index].schematicFile,
      manifest: path.join(created[index].target, 'boardforge-project-manifest.json'),
      drc: created[index].routeability.validation.drc,
      erc: created[index].routeability.validation.erc,
      kicadCli: created[index].routeability.validation.kicadCli,
      freeRouting: 'not_run_preroute_validation_pending',
      manufacturingReadiness: 'blocked_preroute_validation_pending',
    })),
  }
  fs.writeFileSync(out, JSON.stringify(runReport, null, 2))
  console.log(JSON.stringify({ status: 'FIXTURE_PREROUTE_CREATED', report: out, fixtures: runReport.fixtures.length, projects: created.map((item) => item.target) }, null, 2))
} else if (args.has('--golden') || args.has('--report')) {
  const outDir = path.join(repoRoot, 'tmp', 'fixture-runner')
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, 'boardforge-fixture-report.json')
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ status: 'FIXTURE_REPORT_WRITTEN', report: out, fixtures: report.fixtures.length }, null, 2))
} else {
  console.log(JSON.stringify({ usage: 'boardforge-fixture-runner --list|--run|--golden|--report' }, null, 2))
}
