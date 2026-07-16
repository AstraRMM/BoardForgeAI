export const POE_SENSOR_PROPOSAL_SCHEMA='boardforge.phase2c.production-proposal.poe-sensor.v1'

export const poeSensorProductionProposal=Object.freeze({
  schema:POE_SENSOR_PROPOSAL_SCHEMA,
  status:'BLOCKED_PENDING_EXACT_MAGJACK_POE_MODULE_CLOCK_SENSOR_ASSETS_AND_SAFETY_EVIDENCE',
  boardId:'009_POE_SENSOR',maximumAreaMm2:900,
  architecture:'10/100BASE-T PoE-powered environmental sensor with an integrated MAC/PHY, isolated PoE conversion, protected cable interface, isolated primary and SELV sensing domains, and a source-frozen sensor interface',
  primarySources:{
    ethernetController:'https://docs.wiznet.io/img/products/w5500/W5500_ds_v110e.pdf',
    poePd:'https://www.ti.com/lit/ds/symlink/tps2375.pdf',
    isolatedPoeModule:'https://silvertel.com/images/datasheets/Ag9900-datasheet-low-cost-isolated-PoE-module-silvertel.pdf',
    sensor:'https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf',
  },
  candidates:[
    {role:'ETHERNET_MAC_PHY_CONTROLLER',exactMpn:'W5500',status:'APPROVED_EXACT_SYMBOL_FOOTPRINT_PIN_MAP_PENDING_BOARD_LEVEL_SUPPORT_CIRCUIT_EVIDENCE'},
    {role:'POE_PD_AND_ISOLATED_CONVERTER',exactMpn:'Ag9905LP',status:'APPROVED_EXACT_LP_DIL_IDENTITY_PENDING_BOARD_LEVEL_CLASSIFICATION_INPUT_OUTPUT_THERMAL_AND_ISOLATION_EVIDENCE'},
    {role:'POE_PD_CONTROLLER_DISCRETE_ALTERNATIVE',exactMpn:'TPS2375PW',status:'BLOCKED_PENDING_COMPLETE_ISOLATED_FLYBACK_POWER_STAGE'},
    {role:'ENVIRONMENTAL_SENSOR',exactMpn:'BME280',status:'APPROVED_EXACT_SYMBOL_FOOTPRINT_PIN_MAP_PENDING_EXPOSURE_ANALYSIS'},
    {role:'ETHERNET_DATA_MAGJACK_NON_POE',exactMpn:'7499010121A',status:'APPROVED_EXACT_100BASE_TX_DATA_MAGNETICS_PROHIBITED_AS_POE_POWER_PATH'},
    {role:'ETHERNET_REFERENCE_CRYSTAL',exactMpn:'Q22FA2380184517',status:'APPROVED_EXACT_25MHZ_FA238_PENDING_BOARD_LEVEL_LOAD_CAPACITOR_AND_STARTUP_BUDGET'},
  ],
  requiredDomains:['POE_CABLE_PRIMARY','ISOLATION_BARRIER','SELV_SENSOR_SECONDARY'],
  mandatoryUnresolved:[
    'Freeze an authoritative exact MagJack ordering code and prove every signal pair, PoE pair, center tap, shield pin, LED pin, symbol pin and footprint pad mapping.',
    'Choose module or discrete PD topology; never populate TPS2375 and call an incomplete flyback stage an isolated converter. Prove IEEE 802.3 classification, inrush, maintain-power signature, output load, efficiency and thermal limits.',
    'Freeze W5500 package, 25 MHz clock, reset, SPI host, straps, analog supply filtering, termination and decoupling from authoritative reference requirements.',
    'Freeze exact cable-side surge/ESD/common-mode parts and chassis/shield/Bob-Smith treatment for the declared installation and immunity category.',
    'Prove the actual MagJack and isolated power package envelopes, courtyards, routing escape, slots, creepage and four mounting holes fit within the 42 x 20 mm isolation-waist outline.',
    'Freeze exact sensor variant, exposure/condensation strategy, calibration, self-heating limits, host interface and production test.',
  ],
})

export function validatePoeSensorArchitecture(definition={}){
  const roles=(definition.bom||[]).map(x=>String(x.role||'').toLowerCase()),has=p=>roles.some(x=>p.test(x)),errors=[]
  const need=(pattern,code)=>{if(!has(pattern))errors.push(code)}
  need(/ethernet.*mac.*phy|mac.*phy.*ethernet/,'poe-sensor-ethernet-mac-phy-missing')
  need(/rj45|magjack|ethernet.*connector/,'poe-sensor-magjack-missing')
  need(/ethernet.*magnetics|magjack|network.*transformer/,'poe-sensor-magnetics-missing')
  need(/poe.*pd|powered.*device.*controller/,'poe-sensor-pd-missing')
  need(/isolated.*(poe|dc.?dc|converter|power)/,'poe-sensor-isolated-converter-missing')
  need(/ethernet.*(esd|surge|tvs)|cable.*protection/,'poe-sensor-cable-protection-missing')
  need(/ethernet.*clock|25.*mhz.*crystal|phy.*reference/,'poe-sensor-clock-missing')
  need(/ethernet.*strap|phy.*strap/,'poe-sensor-straps-missing')
  need(/ethernet.*decoupling|phy.*decoupling|mac.*phy.*decoupling/,'poe-sensor-decoupling-missing')
  need(/environmental.*sensor|temperature.*humidity.*sensor/,'poe-sensor-sensor-missing')
  need(/isolation.*barrier|primary.*secondary.*keepout/,'poe-sensor-isolation-barrier-missing')
  const e=definition.semanticEvidence?.poeSensor||{}
  for(const [key,code] of [['exactAssetsApproved','poe-sensor-exact-assets-unapproved'],['magjackPinMapVerified','poe-sensor-magjack-pin-map-unverified'],['poeClassificationPowerVerified','poe-sensor-classification-power-unverified'],['isolationSafetyVerified','poe-sensor-isolation-safety-unverified'],['ethernetSignalIntegrityVerified','poe-sensor-signal-integrity-unverified'],['powerThermalVerified','poe-sensor-power-thermal-unverified'],['sensorEnvironmentVerified','poe-sensor-environment-unverified'],['productionTestVerified','poe-sensor-production-test-unverified']])if(e[key]!==true)errors.push(code)
  if(definition.topologyId==='usb-c-esp32-sensor'||definition.topologyId==='stm32-controller')errors.push('poe-sensor-category-mapped-to-generic-controller')
  return{ok:errors.length===0,errors}
}
