import path from 'node:path'
import {copyFile,mkdir,readdir,rm,rename,stat} from 'node:fs/promises'

export const KICAD_DELIVERY_EXTENSIONS=Object.freeze(new Set(['.kicad_pro','.kicad_sch','.kicad_pcb','.kicad_dru','.kicad_wks','.kicad_prl']))

export async function exportAcceptedKiCadProject({boardId,projectDir,deliveryRoot}){
  if(!/^\d{3}_[A-Z0-9_]+$/.test(String(boardId||'')))throw new Error('KICAD_DELIVERY_BOARD_ID_INVALID')
  const source=path.resolve(projectDir||''),root=path.resolve(deliveryRoot||'')
  if(!projectDir||!deliveryRoot||source===root)throw new Error('KICAD_DELIVERY_PATH_INVALID')
  const entries=await readdir(source,{withFileTypes:true}),files=entries.filter(x=>x.isFile()&&KICAD_DELIVERY_EXTENSIONS.has(path.extname(x.name)))
  const required=['.kicad_pro','.kicad_sch','.kicad_pcb']
  for(const extension of required)if(files.filter(x=>path.extname(x.name)===extension).length!==1)throw new Error(`KICAD_DELIVERY_REQUIRED_FILE_COUNT:${extension}`)
  const stems=new Set(files.filter(x=>required.includes(path.extname(x.name))).map(x=>path.basename(x.name,path.extname(x.name))))
  if(stems.size!==1)throw new Error('KICAD_DELIVERY_PROJECT_BASENAME_MISMATCH')
  for(const file of files){const info=await stat(path.join(source,file.name));if(!info.size)throw new Error(`KICAD_DELIVERY_EMPTY_FILE:${file.name}`)}
  const destination=path.join(root,boardId),staging=path.join(root,`.${boardId}.staging-${process.pid}`)
  await rm(staging,{recursive:true,force:true});await mkdir(staging,{recursive:true})
  for(const file of files)await copyFile(path.join(source,file.name),path.join(staging,file.name))
  await rm(destination,{recursive:true,force:true});await rename(staging,destination)
  return{schema:'boardforge.phase2c.kicad-delivery.v1',boardId,destination,projectBasename:[...stems][0],files:files.map(x=>x.name).sort()}
}

export async function auditKiCadDeliveryRoot(deliveryRoot){
  const root=path.resolve(deliveryRoot),entries=await readdir(root,{withFileTypes:true}),errors=[],boards=[]
  for(const entry of entries){
    if(!entry.isDirectory()||!/^\d{3}_[A-Z0-9_]+$/.test(entry.name)){errors.push(`unexpected-root-entry:${entry.name}`);continue}
    const children=await readdir(path.join(root,entry.name),{withFileTypes:true})
    if(children.some(x=>!x.isFile()))errors.push(`nested-entry:${entry.name}`)
    const names=children.filter(x=>x.isFile()).map(x=>x.name)
    if(names.some(name=>!KICAD_DELIVERY_EXTENSIONS.has(path.extname(name))))errors.push(`non-kicad-file:${entry.name}`)
    for(const extension of ['.kicad_pro','.kicad_sch','.kicad_pcb'])if(names.filter(name=>path.extname(name)===extension).length!==1)errors.push(`required-file-count:${entry.name}:${extension}`)
    boards.push({boardId:entry.name,files:names.sort()})
  }
  return{schema:'boardforge.phase2c.kicad-delivery-audit.v1',ok:errors.length===0,errors,boards}
}
