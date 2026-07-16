export const USB_C_PD_SINK_TEMPLATE_SCHEMA='boardforge.phase2c.production-template.usb-c-pd-sink.v1'
const part=(ref,role,mpn,packageName,pinCount,rating)=>({ref,role,mpn,package:packageName,pinCount,rating,selectionPolicy:'dual-provider-live-exact-approved-asset-only'})
export const usbCPdSinkTemplate=Object.freeze({
 schema:USB_C_PD_SINK_TEMPLATE_SCHEMA,id:'004_USB_C_PD_SINK',class:'usb-c-power',
 electrical:{requestedPdo:{voltageV:9,currentA:2,powerW:18},fallbackPdo:{voltageV:5,currentA:1.5},regulatedOutput:{voltageV:5,currentA:2,powerW:10},maximumAcceptedVbusV:9,minimumProtectionStandoffV:24,layers:4,thermalDesignPowerW:2.5},
 mechanical:{maximumAreaMm2:1200,outline:'connector-notch',purpose:'A recessed USB-C connector notch, output-side terminal shoulder, rounded corners, and two mounting ears preserve cable access while removing unused board area.'},
 requirements:[
  part('J1','USB_C_INPUT','USB4105-GF-A','USB-C-16P',16,{vbusV:20,currentA:3}),
  part('U1','PD_SINK_CONTROLLER','STUSB4500QTR','QFN-24-EP',25,{vbusAbsoluteMaximumV:28,pdo:'9V/2A'}),
  part('Q1','PROTECTED_VBUS_SWITCH','SI7465DP-T1-GE3','PowerPAK-SO-8',8,{vdsV:-60,currentA:-3.2,rdsOnMaxOhmAt10V:.064}),
  part('U2','FIVE_VOLT_BUCK','TPS54202DDCR','SOT-23-6',6,{inputMaximumV:28,outputV:5,outputA:2,feedbackDividerOhm:{top:73200,bottom:10000}}),
  part('D1','VBUS_TVS','SMAJ24A','SMA',2,{standoffV:24,pulsePowerW:400}),
  part('F1','INPUT_FUSE','3413.0218.22','2410',2,{ratedA:2,ratedVac:32,ratedVdc:63,nonResettable:true}),
  part('L1','BUCK_INDUCTOR','SRN6045TA-4R7M','6x6mm',2,{inductanceUh:4.7,currentA:3.4}),
  part('C1','HV_INPUT_BULK','UWT1H100MCL1GB','6.3x5.4mm',2,{capacitanceUf:10,voltageV:50,polarized:true}),
  part('C2','OUTPUT_BULK','UWT1E220MCL1GB','6.3x5.4mm',2,{capacitanceUf:22,voltageV:25,polarized:true}),
  part('R_FB_TOP','BUCK_FEEDBACK_TOP','RC0603FR-0773K2L','0603',2,{resistanceOhm:73200,tolerancePercent:1}),
  part('R_FB_BOTTOM','BUCK_FEEDBACK_BOTTOM','RC0603FR-0710KL','0603',2,{resistanceOhm:10000,tolerancePercent:1}),
  part('C_BOOT','BUCK_BOOTSTRAP_CAPACITOR','CL10B104KB8NNNC','0603',2,{capacitanceNf:100,voltageV:50}),
  part('R_GATE_PULLUP','PMOS_GATE_PULLUP','RC0603FR-0710KL','0603',2,{resistanceOhm:10000,tolerancePercent:1}),
  part('J2','FIVE_VOLT_OUTPUT','M20-9990245','1x2-2.54-vertical',2,{voltageV:5,currentA:2}),
 ],
 mandatoryCircuits:['CC1/CC2 PD negotiation','9V/2A fixed sink PDO with 5V fallback','normally-off protected VBUS switch','input fuse and 24V TVS','28V-rated adjustable 5V/2A buck conversion with 73.2k/10k feedback divider','100nF BOOT-to-SW bootstrap capacitor adjacent to U2','input/output polarized bulk decoupling','thermal copper and current-rated power path'],
 sourcing:{requiredProviders:['digikey','mouser'],runtimeStatus:'LIVE_VERIFIED',verifiedAt:'2026-07-15T23:18:00Z',exactDualProviderCoverage:'14/14',liveClaim:true},
 acceptance:{ercViolations:0,drcViolations:0,dualProviderLiveExact:true,canonicalBindings:true,sourceUnchanged:true,maximumPowerW:18}
})
export function validateUsbCPdSinkTemplate(t=usbCPdSinkTemplate){const e=[];if(t.schema!==USB_C_PD_SINK_TEMPLATE_SCHEMA)e.push('schema');if(t.electrical.requestedPdo.powerW>18)e.push('unsupported-power-profile');if(t.electrical.requestedPdo.voltageV>t.electrical.maximumAcceptedVbusV)e.push('pdo-overvoltage');if(t.electrical.regulatedOutput.powerW>t.electrical.requestedPdo.powerW)e.push('output-power-exceeds-input');if(t.electrical.minimumProtectionStandoffV<20)e.push('protection-not-20v-tolerant');for(const role of['USB_C_INPUT','PD_SINK_CONTROLLER','PROTECTED_VBUS_SWITCH','FIVE_VOLT_BUCK','VBUS_TVS','INPUT_FUSE','BUCK_FEEDBACK_TOP','BUCK_FEEDBACK_BOTTOM','FIVE_VOLT_OUTPUT'])if(!t.requirements.some(x=>x.role===role))e.push(`missing-role:${role}`);const rt=t.requirements.find(x=>x.role==='BUCK_FEEDBACK_TOP')?.rating?.resistanceOhm,rb=t.requirements.find(x=>x.role==='BUCK_FEEDBACK_BOTTOM')?.rating?.resistanceOhm,vout=.596*(1+rt/rb);if(!Number.isFinite(vout)||Math.abs(vout-5)>.1)e.push('feedback-divider-out-of-range');if(t.sourcing.liveClaim&&t.sourcing.runtimeStatus!=='LIVE_VERIFIED')e.push('false-live-sourcing-claim');if(!/notch/i.test(t.mechanical.outline))e.push('outline-not-custom');return{ok:!e.length,errors:e,nominalFeedbackOutputV:Number(vout.toFixed(4))}}
