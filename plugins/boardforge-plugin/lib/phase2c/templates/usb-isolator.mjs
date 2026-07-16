export const USB_ISOLATOR_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.usb-isolator.v1'

// This is deliberately a proposal, not an approved production template. The
// isolator is active but had zero live stock in the 2026-07-16 provider check;
// the USB-C DFP controller suffix, clock, and exact custom DC/DC land pattern
// must be closed before this can become a generated/accepted board.
export const usbIsolatorProductionProposal=Object.freeze({
  schema:USB_ISOLATOR_PROPOSAL_SCHEMA,status:'BLOCKED_PENDING_EXACT_ASSETS_AND_LIVE_STOCK',
  architecture:'USB 2.0 high-speed host-side isolator with upstream UFP USB-C and downstream DFP USB-C',
  primarySources:{
    isolator:'https://www.analog.com/media/en/technical-documentation/data-sheets/adum3165-adum3166.pdf',
    referenceDesign:'https://www.analog.com/media/en/reference-design-documentation/reference-designs/cn0550.pdf',
    isolatedPower:'https://pim.murata.com/en-us/pim/details/?partNum=NXE1S0505MC',
    typeCSource:'https://www.ti.com/lit/ds/symlink/tps25810.pdf',
    esd:'https://www.st.com/content/st_com/en/technical-documents/DS4260.html',
  },
  requirements:{usbSpeedMbps:480,dataIsolationVrms:3750,isolatorPackageCreepageMm:5.3,isolatorPackageClearanceMm:5.3,boardKeepoutRequired:true,separateGroundDomains:true},
  bom:[
    part('U1','USB_HIGH_SPEED_ISOLATOR','ADUM3165BRSZ','Package_SO:SSOP-20_5.3x7.2mm_P0.65mm',{1:'VBUS_UP',2:'GND_UP',3:'VDD_UP_3V3',4:'GND_UP',5:'XTAL_IN',6:'XTAL_OUT',7:'GND_UP',8:'USB_UP_DP',9:'USB_UP_DN',10:'GND_UP',11:'GND_ISO',12:'USB_DN_DP',13:'USB_DN_DN',14:'PGOOD',15:'GND_ISO',16:'GND_ISO',17:'GND_ISO',18:'VDD_ISO_3V3',19:'GND_ISO',20:'VBUS_ISO_5V'},'PRIMARY_SOURCE_PIN_MAP_VERIFIED_LIVE_ZERO_STOCK'),
    part('U2','ISOLATED_5V_POWER','NXE1S0505MC-R7',null,{1:'GND_UP',3:'VBUS_UP',7:'GND_ISO',8:'VBUS_ISO_5V',14:'NC'},'PRIMARY_SOURCE_PIN_MAP_VERIFIED_FOOTPRINT_PENDING'),
    part('J_UP','UPSTREAM_USB_C_UFP','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{},'APPROVED_ASSET_LIVE_STOCK'),
    part('J_DN','DOWNSTREAM_USB_C_DFP','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',{},'APPROVED_ASSET_LIVE_STOCK'),
    part('D_UP','UPSTREAM_USB_ESD','USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_UP_DP_CONN',2:'GND_UP',3:'USB_UP_DN_CONN',4:'USB_UP_DN',5:'VBUS_UP',6:'USB_UP_DP'},'APPROVED_ASSET_LIVE_STOCK'),
    part('D_DN','DOWNSTREAM_USB_ESD','USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',{1:'USB_DN_DP_CONN',2:'GND_ISO',3:'USB_DN_DN_CONN',4:'USB_DN_DN',5:'VBUS_ISO_5V',6:'USB_DN_DP'},'APPROVED_ASSET_LIVE_STOCK'),
  ],
  mandatoryUnresolved:[
    'Select and primary-source verify an exact 24 MHz crystal and load network for XI1/XO1.',
    'Resolve an exact orderable TPS25810 suffix and authoritative 20-pin map/footprint for downstream USB-C attach, Rp advertisement, cold VBUS switching, discharge, and current limiting.',
    'Create and independently verify the Murata NXE1S0505MC iLGA footprint from manufacturer dimensions.',
    'Add the four required 100 nF VBUS/VDD bypass capacitors plus converter input/output filtering from manufacturer guidance.',
    'Select a power architecture that covers isolator consumption plus the advertised downstream USB-C load; this 5 V/200 mA, 1 W candidate cannot supply even a 500 mA USB 2.0 downstream load, much less 1.5 A or 3 A.',
  ],
})

function part(ref,role,mpn,footprint,pinMap,status){return{ref,role,mpn,footprint,pinMap,status}}
