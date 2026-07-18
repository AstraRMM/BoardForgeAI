import { approvedAssetFor } from "../../components/approved-production-assets.mjs";
import { resolveAuthoritativeKiCadFootprint } from "../../components/authoritative-kicad-footprint-resolver.mjs";
import { resolveAuthoritativeKiCadSymbol } from "../../components/authoritative-kicad-symbol-resolver.mjs";

export const USB_C_FIXED_SOURCE_TEMPLATE_SCHEMA =
  "boardforge.phase2c.production-template.usb-c-fixed-source.v1";

/**
 * Training replacement for the unprovable TPS25750 PD-source candidate.
 * This is intentionally Type-C current advertisement, not USB-PD: TPS25810
 * has no PDO policy or external configuration EEPROM.  It therefore must
 * never be presented as a USB-PD source.
 */
export const usbCFixedSourceTemplate = Object.freeze({
  schema: USB_C_FIXED_SOURCE_TEMPLATE_SCHEMA,
  id: "005_USB_C_FIXED_5V_SOURCE",
  replaces: "005_USB_C_PD_SOURCE",
  status: "CANDIDATE_PENDING_LIVE_SOURCING_AND_KICAD_ACCEPTANCE",
  class: "usb-c-power",
  primarySource: "https://www.ti.com/lit/gpn/TPS25810",
  electrical: {
    standard: "USB Type-C Revision 1.2 current advertisement; USB-PD explicitly absent",
    input: { type: "regulated-SELV", voltageV: [5.0, 5.25], continuousCurrentA: 2 },
    output: { voltageV: 5, advertisedCurrentA: 1.5, powerW: 7.5 },
    noUsbPowerDelivery: true,
    noConfigurationEeprom: true,
    noBoost: true,
    noMains: true,
    sourceSwitch: {
      controller: "TPS25810RVCR",
      currentLimitA: [1.58, 1.82],
      advertisedCurrentA: 1.5,
      maximumSwitchDropV: 0.0825,
      maximumBoardDropV: 0.08,
      minimumConnectorVbusV: 4.75,
    },
  },
  mechanical: {
    layers: 4,
    maximumAreaMm2: 900,
    outline: "recessed-usb-c-edge-with-input-shoulder",
    purpose:
      "The USB-C receptacle sits in a recessed output edge while the opposite shoulder reserves a short, wide 5 V input path and input fuse access.",
  },
  // Pin functions are copied from TPS25810 Rev C pin-functions table.  Net
  // assignments below are the deliberate fixed-1.5-A configuration, not a
  // synthetic generic-connector map.
  controllerPinFunctions: Object.freeze({
    1: "FAULT", 2: "IN1", 3: "IN1", 4: "IN2", 5: "AUX", 6: "EN",
    7: "CHG", 8: "CHG_HI", 9: "REF_RTN", 10: "REF", 11: "CC1",
    12: "GND", 13: "CC2", 14: "OUT", 15: "OUT", 16: "DEBUG",
    17: "AUDIO", 18: "POL", 19: "UFP", 20: "LD_DET", 21: "GND_PAD",
  }),
  controllerNetMap: Object.freeze({
    1: "FAULT_N", 2: "5V_FUSED", 3: "5V_FUSED", 4: "5V_FUSED",
    5: "5V_FUSED", 6: "5V_FUSED", 7: "5V_FUSED", 8: "GND",
    9: "REF_RTN", 10: "REF", 11: "CC1", 12: "GND", 13: "CC2",
    14: "VBUS", 15: "VBUS", 16: "GND", 17: "GND", 18: "GND",
    19: "GND", 20: "GND", 21: "GND",
  }),
  fixedConfiguration: {
    en: "HIGH_TO_AUX",
    chg: "HIGH_TO_AUX",
    chgHi: "LOW_TO_GND",
    resultingAdvertisement: "1.5A",
    resultingCurrentLimitA: [1.58, 1.82],
    refResistorOhm: 100000,
    refTolerancePercent: 1,
  },
  requirements: [
    { ref: "J1", role: "SELV_5V_INPUT", mpn: "M20-9990245", pinCount: 2 },
    { ref: "F1", role: "INPUT_FUSE", mpn: "3413.0218.22", pinCount: 2 },
    { ref: "D1", role: "INPUT_TVS", mpn: "SMAJ5.0A", pinCount: 2 },
    { ref: "U1", role: "TYPE_C_DFP_CONTROLLER_AND_POWER_SWITCH", mpn: "TPS25810RVCR", pinCount: 21 },
    { ref: "J2", role: "USB_C_DFP_OUTPUT", mpn: "USB4105-GF-A", pinCount: 16 },
    { ref: "C_IN", role: "INPUT_BULK", mpn: "UWT1E220MCL1GB", pinCount: 2 },
    { ref: "C_OUT", role: "OUTPUT_BYPASS", mpn: "UWT1E220MCL1GB", pinCount: 2 },
    { ref: "C_AUX", role: "CONTROLLER_BYPASS", mpn: "CL10B104KB8NNNC", pinCount: 2 },
    { ref: "R_REF", role: "CURRENT_LIMIT_REFERENCE", mpn: "RC0603FR-07100KL", pinCount: 2 },
    { ref: "R_FAULT", role: "FAULT_PULLUP", mpn: "RC0603FR-07100KL", pinCount: 2 },
  ],
  requiredCircuits: [
    "fused and TVS-clamped regulated SELV 5 V input",
    "TPS25810 IN1, IN2, AUX and EN tied to the protected 5 V rail",
    "CHG high and CHG_HI low for fixed 1.5 A Type-C current advertisement",
    "100 kOhm 1% REF to REF_RTN current-limit reference",
    "FAULT pull-up to AUX",
    "CC1 and CC2 directly to the Type-C receptacle",
    "OUT pins to all Type-C VBUS receptacle pads",
    "input bulk before IN1 and at least 10 uF output bypass adjacent to OUT",
  ],
  sourcing: { requiredProviders: ["digikey", "mouser"], liveEvidence: null },
  acceptance: {
    ercErrors: null,
    ercWarnings: null,
    drcErrors: null,
    drcWarnings: null,
    manufacturingAccepted: false,
  },
});

export function validateUsbCFixedSourceTemplate(template = usbCFixedSourceTemplate) {
  const errors = [];
  if (template.schema !== USB_C_FIXED_SOURCE_TEMPLATE_SCHEMA) errors.push("schema");
  if (template.electrical?.noUsbPowerDelivery !== true) errors.push("usb-pd-must-be-explicitly-absent");
  if (template.electrical?.noConfigurationEeprom !== true) errors.push("configuration-eeprom-must-be-absent");
  if (template.electrical?.output?.voltageV !== 5 || template.electrical?.output?.advertisedCurrentA !== 1.5)
    errors.push("fixed-5v-1p5a-contract-invalid");
  if (template.fixedConfiguration?.chg !== "HIGH_TO_AUX" || template.fixedConfiguration?.chgHi !== "LOW_TO_GND")
    errors.push("tps25810-1p5a-strap-invalid");
  if (template.fixedConfiguration?.resultingAdvertisement !== "1.5A") errors.push("tps25810-advertisement-invalid");
  const sourceSwitch = template.electrical?.sourceSwitch || {};
  const worstConnectorVbus = Number(template.electrical?.input?.voltageV?.[0]) - Number(sourceSwitch.maximumSwitchDropV) - Number(sourceSwitch.maximumBoardDropV);
  if (!(worstConnectorVbus >= Number(sourceSwitch.minimumConnectorVbusV))) errors.push("type-c-vbus-drop-budget-invalid");
  if (template.mechanical?.layers !== 4 || !/recessed-usb-c/i.test(template.mechanical?.outline || "")) errors.push("purposeful-fixed-source-mechanics-invalid");
  if (template.requirements?.some((part) => /PD|EEPROM/i.test(`${part.role} ${part.mpn}`))) errors.push("pd-or-eeprom-component-forbidden");
  const requiredRoles = ["SELV_5V_INPUT", "INPUT_FUSE", "INPUT_TVS", "TYPE_C_DFP_CONTROLLER_AND_POWER_SWITCH", "USB_C_DFP_OUTPUT", "CURRENT_LIMIT_REFERENCE"];
  for (const role of requiredRoles) if (!template.requirements?.some((part) => part.role === role)) errors.push(`missing-role:${role}`);
  for (const part of template.requirements || []) if (!approvedAssetFor(part.mpn, { requiredPinCount: part.pinCount })) errors.push(`exact-asset-missing:${part.ref}`);
  const controller = approvedAssetFor("TPS25810RVCR", { requiredPinCount: 21 });
  if (!controller) errors.push("tps25810-authoritative-asset-missing");
  else {
    const symbol = resolveAuthoritativeKiCadSymbol(controller.symbol.libId);
    const footprint = resolveAuthoritativeKiCadFootprint(controller.footprint.libId);
    for (const pin of Object.keys(template.controllerPinFunctions || {})) {
      const symbolPin = symbol.pins.find((row) => String(row.number) === pin);
      if (!symbolPin) errors.push(`tps25810-symbol-pin-missing:${pin}`);
      else if (normalPinName(symbolPin.name) !== normalPinName(template.controllerPinFunctions[pin])) errors.push(`tps25810-symbol-function-mismatch:${pin}`);
      if (!footprint.pads.some((row) => String(row.number) === pin)) errors.push(`tps25810-footprint-pad-missing:${pin}`);
      if (!template.controllerNetMap?.[pin]) errors.push(`tps25810-net-map-missing:${pin}`);
    }
  }
  return { schema: "boardforge.phase2c.usb-c-fixed-source-contract-gate.v1", ok: errors.length === 0, errors, worstConnectorVbus };
}

/** Fresh provider records are required; a template can never manufacture live stock. */
export function validateUsbCFixedSourceReleaseEvidence({ template = usbCFixedSourceTemplate, sourcing = {}, validation = {}, manufacturingAccepted = false } = {}) {
  const contract = validateUsbCFixedSourceTemplate(template), errors = [...contract.errors];
  const expectedMpns = new Set((template.requirements || []).map((part) => part.mpn));
  for (const provider of ["digikey", "mouser"]) {
    const rows = sourcing?.[provider];
    if (!Array.isArray(rows) || rows.length !== expectedMpns.size) { errors.push(`live-${provider}-coverage-missing`); continue; }
    for (const mpn of expectedMpns) {
      const row = rows.find((item) => item?.mpn === mpn);
      if (!row || !(Number(row.quantityAvailable) > 0) || row.lifecycle !== "active" || !row.verifiedAt)
        errors.push(`live-${provider}-evidence-invalid:${mpn}`);
    }
  }
  for (const key of ["ercErrors", "ercWarnings", "drcErrors", "drcWarnings", "unconnected"]) if (validation?.[key] !== 0) errors.push(`kicad-validation-not-clean:${key}`);
  if (manufacturingAccepted !== true) errors.push("manufacturing-acceptance-missing");
  return { schema: "boardforge.phase2c.usb-c-fixed-source-release-gate.v1", ok: errors.length === 0, errors, contract };
}

function normalPinName(value) {
  return String(value || "").replace(/[~{}]/g, "").replace(/_PAD$/, "").toUpperCase();
}
