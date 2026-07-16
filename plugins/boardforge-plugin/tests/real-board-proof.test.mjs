import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { REAL_BOARD_PROOF_BOARDS, runRealBoardProof } from '../lib/real-board-proof.mjs'

test('real board proof writes real KiCad category symbol graphs without fake manufacturing packages', async () => {
  const tempParent = await mkdtemp(path.join(os.tmpdir(), 'BoardForge_Real_Board_Proofs_Test_'))
  const outputRoot = path.join(tempParent, 'BoardForge_Real_Board_Proofs')
  try {
    const summary = await runRealBoardProof({ outputRoot, fresh: true })
    assert.equal(summary.boardsAttempted, REAL_BOARD_PROOF_BOARDS.length)
    assert.equal(summary.manufacturingReady, 0)
    assert.equal(summary.protectedFilesTouched.length, 0)
    assert.ok(summary.lessonsSaved.includes('real_board_full_category_generation_gap_001'))
    assert.ok(summary.lessonsSaved.includes('real_board_category_pcb_evidence_writer_001'))
    assert.ok(summary.lessonsSaved.includes('real_board_drone_stack_single_mounting_pattern_fix_001'))

    for (const board of summary.boards) {
      assert.ok(existsSync(board.outputFolder), `${board.boardId} output folder exists`)
      assert.ok(board.kicadProjectValid, `${board.boardId} has .kicad_pro and .kicad_pcb`)
      assert.ok(board.schematicValid, `${board.boardId} has .kicad_sch`)
      assert.ok(board.edgeCutsValid, `${board.boardId} has valid Edge.Cuts`)
      assert.notEqual(board.finalStatus, 'PASS_MANUFACTURING_READY')
      assert.equal(board.finalStatus, 'PASS_ENGINEERING_REVIEW_REQUIRED')
      assert.equal(board.manufacturingPackage.status, 'NOT_GENERATED')

      for (const required of [
        'BoardForge_Board_Brief.json',
        'BoardForge_Project_Manifest.json',
        'BoardForge_Mechanical_Constraints.json',
        'BoardForge_Outline_Validation_Report.json',
        'BoardForge_Routeability_Explanation.json',
        'BoardForge_Category_Generation_Readiness_Report.json',
        'BoardForge_Schematic_Asset_Binding_Report.json',
        'BoardForge_Manufacturing_Risk_Report.json',
        'BoardForge_Board_Review_Report.json',
        'BoardForge_Project_Health_Report.json',
        'BoardForge_Make_Manufacturable_Report.json',
        'BoardForge_CLI_Replay_Command.txt',
        'BoardForge_Evidence_Record.json',
      ]) {
        assert.ok(existsSync(path.join(board.outputFolder, required)), `${board.boardId} wrote ${required}`)
      }

      const evidence = JSON.parse(await readFile(path.join(board.outputFolder, 'BoardForge_Evidence_Record.json'), 'utf8'))
      assert.equal(evidence.fakeClaims, false)
      assert.equal(evidence.manufacturingPackage.status, 'NOT_GENERATED')
      assert.ok(evidence.categoryGeneration)

      const requested = REAL_BOARD_PROOF_BOARDS.find((item) => item.id === board.boardId)
      assert.ok(requested)
      if (!requested.bom.length) {
        assert.equal(evidence.categoryGeneration.status, 'OUTLINE_ONLY_BOARD_NO_CATEGORY_COMPONENTS_REQUIRED')
        continue
      }

      assert.ok(existsSync(path.join(board.outputFolder, 'BoardForge_Category_Schematic_Model.json')))
      assert.equal(evidence.assetBinding.status, 'ASSET_BINDINGS_REVIEW_REQUIRED')
      assert.equal(evidence.assetBinding.manufacturingAllowed, false)
      assert.equal(evidence.assetBinding.components.length, requested.bom.length)
      assert.equal(evidence.assetBinding.catalogCandidateSummary.requested, requested.bom.length)
      assert.ok(evidence.assetBinding.catalogCandidateSummary.locallyResolvedSymbolAndFootprint > 0, `${board.boardId} records locally installed KiCad candidates`)
      assert.ok(evidence.assetBinding.components.some((component) => component.catalogCandidate?.candidateOnly), `${board.boardId} keeps catalog matches explicitly non-authoritative`)
      assert.equal(evidence.categorySchematic.status, 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED')
      assert.equal(evidence.categoryGeneration.summary.schematicSymbolInstances, requested.bom.length)
      assert.ok(evidence.categoryGeneration.summary.schematicNamedNets > 0)
      assert.notEqual(evidence.erc.status, 'ERC_COMMAND_FAILED')
      assert.ok(!board.blockers.some((item) => item.code === 'SCHEMATIC_SYMBOL_GRAPH_NOT_GENERATED'))
      assert.ok(board.blockers.some((item) => item.code === 'UNVERIFIED_SYMBOL_FOOTPRINT_PINMAP_BINDINGS'))
      assert.ok(existsSync(path.join(board.outputFolder, 'BoardForge_Category_PCB_Evidence_Report.json')))
    }

    const industrial = summary.boards.find((item) => item.boardId === 'industrial-io-board')
    assert.ok(industrial)
    assert.ok(industrial.blockers.some((item) => item.code === 'EXPECTED_REFS_MISSING_FROM_PCB'))

    const drone = summary.boards.find((item) => item.boardId === 'drone-stack-board')
    assert.ok(drone)
    assert.equal(drone.drc.errors, 0, 'drone stack should not carry mixed stack-pattern DRC errors')
    const droneOutline = JSON.parse(await readFile(path.join(drone.outputFolder, 'BoardForge_Outline_Validation_Report.json'), 'utf8'))
    assert.equal(droneOutline.holes.length, 4, 'drone stack uses one four-hole mounting pattern')
    assert.deepEqual([...new Set(droneOutline.holes.map((hole) => hole.patternMm))], [30.5])
  } finally {
    await rm(tempParent, { recursive: true, force: true })
  }
})

test('pilot projects canonical production assets into actual KiCad sources', async () => {
  const tempParent = await mkdtemp(path.join(os.tmpdir(), 'BoardForge_Real_Board_Proofs_Canonical_Test_'))
  try {
    const summary = await runRealBoardProof({
      outputRoot: path.join(tempParent, 'proof'), fresh: true, board: 'usb-c-esp32-sensor',
      canonicalBindingResolver: async ({ row, candidate }) => ({
        schema: 'boardforge.component-binding.v1', bindingId: 'a'.repeat(64), requirementId: `pilot-${row.ref}`,
        ref: row.ref, logicalRole: row.role, manufacturerPartNumber: row.mpn, manufacturer: 'verified-test-manufacturer',
        assets: { symbol: candidate.symbol, footprint: candidate.footprint, model3d: candidate.model3d || null },
        pinMap: candidate.pinMap, supplierEvidence: { provider: 'digikey', matchType: 'exact', status: 'VERIFIED_IN_STOCK', checkedAt: new Date().toISOString(), live: true },
      }),
    })
    const board = summary.boards[0]
    const report = JSON.parse(await readFile(path.join(board.outputFolder, 'BoardForge_Schematic_Asset_Binding_Report.json'), 'utf8'))
    assert.equal(report.components.find((row) => row.ref === 'U1').canonicalBinding.status, 'BOUND')
    assert.equal(report.components.find((row) => row.ref === 'U1').canonicalBinding.projections.bom.bindingId, 'a'.repeat(64))
    assert.equal(report.canonicalBindingStatus, 'CANONICAL_BINDINGS_COMPLETE')
    const files=await readdir(board.outputFolder)
    const sch=await readFile(path.join(board.outputFolder,files.find(name=>name.endsWith('.kicad_sch'))),'utf8')
    const pcb=await readFile(path.join(board.outputFolder,files.find(name=>name.endsWith('.kicad_pcb'))),'utf8')
    assert.doesNotMatch(sch,/\(lib_id "BoardForge:BF_CONN/)
    assert.doesNotMatch(pcb,/ReviewRequired/)
    assert.match(pcb,/\(pad "41" thru_hole circle/,'authoritative ESP32 thermal/ground pad 41 must be projected')
    assert.match(pcb,/\(drill 1\)/,'authoritative drilled package geometry must be preserved')
    assert.match(pcb,/\(footprint "ESP32-S3-WROOM-1U"/,'compact external-antenna package must be projected')
    const placement=JSON.parse(await readFile(path.join(board.outputFolder,'BoardForge_Category_PCB_Evidence_Report.json'),'utf8'))
    assert.equal(placement.placement.resolvedBeforeRouting,true)
    assert.deepEqual(placement.placement.refs,['U1','J1','U2','J2','R1','R2'])
    assert.equal(placement.authoritativeRouting.status,'CANDIDATE_PROMOTED','authoritative projected routing must pass real KiCad before promotion')
    assert.equal(placement.authoritativeRouting.drc.issueCounts.errors,0)
    assert.equal(board.drc.errors,0,'promoted canonical pilot must remain DRC clean after final KiCad validation')
    const preview=JSON.parse(await readFile(path.join(board.outputFolder,'BoardForge_Board_Preview.json'),'utf8'))
    assert.equal(preview.validation.areaMm2,882,'representative production topology must remain below the 900 mm2 cap')
    for(const component of report.components){
      assert.match(sch,new RegExp(`\\(lib_id "${component.symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"\\)`))
      assert.match(pcb,new RegExp(`\\(footprint "(?:[^"\\n]+:)?${component.footprint.split(':').at(-1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`))
    }
  } finally { await rm(tempParent, { recursive: true, force: true }) }
})
