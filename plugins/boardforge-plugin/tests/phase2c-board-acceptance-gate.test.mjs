import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { evaluateBoardAcceptance } from '../lib/challenge/board-acceptance-gate.mjs'
import {TPS25750_SOURCE_VBUS_EQUIVALENCE} from '../lib/components/production-asset-pin-schema.mjs'

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bf-acceptance-'))
  const put = async (name, text) => { const file = path.join(dir, name); await writeFile(file, text); return file }
  const schematic = await put('board.kicad_sch', `(kicad_sch
    (symbol (lib_id "MCU_Test:REAL_MCU") (property "Reference" "U1") (pin "1" (uuid 00000000-0000-0000-0000-000000000001)))
  )`)
  const pcb = await put('board.kicad_pcb', `(kicad_pcb
    (footprint "Package_Test:REAL_QFN" (property "Reference" "U1")
      (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net "GND")))
  )`)
  const gerber = await put('board-F_Cu.gtl', 'G04 BoardForge production gerber*\n%FSLAX46Y46*%\nM02*')
  const drill = await put('board.drl', 'M48\nMETRIC\nT1C0.300\n%\nM30')
  const bom = await put('board-bom.csv', 'Refs,Value,Footprint,MPN\nU1,MCU,QFN,REAL-1')
  const cpl = await put('board-cpl.csv', 'Ref,PosX,PosY,Rot\nU1,1,2,0')
  const zip = path.join(dir, 'board.zip')
  const archive = new JSZip()
  archive.file('board-F_Cu.gtl', 'G04 production*')
  archive.file('board.drl', 'M48\nM30')
  archive.file('board-bom.csv', 'Refs,MPN\nU1,REAL-1')
  archive.file('board-cpl.csv', 'Ref,X,Y\nU1,1,2')
  await writeFile(zip, await archive.generateAsync({ type: 'nodebuffer' }))
  const sha = 'a'.repeat(64)
  return {
    project: { schematic, pcb },
    erc: { tool: 'kicad-cli', exitCode: 0, errors: 0, violations: 0, ignoredChecks: [], reportPath: 'erc.rpt', executedAt: '2026-07-15T00:00:00Z' },
    drc: { tool: 'kicad-cli', exitCode: 0, errors: 0, violations: 0, ignoredChecks: [], unconnectedItems: 0, reportPath: 'drc.rpt', executedAt: '2026-07-15T00:00:00Z' },
    manufacturing: { gerbers: [gerber], drill: [drill], bom, cpl, zip },
    sourcing: { rows: [{ mpn: 'REAL-1', providers: {
      digikey: { live: true, queriedAt: '2026-07-15T00:00:00Z', requestId: 'dk-1', stockStatus: 'IN_STOCK', quantityAvailable: 100 },
      mouser: { live: true, queriedAt: '2026-07-15T00:00:00Z', requestId: 'mo-1', stockStatus: 'IN_STOCK', quantityAvailable: 50 },
    } }] },
    assetBindings: { components: [{ ref:'U1',mpn:'REAL-1',exactMpnVerified:true,symbol:'MCU_Test:REAL_MCU',footprint:'Package_Test:REAL_QFN',pinMapVerified:true,symbolPinMap:{1:'GND'},footprintPadMap:{1:'GND'} }] },
    sourceProtection: { unchanged: true, beforeSha256: sha, afterSha256: sha },
    proof: { rustReparsePassed: true, structuralDiff: { changed: 1 } },
    metrics: { boardAreaMm2: 100, componentDensity: 0.1 },
  }
}

test('accepts only complete independently evidenced board', async () => {
  const result = await evaluateBoardAcceptance(await fixture())
  assert.equal(result.status, 'BOARD_ACCEPTED')
  assert.equal(result.blockers.length, 0)
})

test('rejects missing and fake live supplier evidence', async () => {
  const evidence = await fixture()
  evidence.sourcing.rows[0].providers.mouser = { live: false, stockStatus: 'IN_STOCK', quantityAvailable: 999 }
  const result = await evaluateBoardAcceptance(evidence)
  assert.equal(result.accepted, false)
  assert.ok(result.blockers.some(({ code }) => code === 'LIVE_MOUSER_EVERY_ROW'))
})

test('rejects claimed clean DRC without real CLI execution', async () => {
  const evidence = await fixture()
  evidence.drc = { errors: 0, violations: 0, unconnectedItems: 0 }
  const result = await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({ code }) => code === 'DRC_KICAD_CLI_EXECUTED'))
})

test('rejects clean-count KiCad reports that disabled an ignored check', async () => {
  const evidence = await fixture()
  evidence.erc.ignoredChecks = [{ key: 'footprint_filter', description: 'Assigned footprint does not match filters' }]
  const result = await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({ code }) => code === 'ERC_NO_IGNORED_CHECKS'))
})

test('rejects a large placeholder package and mismatched source hashes', async () => {
  const evidence = await fixture()
  await writeFile(evidence.manufacturing.zip, 'placeholder'.repeat(100))
  evidence.sourceProtection.afterSha256 = 'b'.repeat(64)
  const result = await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({ code }) => code === 'MANUFACTURING_ZIP_AUTHENTIC'))
  assert.ok(result.blockers.some(({ code }) => code === 'SOURCE_UNCHANGED'))
})

test('rejects warnings counted as a zero-error KiCad result', async () => {
  const evidence = await fixture()
  evidence.erc.violations = 1
  const result = await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({ code }) => code === 'ERC_ZERO_ERRORS'))
})

test('projection gate does not borrow a later pad net for an unnetted required pad',async()=>{
  const evidence=await fixture()
  await writeFile(evidence.project.pcb,`(kicad_pcb
    (footprint "Package_Test:REAL_QFN" (property "Reference" "U1")
      (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu"))
      (pad "2" smd rect (at 2 0) (size 1 1) (layers "F.Cu") (net "GND")))
  )`)
  const result=await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({code})=>code==='BINDINGS_PROJECTED_INTO_KICAD'))
})

test('projection gate rejects a literal null net instead of treating it as an NC assertion',async()=>{
  const evidence=await fixture()
  await writeFile(evidence.project.schematic,`(kicad_sch (symbol (lib_id "MCU_Test:REAL_MCU") (property "Reference" "U1") (pin "1" (uuid 00000000-0000-0000-0000-000000000001)) (pin "2" (uuid 00000000-0000-0000-0000-000000000002))))`)
  await writeFile(evidence.project.pcb,`(kicad_pcb (footprint "Package_Test:REAL_QFN" (property "Reference" "U1") (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net "GND")) (pad "2" smd rect (at 2 0) (size 1 1) (layers "F.Cu"))))`)
  evidence.assetBindings.components[0].symbolPinMap={1:'GND',2:null}
  evidence.assetBindings.components[0].footprintPadMap={1:'GND',2:null}
  const result=await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({code})=>code==='BINDINGS_PROJECTED_INTO_KICAD'))
})

test('projection gate rejects a silently connected expected NC pad',async()=>{
  const evidence=await fixture()
  await writeFile(evidence.project.schematic,`(kicad_sch (symbol (lib_id "MCU_Test:REAL_MCU") (property "Reference" "U1") (pin "1" (uuid 00000000-0000-0000-0000-000000000001)) (pin "2" (uuid 00000000-0000-0000-0000-000000000002))))`)
  await writeFile(evidence.project.pcb,`(kicad_pcb (footprint "Package_Test:REAL_QFN" (property "Reference" "U1") (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net "GND")) (pad "2" smd rect (at 2 0) (size 1 1) (layers "F.Cu") (net "VCC"))))`)
  evidence.assetBindings.components[0].expectedUnconnectedSymbolPins=['2']
  evidence.assetBindings.components[0].expectedUnconnectedFootprintPads=['2']
  const result=await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({code})=>code==='BINDINGS_PROJECTED_INTO_KICAD'))
})

test('projection gate accepts the exact TPS25750 source VBUS_IN physical-short policy',async()=>{
  const evidence=await fixture()
  await writeFile(evidence.project.schematic,`(kicad_sch (symbol (lib_id "BoardForge:TPS25750D") (property "Reference" "U2") (pin "23" (uuid 00000000-0000-0000-0000-000000000023))))`)
  await writeFile(evidence.project.pcb,`(kicad_pcb (footprint "Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4" (property "Reference" "U2") (pad "23" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net "VBUS"))))`)
  evidence.assetBindings.components=[{ref:'U2',mpn:'TPS25750DRJKR',exactMpnVerified:true,symbol:'BoardForge:TPS25750D',footprint:'Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4',pinMapVerified:true,symbolPinMap:{23:'VBUS'},footprintPadMap:{23:'VBUS_IN'},physicalNetEquivalencePolicy:TPS25750_SOURCE_VBUS_EQUIVALENCE}]
  const result=await evaluateBoardAcceptance(evidence)
  assert.ok(!result.blockers.some(({code})=>code==='BINDINGS_PROJECTED_INTO_KICAD'))
})

test('projection gate rejects the same net mismatch without the exact TPS25750 policy',async()=>{
  const evidence=await fixture()
  await writeFile(evidence.project.schematic,`(kicad_sch (symbol (lib_id "BoardForge:TPS25750D") (property "Reference" "U2") (pin "23" (uuid 00000000-0000-0000-0000-000000000023))))`)
  await writeFile(evidence.project.pcb,`(kicad_pcb (footprint "Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4" (property "Reference" "U2") (pad "23" smd rect (at 0 0) (size 1 1) (layers "F.Cu") (net "VBUS"))))`)
  evidence.assetBindings.components=[{ref:'U2',mpn:'TPS25750DRJKR',exactMpnVerified:true,symbol:'BoardForge:TPS25750D',footprint:'Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4',pinMapVerified:true,symbolPinMap:{23:'VBUS'},footprintPadMap:{23:'VBUS_IN'}}]
  const result=await evaluateBoardAcceptance(evidence)
  assert.ok(result.blockers.some(({code})=>code==='BINDINGS_PROJECTED_INTO_KICAD'))
})
