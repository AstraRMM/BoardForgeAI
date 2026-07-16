import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { approvedAssetFor } from '../lib/components/approved-production-assets.mjs'
import { planEsp32TopologyPowerFlags, planExternalConnectorPowerFlags } from '../lib/components/production-asset-pin-schema.mjs'
import { resolveAuthoritativeKiCadSymbol } from '../lib/components/authoritative-kicad-symbol-resolver.mjs'
import { detectKiCadCli, runErc } from '../lib/kicad-cli.mjs'
import { generateSchematicModel, kicadSchematicFromModel } from '../lib/schematic-generator.mjs'

const component=(ref,mpn,pinMap=approvedAssetFor(mpn).symbolPinMap)=>{
  const asset=approvedAssetFor(mpn)
  return {ref,value:mpn,group:'PRODUCTION_COMPONENT',symbol:asset.symbol.libId,footprint:asset.footprint.libId,pinMap,symbolPinMap:pinMap,forceProductionProjection:true}
}

test('NUP2105 production asset resolves to authoritative KiCad symbol and common-anode pin map',()=>{
  const asset=approvedAssetFor('NUP2105LT1G')
  const symbol=resolveAuthoritativeKiCadSymbol(asset.symbol.libId)
  assert.equal(asset.symbol.libId,'Power_Protection:NUP2105L')
  assert.deepEqual(asset.pinMap,{1:'CANH',2:'CANL',3:'GND'})
  assert.deepEqual(symbol.pinMap,{1:'K',2:'K',3:'A'})
  assert.equal(asset.pinSchema.valid,true)
})

test('power flags fail closed unless a named real source component drives the asserted rail',()=>{
  const components=[component('J1','USB4105-GF-A')]
  assert.throws(()=>generateSchematicModel({name:'empty-rail'},components,{powerFlags:[{rail:'',source:{ref:'J1',kind:'external'}}]}),/must name a driven rail/)
  assert.throws(()=>generateSchematicModel({name:'bad-source'},components,{powerFlags:[{rail:'VUSB',source:{ref:'J404',kind:'external'}}]}),/source component is missing/)
  assert.throws(()=>generateSchematicModel({name:'bad-source-net'},components,{nets:[{name:'3V3'}],powerFlags:[{rail:'3V3',source:{ref:'J1',kind:'external'}}]}),/source J1 is not connected/)
})

test('authoritative ESP32 schematic is accepted by real KiCad ERC with only source-backed flags',{skip:!existsSync('C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe'),timeout:120000},async()=>{
  const components=[
    component('U1','ESP32-S3-WROOM-1U-N8R8'),
    component('J1','USB4105-GF-A'),
    component('U2','MCP1700T-3302E/TT'),
    component('J2','M20-9990645'),
    component('R1','RC0603FR-075K1L',{1:'CC1',2:'GND'}),
    component('R2','RC0603FR-075K1L',{1:'CC2',2:'GND'}),
  ]
  const nets=[...new Set(components.flatMap(row=>Object.values(row.pinMap)))].map(name=>({name}))
  const model=generateSchematicModel({name:'authoritative-erc-pilot'},components,{nets,emitConnectivityLabels:true,powerFlags:planEsp32TopologyPowerFlags()})
  assert.deepEqual(model.powerFlags.map(row=>row.rail),['VUSB','GND'])
  assert.ok(model.powerFlags.every(row=>row.source?.ref))
  const dir=await mkdtemp(path.join(os.tmpdir(),'boardforge-authoritative-erc-'))
  try{
    const sch=path.join(dir,'pilot.kicad_sch'),report=path.join(dir,'erc.json')
    await writeFile(sch,kicadSchematicFromModel({name:'authoritative-erc-pilot'},model),'utf8')
    const cli=await detectKiCadCli(),result=await runErc({schFile:sch,outputFile:report,kicadCliPath:cli.path})
    assert.equal(result.exitCode,0,`${result.stderr}\n${await readFile(report,'utf8')}`)
    assert.deepEqual(result.issueCounts,{errors:0,warnings:0})
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('authoritative STM32 controller schematic has real KiCad ERC zero with J1-backed external power flags',{skip:!existsSync('C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe'),timeout:120000},async()=>{
  const components=[
    component('U1','STM32F103C8T6',{23:'GND',24:'3V3'}),
    component('U3','MCP1700T-3302E/TT',{1:'GND',2:'3V3',3:'5V'}),
    component('J1','M20-9990245'),
  ]
  const nets=[...new Set(components.flatMap(row=>Object.values(row.pinMap)))].map(name=>({name}))
  const model=generateSchematicModel({name:'authoritative-stm32-controller'},components,{nets,emitConnectivityLabels:true,powerFlags:planExternalConnectorPowerFlags()})
  const dir=await mkdtemp(path.join(os.tmpdir(),'boardforge-authoritative-stm32-erc-'))
  try{
    const sch=path.join(dir,'stm32.kicad_sch'),report=path.join(dir,'erc.json')
    await writeFile(sch,kicadSchematicFromModel({name:'authoritative-stm32-controller'},model),'utf8')
    const cli=await detectKiCadCli(),result=await runErc({schFile:sch,outputFile:report,kicadCliPath:cli.path})
    assert.equal(result.exitCode,0,`${result.stderr}\n${await readFile(report,'utf8')}`)
    assert.deepEqual(result.issueCounts,{errors:0,warnings:0})
  }finally{await rm(dir,{recursive:true,force:true})}
})
