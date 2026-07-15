import test from'node:test';import assert from'node:assert/strict';import{planObstacleRepairs as plan}from'../lib/routing/drc-obstacle-repair-planner.mjs'
test('converts RP2040 physical DRC classes into reusable engine repairs',()=>{const r=plan({violations:[
 {type:'shorting_items',description:'Items shorting two nets',items:[{description:'Via [GND] on F.Cu - B.Cu'},{description:'Track [3V3] on In1.Cu'}]},
 {type:'tracks_crossing',items:[{description:'Track [USB_DN] on F.Cu'},{description:'Track [USB_DP] on F.Cu'}]},
 {type:'clearance',items:[{description:'Pad 1 [CC2] of R2 on F.Cu'},{description:'Track [USB_DP_CONN] on F.Cu'}]},
 {type:'courtyards_overlap',items:[{description:'Footprint R1'},{description:'Footprint R2'}]},
 {type:'solder_mask_bridge',items:[{description:'Pad 2 [GND] of R2 on F.Cu'}]}
]});assert.deepEqual(new Set(r.actions.map(x=>x.code)),new Set(['REROUTE_TRUNK_AROUND_THROUGH_VIA','ROUTE_USB_AS_COUPLED_PAIR','REPLACE_PASSIVE_PLACEMENT','SEPARATE_PASSIVE_COURTYARDS']));assert.equal(r.blocked,false)})
test('does not invent a repair for an unknown violation',()=>assert.equal(plan({violations:[{type:'unknown'}]}).blocked,true))
