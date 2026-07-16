import {approvedAssetFor} from '../../components/approved-production-assets.mjs'

export const USB_ISOLATOR_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.usb-isolator.v1'

// This is deliberately a proposal, not an approved production template. The
// isolator is active but had zero live stock in the 2026-07-16 provider check;
// the USB-C DFP controller suffix, clock, and exact custom DC/DC land pattern
// must be closed before this can become a generated/accepted board.
export const usbIsolatorProductionProposal=Object.freeze({
  schema:USB_ISOLATOR_PROPOSAL_SCHEMA,boardId:'012_USB_ISOLATOR',status:'BLOCKED_PENDING_EXACT_ASSETS_AND_LIVE_STOCK',maximumAreaMm2:1950,
  architecture:'USB 2.0 high-speed host-side isolator with upstream UFP USB-C and downstream DFP USB-C',
  primarySources:{
    isolator:'https://www.analog.com/media/en/technical-documentation/data-sheets/adum3165-adum3166.pdf',
    referenceDesign:'https://www.analog.com/media/en/reference-design-documentation/reference-designs/cn0550.pdf',
    isolatedPower:'https://pim.murata.com/en-us/pim/details/?partNum=NXE1S0505MC',
    typeCSource:'https://www.ti.com/lit/ds/symlink/tps25810.pdf',
    esd:'https://www.st.com/content/st_com/en/technical-documents/DS4260.html',
  },
  requirements:{usbSpeedMbps:480,dataIsolationVrms:3750,isolatorPackageCreepageMm:5.3,isolatorPackageClearanceMm:5.3,boardKeepoutRequired:true,separateGroundDomains:true},
  domains:{upstream:{ground:'GND_UP',power:['VBUS_UP','VDD_UP_3V3']},downstream:{ground:'GND_ISO',power:['VBUS_ISO_5V','VDD_ISO_3V3']},directCopperCrossings:[]},
  outline:{family:'isolation-waist-usb-isolator',closed:true,maximumAreaMm2:1950,points:[[0,0],[22,0],[22,4],[30,4],[30,0],[52,0],[52,34],[30,34],[30,30],[22,30],[22,34],[0,34]],purposefulFeatures:{opposedIsolationNotches:2,barrierCenterX:26,allLayerCopperKeepoutWidthMm:5,minimumCreepageMm:5.3,minimumClearanceMm:5.3,mountingHoleCount:4}},
  bom:[
    part('U1','USB_HIGH_SPEED_ISOLATOR','ADUM3165BRSZ','Package_SO:SSOP-20_5.3x7.2mm_P0.65mm',{1:'VBUS_UP',2:'GND_UP',3:'VDD_UP_3V3',4:'GND_UP',5:'XTAL_IN',6:'XTAL_OUT',7:'GND_UP',8:'USB_UP_DP',9:'USB_UP_DN',10:'GND_UP',11:'GND_ISO',12:'USB_DN_DP',13:'USB_DN_DN',14:'PGOOD',15:'GND_ISO',16:'GND_ISO',17:'GND_ISO',18:'VDD_ISO_3V3',19:'GND_ISO',20:'VBUS_ISO_5V'},'PRIMARY_SOURCE_PIN_MAP_VERIFIED_LIVE_ZERO_STOCK'),
    part('U2','ISOLATED_5V_POWER','NXE1S0505MC-R7',null,{1:'GND_UP',3:'VBUS_UP',7:'GND_ISO',8:'VBUS_ISO_5V',14:'NC'},'PRIMARY_SOURCE_PIN_MAP_VERIFIED_FOOTPRINT_PENDING'),
    part('J_UP','UPSTREAM_USB_C_UFP','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{},'APPROVED_ASSET_LIVE_STOCK'),
    part('J_DN','DOWNSTREAM_USB_C_DFP','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{},'APPROVED_ASSET_LIVE_STOCK'),
    part('D_UP','UPSTREAM_USB_ESD','USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_UP_DP_CONN',2:'GND_UP',3:'USB_UP_DN_CONN',4:'USB_UP_DN',5:'VBUS_UP',6:'USB_UP_DP'},'APPROVED_ASSET_LIVE_STOCK'),
    part('D_DN','DOWNSTREAM_USB_ESD','USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_DN_DP_CONN',2:'GND_ISO',3:'USB_DN_DN_CONN',4:'USB_DN_DN',5:'VBUS_ISO_5V',6:'USB_DN_DP'},'APPROVED_ASSET_LIVE_STOCK'),
    part('C_UP','UPSTREAM_USB_POWER_AND_ISOLATOR_DECOUPLING','CL10B104KB8NNNC','Capacitor_SMD:C_0603_1608Metric',{},approvedAssetFor('CL10B104KB8NNNC')?'APPROVED_EXACT_ASSET':'BLOCKED_MISSING_APPROVED_EXACT_ASSET'),
    part('C_DN','DOWNSTREAM_USB_POWER_AND_ISOLATOR_DECOUPLING','CL10B104KB8NNNC','Capacitor_SMD:C_0603_1608Metric',{},approvedAssetFor('CL10B104KB8NNNC')?'APPROVED_EXACT_ASSET':'BLOCKED_MISSING_APPROVED_EXACT_ASSET'),
  ],
  mandatoryUnresolved:[
    'Select and primary-source verify an exact 24 MHz crystal and load network for XI1/XO1.',
    'Resolve an exact orderable TPS25810 suffix and authoritative 20-pin map/footprint for downstream USB-C attach, Rp advertisement, cold VBUS switching, discharge, and current limiting.',
    'Create and independently verify the Murata NXE1S0505MC iLGA footprint from manufacturer dimensions.',
    'Add the four required 100 nF VBUS/VDD bypass capacitors plus converter input/output filtering from manufacturer guidance.',
    'Select a power architecture that covers isolator consumption plus the advertised downstream USB-C load; this 5 V/200 mA, 1 W candidate cannot supply even a 500 mA USB 2.0 downstream load, much less 1.5 A or 3 A.',
  ],
  evidenceRequired:['exactAssetsApproved','dataIsolationRatingVerified','isolatedPowerRatingVerified','separateGroundDomainsVerified','allLayerKeepoutVerified','creepageClearanceVerified','upstreamEsdDischargeVerified','downstreamEsdDischargeVerified','bothSideDecouplingVerified','typeCAttachAndPowerPolicyVerified','usbSignalIntegrityVerified','powerBudgetThermalVerified','mechanicalEnvelopeVerified','productionHipotAndFunctionalTestVerified'],
})

function part(ref,role,mpn,footprint,pinMap,status){return{ref,role,mpn,footprint,pinMap,status}}

export function validateUsbIsolatorProductionProposal(proposal={}){
  const errors=[],bom=Array.isArray(proposal.bom)?proposal.bom:[],roles=bom.map(x=>String(x.role||'').toLowerCase()),has=p=>roles.some(x=>p.test(x))
  for(const [p,code] of [[/usb.*isolator/,'usb-isolator-device-missing'],[/isolated.*power/,'usb-isolator-isolated-power-missing'],[/upstream.*connector|upstream.*ufp/,'usb-isolator-upstream-connector-missing'],[/downstream.*connector|downstream.*dfp/,'usb-isolator-downstream-connector-missing'],[/upstream.*esd/,'usb-isolator-upstream-esd-missing'],[/downstream.*esd/,'usb-isolator-downstream-esd-missing'],[/upstream.*decoupling/,'usb-isolator-upstream-decoupling-missing'],[/downstream.*decoupling/,'usb-isolator-downstream-decoupling-missing']])if(!has(p))errors.push(code)
  const refs=new Set(bom.map(x=>x.ref));if(refs.size!==bom.length)errors.push('usb-isolator-duplicate-reference')
  const blocked=bom.filter(x=>!['APPROVED_EXACT_ASSET','APPROVED_ASSET_LIVE_STOCK'].includes(x.status));if(blocked.length)errors.push('usb-isolator-exact-assets-unapproved')
  if(proposal.requirements?.separateGroundDomains!==true||proposal.domains?.upstream?.ground===proposal.domains?.downstream?.ground||(proposal.domains?.directCopperCrossings||[]).length)errors.push('usb-isolator-ground-domain-separation-invalid')
  const feature=proposal.outline?.purposefulFeatures||{},area=polygonArea(proposal.outline?.points)
  if(proposal.outline?.closed!==true||!Number.isFinite(area)||area>(proposal.maximumAreaMm2||0)||feature.opposedIsolationNotches!==2||feature.allLayerCopperKeepoutWidthMm<5||feature.minimumCreepageMm<proposal.requirements?.isolatorPackageCreepageMm||feature.minimumClearanceMm<proposal.requirements?.isolatorPackageClearanceMm)errors.push('usb-isolator-purposeful-outline-invalid')
  for(const key of proposal.evidenceRequired||[])if(proposal.semanticEvidence?.[key]!==true)errors.push(`usb-isolator-evidence-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}-missing`)
  return{schema:'boardforge.phase2c.usb-isolator-remediation-gate.v1',ok:errors.length===0,errors,areaMm2:area,maximumAreaMm2:proposal.maximumAreaMm2,blockedRefs:blocked.map(x=>x.ref)}
}
function polygonArea(points=[]){if(points.length<3)return NaN;let s=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
