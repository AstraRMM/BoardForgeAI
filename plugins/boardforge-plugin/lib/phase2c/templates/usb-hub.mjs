import {approvedAssetFor} from '../../components/approved-production-assets.mjs'

export const USB_HUB_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.usb-hub.v1'
const approved=(ref,role,mpn,quantity=1)=>({ref,role,mpn,quantity,status:approvedAssetFor(mpn)?'APPROVED_EXACT_ASSET':'BLOCKED_MISSING_APPROVED_EXACT_ASSET'})
const blocked=(ref,role,requirement)=>({ref,role,mpn:null,status:'BLOCKED_MISSING_APPROVED_EXACT_ASSET',requirement})

export const usbHubProductionProposal=Object.freeze({
  schema:USB_HUB_PROPOSAL_SCHEMA,boardId:'011_USB_HUB',status:'BLOCKED_PENDING_HUB_POWER_CLOCK_CONFIGURATION_AND_CONNECTOR_POLICY_ASSETS',maximumAreaMm2:1600,
  architecture:'USB 2.0 high-speed four-port hub with exactly one upstream USB-C UFP and four independently protected and current-limited downstream ports',
  primarySources:{hub:'https://www.microchip.com/en-us/product/usb2514b',datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/00001692C.pdf'},
  hubIdentity:{
    exactFamilyIdentity:'USB2514B_Bi',symbol:'Interface_USB:USB2514B_Bi',footprint:'Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm',package:'36-pin QFN 6x6 mm plus exposed VSS pad 37',
    status:approvedAssetFor('USB2514B_Bi')?'APPROVED_EXACT_ASSET':'BLOCKED_NOT_IN_APPROVED_PRODUCTION_REGISTRY',
    pinMap:{1:'USB_DN1_N',2:'USB_DN1_P',3:'USB_DN2_N',4:'USB_DN2_P',5:'3V3A',6:'USB_DN3_N',7:'USB_DN3_P',8:'USB_DN4_N',9:'USB_DN4_P',10:'3V3A',11:'TEST',12:'PORT_PWR1',13:'OVERCURRENT1_N',14:'CRFILT',15:'3V3',16:'PORT_PWR2',17:'OVERCURRENT2_N',18:'PORT_PWR3',19:'OVERCURRENT3_N',20:'PORT_PWR4',21:'OVERCURRENT4_N',22:'SMB_DATA_NONREM1',23:'3V3',24:'SMB_CLK_CFG0',25:'HS_IND_CFG1',26:'RESET_N',27:'VBUS_DETECT',28:'SUSP_LOCAL_PWR_NONREM0',29:'3V3A',30:'USB_UP_N',31:'USB_UP_P',32:'XTAL_OUT',33:'XTAL_IN',34:'PLLFILT',35:'RBIAS',36:'3V3A',37:'GND'},
  },
  outline:{family:'port-scallops-usb-hub',closed:true,maximumAreaMm2:1600,points:[[0,0],[48,0],[48,30],[46,30],[46,28],[42,28],[42,30],[36,30],[36,28],[32,28],[32,30],[26,30],[26,28],[22,28],[22,30],[16,30],[16,28],[12,28],[12,30],[0,30]],purposefulFeatures:{downstreamPortScallops:4,upstreamPortEdge:'left',mountingHoleCount:4}},
  bom:[
    {ref:'U1',role:'USB hub controller',mpn:'USB2514B_Bi',status:'BLOCKED_NOT_IN_APPROVED_PRODUCTION_REGISTRY'},
    approved('J_UP','upstream USB-C UFP connector','USB4105-GF-A'),
    approved('J_DN','four downstream USB-C connector physical identities','USB4105-GF-A',4),
    approved('D_USB','upstream and four downstream USB ESD protection','USBLC6-2SC6',5),
    approved('U_3V3','3.3 V hub regulator candidate','MCP1700T-3302E/TT'),
    approved('C_DEC','hub analog digital and regulator decoupling population','CL10B104KB8NNNC'),
    blocked('Y1','24 MHz hub crystal or oscillator','Freeze an exact Microchip-compatible 24 MHz clock MPN, footprint, load network, tolerance and startup budget.'),
    blocked('U_PWR','four-channel or four independent downstream current-limited power switches','Freeze exact switch MPN(s) with independent enable and overcurrent reporting compatible with PRTPWR1-4 and OCS_N1-4.'),
    blocked('R_CFG','hub reset straps configuration and RBIAS network','Freeze exact resistor/capacitor MPNs and values for RESET_N, CFG_SEL, NON_REM, TEST, RBIAS, PLLFILT and CRFILT.'),
    blocked('R_CC_UP','upstream USB-C UFP CC pull-down network','Freeze exact 5.1 kOhm Rd resistor MPNs and prove no upstream VBUS backfeed.'),
    blocked('R_CC_DN','four downstream USB-C DFP CC advertisement/control networks','Select a standards-compliant source attach/current-advertisement policy; connector identity alone is not a DFP implementation.'),
    blocked('U_5V','protected 5 V downstream power source','Freeze exact input connector/source, fuse/reverse/surge protection and 5 V regulator sized for the declared aggregate downstream current.'),
  ],
  evidenceRequired:['exactAssetsApproved','oneUpstreamFourDownstreamVerified','usbDifferentialRoutingVerified','clockVerified','resetStrapsConfigVerified','perPortPowerLimitVerified','perPortOvercurrentVerified','typeCAttachPolicyVerified','fiveVoltBudgetThermalVerified','threeVoltPdnVerified','esdDischargeVerified','mechanicalEnvelopeVerified','productionTestVerified'],
})

export function validateUsbHubProductionProposal(proposal={}){
  const errors=[],bom=Array.isArray(proposal.bom)?proposal.bom:[],roles=bom.map(x=>String(x.role||'').toLowerCase()),count=p=>bom.filter(x=>p.test(String(x.role||'').toLowerCase())).reduce((n,x)=>n+(x.quantity||1),0)
  if(count(/hub controller/)!==1)errors.push('usb-hub-controller-missing')
  if(count(/upstream.*connector/)!==1)errors.push('usb-hub-upstream-port-missing')
  if(count(/downstream.*connector/)!==4)errors.push('usb-hub-four-downstream-ports-missing')
  for(const [p,code] of [[/current-limited power switch/,'usb-hub-port-power-control-missing'],[/overcurrent/,'usb-hub-overcurrent-evidence-missing'],[/24.*mhz.*(clock|crystal)|hub.*clock/,'usb-hub-clock-evidence-missing'],[/reset.*strap.*config|configuration.*reset/,'usb-hub-reset-straps-config-missing'],[/usb esd/,'usb-hub-esd-missing'],[/decoupling/,'usb-hub-decoupling-missing'],[/5 v.*power|five.*volt/,'usb-hub-5v-power-missing'],[/3\.3 v.*regulator/,'usb-hub-3v3-power-missing']])if(!roles.some(x=>p.test(x)))errors.push(code)
  if(proposal.hubIdentity?.symbol!=='Interface_USB:USB2514B_Bi'||proposal.hubIdentity?.footprint!=='Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm'||Object.keys(proposal.hubIdentity?.pinMap||{}).length!==37)errors.push('usb-hub-authoritative-controller-identity-invalid')
  const blockedParts=bom.filter(x=>x.status!=='APPROVED_EXACT_ASSET');if(blockedParts.length)errors.push('usb-hub-exact-assets-unapproved')
  const area=polygonArea(proposal.outline?.points);if(proposal.outline?.closed!==true||!Number.isFinite(area)||area>(proposal.maximumAreaMm2||0)||proposal.outline?.purposefulFeatures?.downstreamPortScallops!==4)errors.push('usb-hub-purposeful-outline-invalid')
  for(const key of proposal.evidenceRequired||[])if(proposal.semanticEvidence?.[key]!==true)errors.push(`usb-hub-evidence-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}-missing`)
  return{schema:'boardforge.phase2c.usb-hub-remediation-gate.v1',ok:errors.length===0,errors,areaMm2:area,maximumAreaMm2:proposal.maximumAreaMm2,blockedRefs:blockedParts.map(x=>x.ref)}
}
function polygonArea(points=[]){if(points.length<3)return NaN;let s=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
