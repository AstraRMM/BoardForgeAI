export const RELAY_CONTROLLER_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.relay-controller.v1'

export const relayControllerProductionProposal=Object.freeze({
  schema:RELAY_CONTROLLER_PROPOSAL_SCHEMA,status:'BLOCKED_PENDING_LOAD_AND_CHANNEL_REQUIREMENTS',boardId:'013_RELAY_CONTROLLER',
  architecture:'SELV logic controller driving protected low-side relay coils with isolated dry-contact terminal outputs',
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
})

export function validateRelayControllerArchitecture(definition={}){const bom=definition.bom||[],roles=bom.map(x=>String(x.role||'').toLowerCase()),has=p=>roles.some(x=>p.test(x)),errors=[];if(!has(/relay/))errors.push('relay-device-missing');if(!has(/relay.*driver|coil.*driver/))errors.push('relay-coil-driver-missing');if(!has(/contact.*terminal|relay.*terminal/))errors.push('relay-contact-terminal-missing');if(!has(/coil.*(clamp|flyback)|flyback|clamp.*coil/))errors.push('relay-coil-clamp-evidence-missing');if(!has(/fuse|reverse.*polarity|power.*protection/))errors.push('relay-power-entry-protection-missing');if(!has(/reset.*default|de-energized.*reset|safe.*reset/))errors.push('relay-reset-safe-state-missing');const e=definition.semanticEvidence?.relayController||{};if(!(e.channelCount>0))errors.push('relay-channel-count-undeclared');if(!e.loadRequirementsVerified)errors.push('relay-load-requirements-unverified');if(!e.clearanceVerified)errors.push('relay-contact-clearance-unverified');return{ok:errors.length===0,errors}}
