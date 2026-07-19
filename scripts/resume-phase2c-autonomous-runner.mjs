#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { manifest } from '../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { loadCheckpoint, runAutonomousChallenge } from '../plugins/boardforge-plugin/lib/phase2c/autonomous-challenge-runner.mjs'

const value=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]}
const checkpoint=value('--checkpoint')
if(!checkpoint) throw new Error('--checkpoint is required; refusing an inexact resume')
const state=await loadCheckpoint(path.resolve(checkpoint))
const driver=value('--driver')||state.driverModule
if(!driver) throw new Error('--driver is required because checkpoint has no recorded orchestration driver')
const module=await import(pathToFileURL(path.resolve(driver)).href)
if(typeof module.executePilot!=='function'||typeof module.executeBoard!=='function') throw new Error('Driver must export executePilot and executeBoard')
const result=await runAutonomousChallenge({manifest,checkpointPath:path.resolve(checkpoint),resume:true,driverModule:driver,executePilot:module.executePilot,executeBoard:module.executeBoard,batchSize:Number(value('--batch-size')||5),maxRetries:Number(value('--max-retries')||2),watchdogMs:Number(value('--watchdog-ms')||90_000)})
console.log(JSON.stringify({status:result.status,nextBoardIndex:result.state.nextBoardIndex,accepted:result.state.accepted.length,resumeCommand:result.resumeCommand},null,2))
if(/REJECTED|REQUIRED/.test(result.status))process.exitCode=2
