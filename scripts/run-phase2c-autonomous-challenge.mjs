#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { manifest } from '../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { evaluateChallengePreflight } from '../plugins/boardforge-plugin/lib/phase2c/challenge-preflight.mjs'
import { getProviderConfig } from '../plugins/boardforge-plugin/lib/config/provider-config.mjs'
import { createDigiKeyAuthClient } from '../plugins/boardforge-plugin/lib/sourcing/digikey/digikey-auth-client.mjs'
import { detectKiCadCli } from '../plugins/boardforge-plugin/lib/kicad-cli.mjs'

const repo=path.resolve(import.meta.dirname,'..'),outputRoot=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`
const providers=getProviderConfig({cwd:repo}),digikeyHealth=await createDigiKeyAuthClient().healthCheck(),kicadDetected=await detectKiCadCli()
const rustCli=path.join(repo,'rust/target/debug/boardforge-kicad.exe'),rust={available:existsSync(rustCli),version:existsSync(rustCli)?'boardforge-kicad debug build':null}
// Configuration alone is not accepted as live reachability. A successful provider request must set this in a resumed run.
const mouser={configured:providers.providers.mouser.configured,liveReachable:process.env.BOARDFORGE_MOUSER_LIVE_VERIFIED==='1'}
const report=evaluateChallengePreflight({manifest,digikey:{configured:digikeyHealth.configured,authenticated:digikeyHealth.authenticated},mouser,kicad:{available:kicadDetected.available,version:kicadDetected.version},rust,outputRoot})
await mkdir(outputRoot,{recursive:true});await mkdir(path.join(repo,'reports/phase2c'),{recursive:true})
const resumeCommand='npm run boardforge:phase2c-autonomous-challenge'
const full={...report,generatedAt:new Date().toISOString(),outputRoot,resumeCommand,manifest:{schema:manifest.schema,boardCount:manifest.boards.length,customOutlineCount:manifest.boards.filter(b=>b.outline.kind==='custom').length},learning:[{failedStage:'liveSourcing',rootCause:'Required live supplier authentication/reachability is unavailable.',engineImprovement:'Added fail-closed challenge preflight so no board can be generated or counted without live dual-supplier proof.',regression:'phase2c challenge preflight tests',documentedLimitation:'External credentials and supplier availability cannot be manufactured by BoardForge.'}]}
for(const root of [outputRoot,path.join(repo,'reports/phase2c')]){await writeFile(path.join(root,'BoardForge_50_Board_Preflight_Report.json'),JSON.stringify(full,null,2)+'\n');await writeFile(path.join(root,'BoardForge_50_Board_Preflight_Report.md'),`# BoardForge 50 Board Challenge Preflight\n\n- Status: ${full.status}\n- Accepted boards: 0\n- Attempted boards: 0\n- Waste prevented: true\n- Output root: ${outputRoot}\n\n## Blockers\n\n${full.blockers.map(b=>`- ${b.id}: ${b.detail}`).join('\n')||'- None'}\n\nResume: \`${resumeCommand}\`\n`)}
console.log(JSON.stringify({status:full.status,acceptedBoards:0,attemptedBoards:0,blockers:full.blockers,resumeCommand,outputRoot},null,2));if(full.status!=='READY_TO_GENERATE')process.exitCode=2
