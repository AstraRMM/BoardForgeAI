import test from 'node:test'
import assert from 'node:assert/strict'
import {createBoard007PlacementRoutePlan,validateBoard007PlacementRoutePlan} from '../lib/phase2c/board007-placement-route-contract.mjs'

test('Board007 placement reserves ears, four mounts, connector access, and 3V3 capacity',()=>{
  const plan=createBoard007PlacementRoutePlan(),result=validateBoard007PlacementRoutePlan(plan)
  assert.equal(result.ok,true,result.errors.join('; '))
  assert.equal(plan.holes.length,4)
  assert.equal(result.threeV3CapacityMm,2)
  assert.equal(result.corridorCount,5)
  assert.equal(new Set(plan.corridors.map(x=>x.layer)).size,4)
  assert.ok(!result.errors.includes('board007-corridor-intrudes-mount-keepout'))
})

test('Board007 plan fails closed when 3V3 capacity, a mount, or connector access is lost',()=>{
  const plan=createBoard007PlacementRoutePlan();plan.corridors.find(x=>x.id==='3V3_BACKBONE').widthMm=.8;plan.holes.pop();plan.placements.J2.nx=.5
  const result=validateBoard007PlacementRoutePlan(plan)
  assert.equal(result.ok,false)
  for(const code of['board007-3v3-routing-capacity-unreserved','board007-placement-mount-count-invalid','board007-j2-connector-access-invalid'])assert.ok(result.errors.includes(code),code)
})

test('Board007 plan covers the exact expanded hardened BOM reference set',()=>{
  const refs=Object.keys(createBoard007PlacementRoutePlan().placements).sort()
  assert.deepEqual(refs,['C1','C2','C3','C4','C5','C6','C_BULK','C_RESET','D1','D_PWR','J1','J2','JP1','Q1','R1','R_BOOT','R_RESET','U1','U2','U3'])
})
