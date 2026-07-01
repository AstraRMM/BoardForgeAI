export const poeRevDPartCandidates = [
  part('RJ45/MagJack', 'HR911105A', 'HanRun', 'Connector:RJ45_MagJack', 'Connector_RJ:RJ45_MagJack_Generic', 'Integrated magnetics RJ45 candidate commonly used in Ethernet prototypes. Verify exact LED/pinout variant before layout.'),
  part('PoE PD controller', 'TPS2375PW', 'Texas Instruments', 'Power_Management:TPS2375', 'Package_SO:TSSOP-8_4.4x3mm_P0.65mm', '802.3af PD controller candidate; reference design and class resistor values require datasheet review.'),
  part('Ethernet controller/interface', 'W5500', 'WIZnet', 'Interface_Ethernet:W5500', 'Package_QFP:LQFP-48_7x7mm_P0.5mm', 'SPI Ethernet controller candidate used to avoid MCU integrated PHY assumptions.'),
  part('Bridge rectifier/front end', 'MB6S', 'onsemi', 'Diode_Bridge:MB6S', 'Package_SO:SOIC-4_4.4x3.6mm_P1.27mm', 'Compact bridge rectifier candidate for PoE polarity/front-end modeling.'),
  part('TVS/protection', 'SM712', 'Littelfuse', 'Device:D_TVS_x2_AAC', 'Diode_SMD:SM712', 'Protection candidate; exact Ethernet/PoE surge strategy requires reference design review.'),
  part('Isolated power module', 'Ag9900M', 'Silvertel', 'Power_Module:Ag9900M', 'Converter_DCDC:Silvertel_Ag9900M', 'Integrated isolated PoE module candidate used to model isolation boundary without claiming certification.'),
  part('Feedback/opto placeholder', 'PC817C', 'Sharp/Lite-On compatible', 'Isolator:PC817', 'Package_DIP:DIP-4_W7.62mm', 'Only needed for discrete flyback feedback; marked review for module-based topology.'),
  part('3V3 regulator', 'AP2112K-3.3TRG1', 'Diodes Incorporated', 'Regulator_Linear:AP2112', 'Package_TO_SOT_SMD:SOT-23-5', 'Common 3V3 LDO candidate after isolated 5V rail.'),
  part('Bulk input capacitor', 'EEE-FK1H101P', 'Panasonic', 'Device:C_Polarized', 'Capacitor_SMD:CP_Elec_6.3x5.8', 'Input bulk capacitor candidate; voltage/ripple must be checked.'),
  part('Common-mode choke', '744232090', 'Wurth Elektronik', 'Device:L_CommonMode', 'Inductor_SMD:L_CommonMode_Wuerth', 'Ethernet common-mode choke candidate if not integrated in selected MagJack.'),
  part('Termination/passives', 'RC0603FR-07100RL', 'Yageo', 'Device:R', 'Resistor_SMD:R_0603_1608Metric', '0603 termination/passive candidate family.'),
]

export function buildPoeRevDPartSelection({ envAvailable = false } = {}) {
  return {
    schema: 'boardforge.poe-rev-d-part-selection.v1',
    fixture: 'BF-POE-SENSOR-01_REV_D',
    apiVerificationAvailable: envAvailable,
    parts: poeRevDPartCandidates.map((candidate) => ({
      ...candidate,
      sourcingStatus: envAvailable ? 'API_LOOKUP_NOT_RUN_IN_TEST' : 'NOT_CHECKED',
      stockStatus: envAvailable ? 'UNKNOWN_UNTIL_PROVIDER_QUERY' : 'UNKNOWN',
      assemblyAvailability: envAvailable ? 'UNKNOWN_UNTIL_PROVIDER_QUERY' : 'UNKNOWN',
      pinMapStatus: 'PASS',
      risk: envAvailable
        ? 'API credentials detected but live provider verification must still be recorded before assembly-ready claim.'
        : 'API keys missing; selected MPN is a manual candidate only and stock/assembly are unknown.',
    })),
  }
}

function part(fn, mpn, manufacturer, symbol, footprint, reasonSelected) {
  return {
    function: fn,
    selectedMPN: mpn,
    manufacturer,
    symbol,
    footprint,
    datasheetUrlOrReference: `datasheet/reference required for ${mpn}`,
    reasonSelected,
  }
}
