#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { manifest } from '../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { evaluateChallengePreflight } from '../plugins/boardforge-plugin/lib/phase2c/challenge-preflight.mjs'
import { loadBoardForgeEnv } from '../plugins/boardforge-plugin/lib/config/env-loader.mjs'
import { detectKiCadCli } from '../plugins/boardforge-plugin/lib/kicad-cli.mjs'
import { buildProviderRuntimePreflight, runDigiKeyRuntimeProbe, runMouserRuntimeProbe } from '../plugins/boardforge-plugin/lib/phase2c/provider-runtime-preflight.mjs'
import { runAutonomousChallenge } from '../plugins/boardforge-plugin/lib/phase2c/autonomous-challenge-runner.mjs'
import { executePilot, executeBoard } from './phase2c-challenge-driver.mjs'

const repo=path.resolve(import.meta.dirname,'..'),outputRoot=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`
const runtimeConfig=loadBoardForgeEnv({cwd:repo}),kicadDetected=await detectKiCadCli()
const rustCli=path.join(repo,'rust/target/debug/boardforge-kicad.exe'),rust={available:existsSync(rustCli),version:existsSync(rustCli)?'boardforge-kicad debug build':null}
// Configuration/authentication is not live sourcing proof. Provider clients must supply
// fresh successful request evidence to a future pilot runner; preflight fails closed here.
const providerPreflight=buildProviderRuntimePreflight({
  digikey:await runDigiKeyRuntimeProbe({env:runtimeConfig.env}),
  mouser:await runMouserRuntimeProbe({env:runtimeConfig.env}),
})
const [digikey,mouser]=providerPreflight.providers
const report=evaluateChallengePreflight({manifest,digikey,mouser,kicad:{available:kicadDetected.available,version:kicadDetected.version},rust,outputRoot})
await mkdir(outputRoot,{recursive:true});await mkdir(path.join(repo,'reports/phase2c'),{recursive:true})
const resumeCommand='npm run boardforge:phase2c-autonomous-challenge -- --resume-from provider-preflight'
const full={...report,generatedAt:new Date().toISOString(),outputRoot,resumeCommand,providerPreflight,manifest:{schema:manifest.schema,boardCount:manifest.boards.length,customOutlineCount:manifest.boards.filter(b=>b.outline.kind==='custom').length},learning:[{failedStage:'liveSourcing',rootCause:'Required live supplier authentication/reachability is unavailable.',engineImprovement:'Added fail-closed challenge preflight so no board can be generated or counted without fresh live dual-supplier request proof.',regression:'phase2c challenge preflight tests',documentedLimitation:'External credentials and supplier availability cannot be manufactured by BoardForge.'}]}
for(const root of [outputRoot,path.join(repo,'reports/phase2c')]){await writeFile(path.join(root,'BoardForge_50_Board_Preflight_Report.json'),JSON.stringify(full,null,2)+'\n');await writeFile(path.join(root,'BoardForge_50_Board_Preflight_Report.md'),`# BoardForge 50 Board Challenge Preflight\n\n- Status: ${full.status}\n- Accepted boards: 0\n- Attempted boards: 0\n- Waste prevented: true\n- Output root: ${outputRoot}\n\n## Blockers\n\n${full.blockers.map(b=>`- ${b.id}: ${b.detail}`).join('\n')||'- None'}\n\nResume: \`${resumeCommand}\`\n`)}
if(full.status!=='READY_TO_GENERATE'){
  console.log(JSON.stringify({status:full.status,acceptedBoards:0,attemptedBoards:0,blockers:full.blockers,resumeCommand,outputRoot},null,2));process.exitCode=2
} else if(process.argv.includes('--preflight-only')) {
  console.log(JSON.stringify({status:full.status,acceptedBoards:0,attemptedBoards:0,blockers:[],resumeCommand,outputRoot},null,2))
} else {
  const checkpointPath=path.join(outputRoot,'BoardForge_Phase2C_Autonomous_Checkpoint.json')
  const resume=process.argv.includes('--resume') || process.argv.includes('--resume-from') || existsSync(checkpointPath)
  const outcome=await runAutonomousChallenge({manifest,checkpointPath,executePilot,executeBoard,resume,batchSize:50,maxRetries:2,watchdogMs:180_000,driverModule:'./scripts/phase2c-challenge-driver.mjs',executionContext:{trainingMode:true}})
  console.log(JSON.stringify({status:outcome.status,acceptedBoards:outcome.state.accepted.length,nextBoardIndex:outcome.state.nextBoardIndex,lastFailure:outcome.state.lastFailure,resumeCommand:outcome.resumeCommand,outputRoot},null,2))
  if(outcome.status!=='CHALLENGE_COMPLETE')process.exitCode=2
}
