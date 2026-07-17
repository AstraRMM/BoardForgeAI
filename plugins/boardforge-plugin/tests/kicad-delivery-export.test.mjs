import test from'node:test'
import assert from'node:assert/strict'
import os from'node:os'
import path from'node:path'
import {mkdtemp,mkdir,writeFile,readdir}from'node:fs/promises'
import{auditKiCadDeliveryRoot,exportAcceptedKiCadProject}from'../lib/phase2c/kicad-delivery-export.mjs'

test('accepted delivery contains only one directly openable KiCad project',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'bf-kicad-delivery-')),source=path.join(tmp,'source'),delivery=path.join(tmp,'delivery');await mkdir(source);await mkdir(delivery)
 for(const extension of['.kicad_pro','.kicad_sch','.kicad_pcb','.kicad_dru'])await writeFile(path.join(source,`BOARD${extension}`),'valid-kicad-fixture')
 await writeFile(path.join(source,'BoardForge_Report.json'),'must-not-ship');await mkdir(path.join(source,'Evidence'))
 const result=await exportAcceptedKiCadProject({boardId:'001_TEST_BOARD',projectDir:source,deliveryRoot:delivery})
 assert.deepEqual(result.files,['BOARD.kicad_dru','BOARD.kicad_pcb','BOARD.kicad_pro','BOARD.kicad_sch'])
 assert.deepEqual((await readdir(result.destination)).sort(),result.files)
 assert.equal((await auditKiCadDeliveryRoot(delivery)).ok,true)
})

test('delivery rejects incomplete or mismatched KiCad projects',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'bf-kicad-delivery-bad-')),source=path.join(tmp,'source'),delivery=path.join(tmp,'delivery');await mkdir(source);await mkdir(delivery)
 await writeFile(path.join(source,'A.kicad_pro'),'x');await writeFile(path.join(source,'B.kicad_sch'),'x');await writeFile(path.join(source,'A.kicad_pcb'),'x')
 await assert.rejects(exportAcceptedKiCadProject({boardId:'002_BAD_BOARD',projectDir:source,deliveryRoot:delivery}),/BASENAME_MISMATCH/)
})
