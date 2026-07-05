import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { recommendNextActions } from './project-next-actions.mjs'
export async function writeProjectNextActionsReport({ projectDir=process.cwd(), state={} }={}){ await mkdir(projectDir,{recursive:true}); const report={...recommendNextActions(state), generatedAt:new Date().toISOString(), hallucinationPolicy:'artifact_only'}; const json=path.join(projectDir,'BoardForge_Project_Next_Actions_Report.json'); const md=path.join(projectDir,'BoardForge_Project_Next_Actions_Report.md'); await writeFile(json,JSON.stringify(report,null,2)); await writeFile(md,`# Project Next Actions\n\n${report.actions.map(a=>`- ${a}`).join('\n')}\n`); return {status:report.status,report,artifactPaths:[json,md]} }
