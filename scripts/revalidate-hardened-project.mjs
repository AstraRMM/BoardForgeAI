import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { productionAssetBindings, runPhase2cManufacturingPipeline } from '../plugins/boardforge-plugin/lib/phase2c/manufacturing-pipeline.mjs'

const execFile=promisify(execFileCallback),value=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1]}
const projectDir=path.resolve(value('--project-dir')||'')
const area=Number(value('--area-mm2'))
if(!value('--project-dir')||!Number.isFinite(area)||area<=0)throw new Error('--project-dir and positive --area-mm2 are required')
const files=await readdir(projectDir),schematicFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_sch'))||''),pcbFile=path.join(projectDir,files.find(name=>name.endsWith('.kicad_pcb'))||'')
const [sourcing,bindingReport]=await Promise.all([readFile(path.join(projectDir,'BoardForge_Make_Sourcable_Report.json'),'utf8').then(JSON.parse),readFile(path.join(projectDir,'BoardForge_Schematic_Asset_Binding_Report.json'),'utf8').then(JSON.parse)])
if(sourcing.status!=='SOURCING_LIVE_VERIFIED')throw new Error(`Fresh live sourcing report required; got ${sourcing.status}`)
const rustCli=path.resolve(import.meta.dirname,'..','rust','target','debug','boardforge-kicad.exe'),sourceBytes=(await readFile(pcbFile)).length
const normalized=await execFile(rustCli,['normalize',pcbFile],{maxBuffer:50*1024*1024}),proof={rustReparsePassed:normalized.stdout.length>0,structuralDiff:{sourceBytes,normalizedBytes:normalized.stdout.length}}
const manufacturing=await runPhase2cManufacturingPipeline({projectDir,schematicFile,pcbFile,sourcing,assetBindings:productionAssetBindings(bindingReport),proof,metrics:{boardAreaMm2:area,componentDensity:sourcing.rows.length/area},unconnectedItems:0})
const result={schema:'boardforge.hardened-project-revalidation.v1',generatedAt:new Date().toISOString(),projectDir,sourcingStatus:sourcing.status,manufacturing}
await writeFile(path.join(projectDir,'BoardForge_Hardened_Project_Revalidation.json'),JSON.stringify(result,null,2)+'\n','utf8')
console.log(JSON.stringify({projectDir,sourcingStatus:sourcing.status,status:manufacturing.status,accepted:manufacturing.acceptance?.accepted,blockers:manufacturing.acceptance?.blockers||[]},null,2))
if(manufacturing.acceptance?.accepted!==true)process.exitCode=2
