import {approvedAssetFor} from '../../components/approved-production-assets.mjs'

export const ETHERNET_CONTROLLER_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.ethernet-controller.v1'

const approved=(ref,role,mpn)=>({ref,role,mpn,status:approvedAssetFor(mpn)?'APPROVED_EXACT_ASSET':'BLOCKED_MISSING_APPROVED_EXACT_ASSET'})
const unresolved=(ref,role,requirement)=>({ref,role,mpn:null,status:'BLOCKED_MISSING_APPROVED_EXACT_ASSET',requirement})

export const ethernetControllerProductionProposal=Object.freeze({
  schema:ETHERNET_CONTROLLER_PROPOSAL_SCHEMA,
  boardId:'010_ETHERNET_CONTROLLER',
  status:'BLOCKED_PENDING_EXACT_SUPPORT_ASSETS_AND_BOARD_LEVEL_EVIDENCE',
  maximumAreaMm2:1250,
  architecture:'RP2040 SPI host with W5500 integrated 10/100BASE-T MAC/PHY and a non-PoE integrated-magnetics RJ45',
  limitations:[
    '7499010121A is a non-PoE part approved only as a 100BASE-TX data connector/magnetics assembly and must never be credited as a PoE power-path component.',
    'This proposal is non-PoE. Adding PoE requires a separately verified PD input, isolation, power conversion, safety spacing, thermal and compliance architecture.',
  ],
  outline:{
    family:'magnetics-notch-ethernet-controller',closed:true,maximumAreaMm2:1250,
    points:[[0,0],[42,0],[42,8],[39,8],[39,20],[42,20],[42,28],[0,28]],
    purposefulFeatures:{rj45Notch:{edge:'right',depthMm:3,spanMm:12},mountingHoleCount:4},
  },
  bom:[
    approved('U1','RP2040 host controller','SC0914(13)'),
    approved('U2','Ethernet MAC PHY controller with SPI host interface','W5500'),
    approved('Y1','25 MHz Ethernet reference crystal','Q22FA2380184517'),
    approved('J1','RJ45 integrated Ethernet magnetics non-PoE connector','7499010121A'),
    approved('U3','3.3 V supply regulator','MCP1700T-3302E/TT'),
    approved('U4','RP2040 QSPI program flash','W25Q128JVSIQ'),
    approved('C_DEC','Ethernet PHY and host decoupling capacitor population','CL10B104KB8NNNC'),
    unresolved('R_RST','Ethernet reset pull-up and RC network','Freeze exact resistor/capacitor MPNs and values from the W5500 reset timing requirement.'),
    unresolved('R_MODE','W5500 PMODE strap network','Freeze exact resistor MPNs/values and prove sampled startup states.'),
    unresolved('R_TERM','100BASE-TX line termination and EXRES1 network','Freeze exact tolerance/value/voltage-rated resistor MPNs from the W5500 and MagJack reference circuit.'),
    unresolved('C_XTAL','25 MHz crystal load network','Calculate the load budget including pin and board parasitics, then freeze exact capacitor MPNs.'),
    unresolved('D_ETH','Cable-side Ethernet ESD/surge protection','Select an exact Ethernet-rated low-capacitance protection MPN and verify chassis discharge topology.'),
    unresolved('FB_AVDD','W5500 analog-supply filtering','Freeze exact ferrite/filter and bulk-capacitor MPNs from the W5500 supply guidance.'),
  ],
  evidenceRequired:['exactAssetsApproved','clockLoadAndStartupVerified','resetTimingVerified','strapStatesVerified','lineTerminationVerified','cableProtectionVerified','supplyPdnVerified','ethernetSignalIntegrityVerified','nonPoeLimitationRecorded','mechanicalEnvelopeVerified','productionTestVerified'],
})

export function validateEthernetControllerProposal(proposal={}){
  const errors=[],bom=Array.isArray(proposal.bom)?proposal.bom:[],roles=bom.map(x=>String(x.role||'').toLowerCase()),has=p=>roles.some(x=>p.test(x))
  const need=(p,code)=>{if(!has(p))errors.push(code)}
  need(/rp2040.*host/,'ethernet-rp2040-host-missing')
  need(/ethernet.*mac.*phy/,'ethernet-mac-phy-missing')
  need(/25.*mhz.*(clock|crystal)|reference.*crystal/,'ethernet-reference-clock-missing')
  need(/rj45.*magnetics|integrated.*ethernet.*magnetics/,'ethernet-magjack-missing')
  for(const [p,code] of [[/reset/,'ethernet-reset-network-missing'],[/strap|pmode/,'ethernet-strap-network-missing'],[/termination|exres/,'ethernet-termination-missing'],[/esd|surge|cable.*protection/,'ethernet-line-protection-missing'],[/supply.*filter|analog.*supply/,'ethernet-phy-supply-filter-missing'],[/decoupling/,'ethernet-decoupling-missing']])need(p,code)
  const exactBlocked=bom.filter(x=>x.status!=='APPROVED_EXACT_ASSET')
  if(exactBlocked.length)errors.push('ethernet-exact-assets-unapproved')
  const area=polygonArea(proposal.outline?.points)
  if(proposal.outline?.closed!==true||!Number.isFinite(area)||area>(proposal.maximumAreaMm2||0))errors.push('ethernet-purposeful-outline-invalid')
  if(!proposal.outline?.purposefulFeatures?.rj45Notch)errors.push('ethernet-rj45-notch-missing')
  if(!proposal.limitations?.some(x=>/non-poe/i.test(x))||!proposal.limitations?.some(x=>/poe requires/i.test(x)))errors.push('ethernet-non-poe-limitation-missing')
  const evidence=proposal.semanticEvidence||{}
  for(const key of proposal.evidenceRequired||[])if(evidence[key]!==true)errors.push(`ethernet-evidence-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}-missing`)
  return{schema:'boardforge.phase2c.ethernet-controller-remediation-gate.v1',ok:errors.length===0,errors,areaMm2:area,maximumAreaMm2:proposal.maximumAreaMm2,blockedRefs:exactBlocked.map(x=>x.ref)}
}

function polygonArea(points=[]){if(points.length<3)return NaN;let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)/2}
