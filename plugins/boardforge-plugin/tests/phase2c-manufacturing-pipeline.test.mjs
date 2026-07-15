import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { challengeResumeAfterAcceptance, runPhase2cManufacturingPipeline } from '../lib/phase2c/manufacturing-pipeline.mjs'

async function setup({dirty=false}={}) {
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-phase2c-mfg-')),sch=path.join(root,'pilot.kicad_sch'),pcb=path.join(root,'pilot.kicad_pcb')
  await writeFile(sch,'(kicad_sch '.padEnd(80,')')); await writeFile(pcb,'(kicad_pcb '.padEnd(80,')'))
  let exportsCalled=0
  const emit=async(target,name,text)=>{await mkdir(path.extname(target)?path.dirname(target):target,{recursive:true});const file=path.extname(target)?target:path.join(target,name);await writeFile(file,text);return file}
  const adapters={
    detectKiCadCli:async()=>({available:true,path:'kicad-cli',version:'test'}),
    runErc:async({outputFile})=>{await emit(outputFile,'','{}');return {exitCode:0,issueCounts:{errors:0,warnings:0}}},
    runDrc:async({outputFile,saveBoard})=>{assert.equal(saveBoard,false);await emit(outputFile,'','{}');return {exitCode:dirty?5:0,issueCounts:{errors:dirty?1:0,warnings:0}}},
    exportGerbers:async({outputDir})=>{exportsCalled++;const f=await emit(outputDir,'pilot-F_Cu.gtl','G04 production*\nM02*');return {exitCode:0,files:[f]}},
    exportDrill:async({outputDir})=>{const f=await emit(outputDir,'pilot.drl','M48\nMETRIC\nT1C0.300\n%\nM30');return {exitCode:0,files:[f]}},
    exportBom:async({outputFile})=>{const f=await emit(outputFile,'','Refs,MPN\nU1,REAL-1');return {exitCode:0,files:[f]}},
    exportCpl:async({outputFile})=>{const f=await emit(outputFile,'','Ref,PosX,PosY,Rotation,Side\nU1,1.0,2.0,0,top');return {exitCode:0,files:[f]}},
    packageJlcpcb:async({outputFile,requiredFiles})=>{const z=new JSZip();for(const f of requiredFiles)z.file(path.basename(f),await import('node:fs/promises').then(x=>x.readFile(f)));await writeFile(outputFile,await z.generateAsync({type:'nodebuffer'}));return {status:'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW',outputFile}},
  }
  const sha='a'.repeat(64)
  const input={projectDir:root,schematicFile:sch,pcbFile:pcb,unconnectedItems:0,sourcing:{rows:[{mpn:'REAL-1',providers:{digikey:{live:true,queriedAt:'now',requestId:'d',stockStatus:'IN_STOCK',quantityAvailable:1},mouser:{live:true,queriedAt:'now',requestId:'m',stockStatus:'IN_STOCK',quantityAvailable:1}}}]},proof:{rustReparsePassed:true,structuralDiff:{changed:1}},metrics:{boardAreaMm2:100,componentDensity:.1},acceptanceOptions:{requireInStock:true}}
  return {input,adapters,get exportsCalled(){return exportsCalled}}
}

test('pipeline exports authentic artifact set, hashes it, accepts, then permits resume',async()=>{
  const x=await setup(),result=await runPhase2cManufacturingPipeline(x.input,x.adapters)
  assert.equal(result.status,'MANUFACTURING_ACCEPTED',JSON.stringify(result.acceptance.blockers)); assert.equal(result.acceptance.accepted,true)
  assert.equal(result.artifacts.length,7); assert.ok(result.artifacts.every(row=>row.bytes>0&&row.sha256.length===64))
  assert.equal(result.sourceProtection.unchanged,true); assert.equal(result.resume.allowed,true)
})
test('dirty validation stops before manufacturing export and cannot resume',async()=>{
  const x=await setup({dirty:true}),result=await runPhase2cManufacturingPipeline(x.input,x.adapters)
  assert.equal(result.status,'ERC_DRC_NOT_CLEAN'); assert.equal(x.exportsCalled,0); assert.equal(result.resume.allowed,false)
})
test('challenge resume is impossible for a rejected or missing acceptance result',()=>{
  assert.equal(challengeResumeAfterAcceptance({accepted:false}).command,null)
  assert.equal(challengeResumeAfterAcceptance().allowed,false)
})
