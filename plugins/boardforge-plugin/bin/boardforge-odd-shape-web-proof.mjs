#!/usr/bin/env node
import path from 'node:path'
import { runOddShapeWebFlowProof } from '../lib/engine/odd-shape-web-flow-proof.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

const projectDir = path.resolve(argValue('--project', 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-WEB-ODD-SHAPE-GENERATED-01_REV_A'))
const result = await runOddShapeWebFlowProof({ projectDir })
console.log(JSON.stringify({ status: 'BOARD_FORGE_ODD_SHAPE_WEB_FLOW_PROOF_COMPLETED', projectDir: result.projectDir, validation: result.validation, manufacturing: result.manufacturing }, null, 2))
