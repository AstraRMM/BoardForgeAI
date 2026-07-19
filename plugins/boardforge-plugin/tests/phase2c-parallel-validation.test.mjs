import test from 'node:test'
import assert from 'node:assert/strict'
import { runIndependentValidationTasks } from '../lib/real-board-proof.mjs'

test('independent ERC and DRC execute concurrently without merging evidence',async()=>{const started=Date.now(),task=value=>async()=>{await new Promise(resolve=>setTimeout(resolve,80));return value};const result=await runIndependentValidationTasks({ercTask:task({status:'ERC'}),drcTask:task({status:'DRC'})});assert.deepEqual(result,{erc:{status:'ERC'},drc:{status:'DRC'}});assert.ok(Date.now()-started<145,'validation tasks ran sequentially')})
