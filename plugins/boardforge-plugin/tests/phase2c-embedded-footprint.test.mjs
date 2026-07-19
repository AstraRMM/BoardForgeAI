import test from 'node:test'
import assert from 'node:assert/strict'
import { writeKiCadPcbText } from '../lib/outline/edgecuts-writer.mjs'
import { embeddedFootprintName } from '../lib/real-board-proof.mjs'

test('fully embedded proof footprints do not claim unavailable library nicknames',()=>{assert.equal(embeddedFootprintName('BoardForge_Proof:USB_C_ReviewRequired'),'USB_C_ReviewRequired');const pcb=writeKiCadPcbText({points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],holes:[{x:5,y:5,diameterMm:2.4}]});assert.doesNotMatch(pcb,/MountingHole:/);assert.match(pcb,/footprint "MountingHole_2\.4mm_M2"/)})
