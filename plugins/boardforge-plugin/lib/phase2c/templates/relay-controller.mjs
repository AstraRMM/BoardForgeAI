import {approvedAssetFor} from '../../components/approved-production-assets.mjs'

export const RELAY_CONTROLLER_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.relay-controller.v1'

export const relayControllerProductionProposal=Object.freeze({
  schema:RELAY_CONTROLLER_PROPOSAL_SCHEMA,status:'BLOCKED_PENDING_LOAD_AND_CHANNEL_REQUIREMENTS',boardId:'013_RELAY_CONTROLLER',maximumAreaMm2:2300,channelCount:4,
  architecture:'Four-channel SELV logic controller driving protected low-side relay coils with isolated dry-contact terminal outputs',
  primarySources:{
    driver:'https://www.ti.com/product/ULN2803C',
    relay:'https://components.omron.com/eu-en/sites/components.omron.com.eu/files/datasheet_pdf/J155-E1.pdf',
    terminal:'https://www.phoenixcontact.com/us/products/1725656/pdf',
  },
  candidates:[
    {role:'MULTICHANNEL_RELAY_DRIVER',mpn:'ULN2803C',status:'PRIMARY_SOURCE_FUNCTION_VERIFIED_EXACT_ORDER_SUFFIX_AND_PIN_MAP_PENDING',verified:{channels:8,maxOutputV:50,maxOutputCurrentPerChannelA:.5,integratedClampDiodes:true}},
    {role:'POWER_RELAY',mpnFamily:'G5Q-1A4-EU',status:'PRIMARY_SOURCE_FAMILY_ONLY_COIL_SUFFIX_AND_LOAD_VARIANT_PENDING',verified:{contactForm:'SPST-NO',coilVoltagesV:[5,12,24],sealedVariant:true}},
    {role:'CONTACT_TERMINAL',mpn:'1725656',status:'PRIMARY_SOURCE_RATING_VERIFIED_QUANTITY_PENDING',verified:{positions:2,nominalCurrentA:6,ratedVoltageIII2V:160,ratedSurgeVoltageKv:2.5}},
  ],
  outline:{family:'terminal-ears-relay-controller',closed:true,maximumAreaMm2:2300,points:[[0,4],[4,4],[4,0],[56,0],[56,4],[60,4],[60,32],[56,32],[56,36],[4,36],[4,32],[0,32]],purposefulFeatures:{terminalEarCount:2,terminalServiceEdges:['left','right'],mountingHoleCount:4,contactLogicPartitionRequired:true}},
  bom:[
    blocked('K','four exact power relay outputs','Declare contact form, coil voltage and load envelope, then freeze one exact relay suffix.',4),
    blocked('U_DRV','four-channel relay coil low-side driver','Freeze an exact orderable ULN2803C suffix/package and prove simultaneous-channel current and thermal derating.'),
    blocked('D_FLY','four relay coil flyback or clamp paths','Freeze exact clamp implementation; integrated driver clamps count only after COM-to-coil-rail routing is verified.',4),
    blocked('J_CONTACT','four correctly rated relay COM/NO/NC contact terminals','Freeze exact terminal MPN, position count, pitch, voltage/current/surge rating and pin map for the declared load.',4),
    blocked('P_OUT','four load-specific relay output protection networks','Freeze exact snubber, MOV or TVS/fuse parts from the declared AC/DC load and inrush category.',4),
    approved('U_IN','dual-channel protected isolated control input','ISO1212DBQR',2),
    approved('F_IN','24 V control-side input fuse','0451002.MRL'),
    approved('D_IN','24 V control-side surge clamp','SMBJ33A'),
    approved('D_COIL','coil-rail transient clamp candidate','SMAJ24A'),
    approved('C_LOGIC','logic and input decoupling','CL10B104KB8NNNC'),
    blocked('U_LOGIC','safe-state relay controller','Freeze exact MCU/controller, programming connector, reset bias and four de-energized-at-reset outputs.'),
    blocked('P_COIL','protected coil power entry and regulator','Freeze input source, fuse/reverse-polarity protection, regulator, bulk capacitance and exact coil-rail voltage after relay suffix selection.'),
  ],
  requiredTopology:[
    'One independently controlled low-side driver channel per relay coil.',
    'Driver COM tied to the positive coil rail so the integrated clamp diodes have a defined return.',
    'Separate logic and coil supply decoupling, input fuse/reverse-polarity protection, and coil-rail transient suppression.',
    'One correctly rated terminal pair per dry contact, with contact copper clearance derived from the declared load category and voltage.',
    'Boot/reset/debug access and a defined de-energized state for every relay during reset and power sequencing.',
    'Per-channel status indication must not source enough current into a driver input to cause unintended pickup.',
  ],
  mandatoryUnresolved:[
    'Declare relay channel count; the manifest only says protected relay actuation.',
    'Declare AC/DC load voltage, load type, steady current, inrush current, switching frequency, and required contact form.',
    'Select the exact G5Q coil voltage and load-specific suffix from the manufacturer table.',
    'Select an exact orderable ULN2803C package suffix and verify its manufacturer pin table and simultaneous-channel thermal derating.',
    'Prove PCB creepage/clearance, terminal rating, relay contact rating, fuse, and suppression against the declared load; do not infer mains capability.',
  ],
  evidenceRequired:['exactAssetsApproved','loadEnvelopeDeclared','relayContactRatingVerified','coilPickupDropoutBudgetVerified','simultaneousCoilThermalBudgetVerified','driverClampReturnVerified','contactProtectionVerified','inputIsolationProtectionVerified','powerEntryProtectionVerified','resetDeenergizedStateVerified','contactLogicClearanceVerified','terminalToolAccessVerified','productionLoadTestVerified'],
})

function approved(ref,role,mpn,quantity=1){return{ref,role,mpn,quantity,status:approvedAssetFor(mpn)?'APPROVED_EXACT_ASSET':'BLOCKED_MISSING_APPROVED_EXACT_ASSET'}}
function blocked(ref,role,requirement,quantity=1){return{ref,role,mpn:null,quantity,status:'BLOCKED_MISSING_APPROVED_EXACT_ASSET',requirement}}

export function validateRelayControllerArchitecture(definition={}){const bom=definition.bom||[],roles=bom.map(x=>String(x.role||'').toLowerCase()),has=p=>roles.some(x=>p.test(x)),errors=[];if(!has(/relay/))errors.push('relay-device-missing');if(!has(/relay.*driver|coil.*driver/))errors.push('relay-coil-driver-missing');if(!has(/contact.*terminal|relay.*terminal/))errors.push('relay-contact-terminal-missing');if(!has(/coil.*(clamp|flyback)|flyback|clamp.*coil/))errors.push('relay-coil-clamp-evidence-missing');if(!has(/fuse|reverse.*polarity|power.*protection/))errors.push('relay-power-entry-protection-missing');if(!has(/reset.*default|de-energized.*reset|safe.*reset/))errors.push('relay-reset-safe-state-missing');const e=definition.semanticEvidence?.relayController||{};if(!(e.channelCount>0))errors.push('relay-channel-count-undeclared');if(!e.loadRequirementsVerified)errors.push('relay-load-requirements-unverified');if(!e.clearanceVerified)errors.push('relay-contact-clearance-unverified');return{ok:errors.length===0,errors}}

export function validateRelayControllerProductionProposal(proposal={}){
  const errors=[],bom=Array.isArray(proposal.bom)?proposal.bom:[],count=p=>bom.filter(x=>p.test(String(x.role||'').toLowerCase())).reduce((n,x)=>n+(x.quantity||1),0),channels=proposal.channelCount||0
  if(channels<2)errors.push('relay-channel-count-undeclared')
  for(const [p,code] of [[/power relay outputs/,'relay-output-devices-missing'],[/flyback|clamp paths/,'relay-flyback-protection-missing'],[/contact terminals/,'relay-contact-connectors-missing'],[/output protection/,'relay-output-protection-missing']])if(count(p)<channels)errors.push(code)
  if(!bom.some(x=>/four-channel relay coil low-side driver/.test(String(x.role||'').toLowerCase())))errors.push('relay-coil-drivers-missing')
  if(count(/isolated control input/)<channels)errors.push('relay-input-isolation-or-protection-missing')
  const blockedParts=bom.filter(x=>x.status!=='APPROVED_EXACT_ASSET');if(blockedParts.length)errors.push('relay-exact-assets-unapproved')
  const f=proposal.outline?.purposefulFeatures||{},area=polygonArea(proposal.outline?.points);if(proposal.outline?.closed!==true||!Number.isFinite(area)||area>(proposal.maximumAreaMm2||0)||f.terminalEarCount!==2||f.contactLogicPartitionRequired!==true)errors.push('relay-purposeful-outline-invalid')
  for(const key of proposal.evidenceRequired||[])if(proposal.semanticEvidence?.[key]!==true)errors.push(`relay-evidence-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}-missing`)
  return{schema:'boardforge.phase2c.relay-controller-remediation-gate.v1',ok:errors.length===0,errors,areaMm2:area,maximumAreaMm2:proposal.maximumAreaMm2,blockedRefs:blockedParts.map(x=>x.ref)}
}
function polygonArea(points=[]){if(points.length<3)return NaN;let s=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
