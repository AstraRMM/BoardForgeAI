import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { evaluateBoardAcceptance } from '../lib/challenge/board-acceptance-gate.mjs'

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bf-acceptance-'))
  const put = async (name, text) => { const file = path.join(dir, name); await writeFile(file, text); return file }
  const schematic = await put('board.kicad_sch', '(kicad_sch '.padEnd(80, ')'))
  const pcb = await put('board.kicad_pcb', '(kicad_pcb '.padEnd(80, ')'))
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
    erc: { tool: 'kicad-cli', exitCode: 0, errors: 0, violations: 0, reportPath: 'erc.rpt', executedAt: '2026-07-15T00:00:00Z' },
    drc: { tool: 'kicad-cli', exitCode: 0, errors: 0, violations: 0, unconnectedItems: 0, reportPath: 'drc.rpt', executedAt: '2026-07-15T00:00:00Z' },
    manufacturing: { gerbers: [gerber], drill: [drill], bom, cpl, zip },
    sourcing: { rows: [{ mpn: 'REAL-1', providers: {
      digikey: { live: true, queriedAt: '2026-07-15T00:00:00Z', requestId: 'dk-1', stockStatus: 'IN_STOCK', quantityAvailable: 100 },
      mouser: { live: true, queriedAt: '2026-07-15T00:00:00Z', requestId: 'mo-1', stockStatus: 'IN_STOCK', quantityAvailable: 50 },
    } }] },
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
