import test from'node:test'
import assert from'node:assert/strict'
import{poeSensorProductionProposal as p}from'../lib/phase2c/templates/poe-sensor.mjs'

test('Board009 remains explicitly blocked on a PoE-capable exact connector and system evidence',()=>{
 assert.equal(p.boardId,'009_POE_SENSOR');assert.match(p.status,/^BLOCKED_/);assert.equal(p.maximumAreaMm2,900)
 assert.ok(p.candidates.some(x=>x.exactMpn==='7499010121A'&&/PROHIBITED_AS_POE_POWER_PATH/.test(x.status)))
 assert.ok(p.mandatoryUnresolved.some(x=>/authoritative exact MagJack/i.test(x)))
 assert.ok(p.mandatoryUnresolved.some(x=>/fit within the 42 x 20 mm/i.test(x)))
})

test('Board009 proposal does not claim system acceptance from individual exact candidates',()=>{
 assert.ok(p.candidates.some(x=>x.exactMpn==='W5500'))
 assert.ok(p.candidates.some(x=>x.exactMpn==='Ag9905LP'))
 assert.ok(p.candidates.every(x=>!/BOARD_ACCEPTED|MANUFACTURING_ACCEPTED/.test(x.status)))
})
