export const DRC_OBSTACLE_REPAIR_SCHEMA='boardforge.drc-obstacle-repair.v1'

export function planObstacleRepairs({violations=[],requiredClearance=.2}={}){
  const actions=[]
  for(const violation of violations){
    const text=`${violation.description||''} ${(violation.items||[]).map(x=>x.description).join(' ')}`
    if(violation.type==='shorting_items'&&/Via \[/.test(text)&&/Track \[/.test(text))actions.push(action('REROUTE_TRUNK_AROUND_THROUGH_VIA','routing',violation,{requiredClearance,rule:'via radius + track half-width + required clearance',reusable:true}))
    if(violation.type==='tracks_crossing'&&/USB_D[PN]/.test(text))actions.push(action('ROUTE_USB_AS_COUPLED_PAIR','routing',violation,{preservePolarity:true,allowLayerTransition:true,reusable:true}))
    if(['clearance','solder_mask_bridge'].includes(violation.type)&&/R2/.test(text))actions.push(action('REPLACE_PASSIVE_PLACEMENT','placement',violation,{ref:'R2',minimumCourtyardGapMm:.25,reusable:true}))
    if(violation.type==='courtyards_overlap'&&/R1/.test(text)&&/R2/.test(text))actions.push(action('SEPARATE_PASSIVE_COURTYARDS','placement',violation,{refs:['R1','R2'],minimumCourtyardGapMm:.25,reusable:true}))
  }
  return{schema:DRC_OBSTACLE_REPAIR_SCHEMA,actions:dedupe(actions),blocked:actions.length===0&&violations.length>0}
}

function action(code,stage,violation,parameters){return{code,stage,violationType:violation.type,parameters}}
function dedupe(actions){const seen=new Set();return actions.filter(x=>{const key=`${x.code}:${JSON.stringify(x.parameters)}`;if(seen.has(key))return false;seen.add(key);return true})}
