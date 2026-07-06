import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { generatePresetOutline, getOutlinePreset, listOutlinePresets, buildMechanicalConstraints } from './outline-presets.mjs'
import { validateCustomOutline, normalizePoints } from './outline-validator.mjs'
import { writeKiCadPcbText, writeKiCadProjectText, writeKiCadSchematicText } from './edgecuts-writer.mjs'

export function outlinePresetsResponse() {
  return {
    schema: 'boardforge.outline-presets-response.v1',
    presets: listOutlinePresets(),
  }
}

export function createOutlineSeed(payload = {}) {
  const preset = getOutlinePreset(payload.preset || payload.mode || 'rounded-rectangle')
  const generated = payload.points?.length
    ? {
      schema: 'boardforge.custom-outline-preset.v2',
      preset,
      points: normalizePoints(payload.points),
      holes: payload.holes || [],
      connectorEdges: payload.connectorEdges || [],
      keepouts: payload.keepouts || [],
      components: payload.components || [],
    }
    : generatePresetOutline(preset.id, payload)
  const constraints = buildMechanicalConstraints({
    density: payload.density || 'compact',
    shape: preset.id,
    targetSizeMm: { maxWidth: payload.widthMm || preset.widthMm, maxHeight: payload.heightMm || preset.heightMm },
    holes: generated.holes,
    connectorEdgePreferences: generated.connectorEdges,
    keepouts: generated.keepouts,
    components: generated.components,
    ...(payload.constraints || {}),
  })
  return {
    schema: 'boardforge.custom-outline-project-seed.v2',
    id: payload.id || `BF-OUTLINE-${preset.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REV-A`,
    preset,
    outline: generated.points,
    holes: generated.holes,
    connectorEdges: generated.connectorEdges,
    keepouts: generated.keepouts,
    components: generated.components,
    constraints,
    prompt: payload.prompt || `Generate a KiCad outline-only project using the ${preset.name} BoardForge outline seed.`,
  }
}

export function validateOutlineSeed(seed) {
  return validateCustomOutline({
    points: seed.outline || seed.points,
    holes: seed.holes,
    connectorEdges: seed.connectorEdges,
    keepouts: seed.keepouts,
    components: seed.components,
    constraints: seed.constraints,
  })
}

export async function writeOutlineProjectArtifacts({ projectDir, seed, validation, generateSchematic = true, layerCount = 2 }) {
  await mkdir(projectDir, { recursive: true })
  const projectName = safeProjectName(seed.id || 'BoardForge_Custom_Outline')
  const paths = {
    seed: path.join(projectDir, 'BoardForge_Custom_Outline_Project_Seed.json'),
    constraints: path.join(projectDir, 'BoardForge_Mechanical_Constraints.json'),
    validationJson: path.join(projectDir, 'BoardForge_Outline_Validation_Report.json'),
    validationMd: path.join(projectDir, 'BoardForge_Outline_Validation_Report.md'),
    routeabilityJson: path.join(projectDir, 'BoardForge_Routeability_Explanation.json'),
    routeabilityMd: path.join(projectDir, 'BoardForge_Routeability_Explanation.md'),
    manufacturingJson: path.join(projectDir, 'BoardForge_Manufacturing_Risk_Report.json'),
    manufacturingMd: path.join(projectDir, 'BoardForge_Manufacturing_Risk_Report.md'),
    previewSvg: path.join(projectDir, 'BoardForge_Board_Preview.svg'),
    previewJson: path.join(projectDir, 'BoardForge_Board_Preview.json'),
    manifest: path.join(projectDir, 'BoardForge_Project_Manifest.json'),
    userReport: path.join(projectDir, 'BoardForge_User_Facing_Report.md'),
    replay: path.join(projectDir, 'BoardForge_CLI_Replay_Command.txt'),
    kicadPro: path.join(projectDir, `${projectName}.kicad_pro`),
    kicadPcb: path.join(projectDir, `${projectName}.kicad_pcb`),
    kicadSch: path.join(projectDir, `${projectName}.kicad_sch`),
  }

  const cleanForKiCad = validation.valid && !validation.status.startsWith('BLOCKED')
  await writeFile(paths.seed, JSON.stringify(seed, null, 2), 'utf8')
  await writeFile(paths.constraints, JSON.stringify(seed.constraints, null, 2), 'utf8')
  await writeFile(paths.validationJson, JSON.stringify(validation, null, 2), 'utf8')
  await writeFile(paths.validationMd, outlineValidationMarkdown({ seed, validation }), 'utf8')
  await writeFile(paths.routeabilityJson, JSON.stringify(validation.routeability, null, 2), 'utf8')
  await writeFile(paths.routeabilityMd, routeabilityMarkdown({ seed, validation }), 'utf8')
  await writeFile(paths.manufacturingJson, JSON.stringify(validation.manufacturingRisk, null, 2), 'utf8')
  await writeFile(paths.manufacturingMd, manufacturingMarkdown({ seed, validation }), 'utf8')
  await writeFile(paths.previewJson, JSON.stringify({ outline: seed.outline, holes: seed.holes, validation }, null, 2), 'utf8')
  await writeFile(paths.previewSvg, previewSvg({ seed, validation }), 'utf8')
  await writeFile(paths.replay, replayCommand({ seed, projectDir }), 'utf8')

  if (cleanForKiCad) {
    await writeFile(paths.kicadPro, writeKiCadProjectText({ projectName }), 'utf8')
    if (generateSchematic) await writeFile(paths.kicadSch, writeKiCadSchematicText({ projectName }), 'utf8')
    await writeFile(paths.kicadPcb, writeKiCadPcbText({ projectName, points: seed.outline, holes: seed.holes, layerCount }), 'utf8')
  }

  const manifest = {
    schema: 'boardforge.project-manifest.custom-outline.v2',
    projectId: seed.id,
    projectDir,
    projectState: cleanForKiCad ? 'OUTLINE_KICAD_PROJECT_READY' : 'OUTLINE_BLOCKED_BEFORE_KICAD',
    outline: {
      preset: seed.preset,
      pointCount: seed.outline.length,
      status: validation.status,
      routeabilityScore: validation.routeability.score,
      manufacturingRisk: validation.manufacturingRisk,
    },
    validation: {
      outline: validation,
      erc: cleanForKiCad && generateSchematic ? { status: 'NOT_RUN', reason: 'outline-only schematic generated; run KiCad CLI for evidence' } : { status: 'NOT_APPLICABLE' },
      drc: cleanForKiCad ? { status: 'NOT_RUN', reason: 'Edge.Cuts project generated; run KiCad DRC before manufacturing export' } : { status: 'BLOCKED', reason: validation.status },
    },
    manufacturing: {
      state: cleanForKiCad ? 'OUTLINE_PACKAGE_READY_FOR_LOCAL_DRC' : 'BLOCKED_OUTLINE_NOT_EXPORTED',
      fakeClaims: false,
      zipGenerated: false,
    },
    files: Object.fromEntries(Object.entries(paths).filter(([key]) => cleanForKiCad || !['kicadPro', 'kicadPcb', 'kicadSch'].includes(key))),
  }
  await writeFile(paths.manifest, JSON.stringify(manifest, null, 2), 'utf8')
  await writeFile(paths.userReport, userReportMarkdown({ manifest, seed, validation, cleanForKiCad }), 'utf8')
  return { status: manifest.projectState, seed, validation, manifest, artifactPaths: Object.values(manifest.files) }
}

export async function generateOutlineKiCadProject(payload = {}) {
  const seed = payload.seed || createOutlineSeed(payload)
  const validation = payload.validation || validateOutlineSeed(seed)
  if (!validation.valid && !payload.devOverride) {
    const projectDir = payload.projectDir || path.join(process.cwd(), seed.id)
    return writeOutlineProjectArtifacts({ projectDir, seed, validation, generateSchematic: false, layerCount: payload.layerCount || 2 })
  }
  const projectDir = payload.projectDir || path.join(process.cwd(), seed.id)
  return writeOutlineProjectArtifacts({ projectDir, seed, validation, generateSchematic: payload.generateSchematic !== false, layerCount: payload.layerCount || 2 })
}

export async function readOutlineStatus(projectDir) {
  const manifestPath = path.join(projectDir, 'BoardForge_Project_Manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  return {
    status: 'BOARD_FORGE_OUTLINE_STATUS',
    manifest,
    exists: await fileExists(manifestPath),
  }
}

export async function readOutlineReports(projectDir) {
  const manifest = await readOutlineStatus(projectDir)
  const reportFiles = Object.entries(manifest.manifest.files || {}).filter(([key]) => /Report|routeability|manufacturing|preview|manifest|replay/i.test(key))
  return {
    status: 'BOARD_FORGE_OUTLINE_REPORTS',
    reports: Object.fromEntries(reportFiles),
  }
}

function outlineValidationMarkdown({ seed, validation }) {
  return `# BoardForge Outline Validation Report

- Project: ${seed.id}
- Preset: ${seed.preset.name}
- Status: ${validation.status}
- Area: ${Math.round(validation.areaMm2)} mm^2
- Edge.Cuts closed: ${validation.edgeCuts.closed}
- Edge.Cuts segments: ${validation.edgeCuts.segmentCount}
- Self intersections: ${validation.edgeCuts.selfIntersections.length}
- Routeability score: ${validation.routeability.score}
- Manufacturing risk: ${validation.manufacturingRisk.level} (${validation.manufacturingRisk.score})

## Blockers
${validation.blockers.length ? validation.blockers.map((item) => `- ${item}`).join('\n') : '- none'}

## Warnings
${validation.warnings.length ? validation.warnings.map((item) => `- ${item}`).join('\n') : '- none'}
`
}

function routeabilityMarkdown({ validation }) {
  return `# BoardForge Routeability Explanation

- Score: ${validation.routeability.score}
- Recommendation: ${validation.routeability.recommendation}
- Penalty: ${validation.routeability.penalty}

This is a pre-layout mechanical routeability screen. It does not claim routing success; it flags outline geometry that may make routing difficult before Codex/BoardForge places components and runs KiCad DRC.
`
}

function manufacturingMarkdown({ validation }) {
  return `# BoardForge Manufacturing Risk Report

- Risk level: ${validation.manufacturingRisk.level}
- Score: ${validation.manufacturingRisk.score}
- Blocks export: ${validation.manufacturingRisk.blocksExport}

Blocked outlines do not produce a normal KiCad project unless a developer override is explicitly used.
`
}

function userReportMarkdown({ manifest, seed, validation, cleanForKiCad }) {
  return `# BoardForge Custom Board Result

BoardForge ${cleanForKiCad ? 'created an outline-only KiCad project' : 'blocked KiCad generation'} for **${seed.preset.name}**.

- Status: ${validation.status}
- Project state: ${manifest.projectState}
- KiCad generated: ${cleanForKiCad}
- Fake manufacturing claims: false

## Codex Plugin Prompt

\`\`\`text
Use BoardForge to open the outline seed at ${manifest.files.seed}. Generate the PCB project from this exact outline, preserve all Edge.Cuts points, mounting holes, connector-edge intent, keepouts, and mechanical constraints. Run KiCad DRC/ERC before claiming manufacturability.
\`\`\`
`
}

function previewSvg({ seed, validation }) {
  const points = seed.outline
  const minX = Math.min(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxX = Math.max(...points.map((p) => p.x))
  const maxY = Math.max(...points.map((p) => p.y))
  const pad = 6
  const width = maxX - minX + pad * 2
  const height = maxY - minY + pad * 2
  const poly = points.map((p) => `${p.x - minX + pad},${p.y - minY + pad}`).join(' ')
  const holes = seed.holes.map((h) => `<circle cx="${h.x - minX + pad}" cy="${h.y - minY + pad}" r="${Math.max(1.2, (h.diameterMm || 2.2) / 2)}" fill="none" stroke="#f9d949" stroke-width="0.5" />`).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="900" height="620" role="img" aria-label="BoardForge outline preview">
  <rect width="100%" height="100%" fill="#031312"/>
  <polygon points="${poly}" fill="#126d61" stroke="${validation.valid ? '#7cf5d0' : '#ff6b6b'}" stroke-width="0.9"/>
  ${holes}
  <text x="${pad}" y="${height - 3}" fill="#baf7e8" font-size="3.6">${seed.id} - ${validation.status}</text>
</svg>
`
}

function replayCommand({ seed, projectDir }) {
  return `node plugins/boardforge-plugin/bin/boardforge-custom-outline.mjs --preset ${seed.preset.id} --project-dir "${projectDir}"`
}

function safeProjectName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'BoardForge_Custom_Outline'
}

async function fileExists(file) {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}
