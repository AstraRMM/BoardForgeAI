#!/usr/bin/env node
import path from 'node:path'
import { generateOneClickDemo } from '../lib/demo/demo-project-generator.mjs'

const outputDir = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : path.join('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures', 'BF-ONE-CLICK-PUBLIC-DEMO')

const result = await generateOneClickDemo({ outputDir })
console.log(JSON.stringify(result, null, 2))
