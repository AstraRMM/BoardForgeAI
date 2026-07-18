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
    14: "VBUS", 15: "VBUS",
    // These are open-collector status/test outputs, not grounds.  A fixed
    // source with no host/status interface must leave them electrically open
    // and emit actual KiCad no-connect markers.
    16: null, 17: null, 18: null, 19: null, 20: null,
    21: "GND",
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
    // 2 A 1206 fuse candidate.  The board must re-resolve its authoritative
    // pads and pass fresh dual-provider evidence before this can be released.
    { ref: "F1", role: "INPUT_FUSE", mpn: "0451002.MRL", pinCount: 2 },
    { ref: "D1", role: "INPUT_TVS", mpn: "SMAJ5.0A", pinCount: 2 },
    { ref: "U1", role: "TYPE_C_DFP_CONTROLLER_AND_POWER_SWITCH", mpn: "TPS25810RVCR", pinCount: 21 },
    { ref: "J2", role: "USB_C_DFP_OUTPUT", mpn: "USB4105-GF-A", pinCount: 16 },
    { ref: "C_IN", role: "INPUT_BULK", mpn: "UWT1E220MCL1GB", pinCount: 2 },
    { ref: "C_OUT", role: "OUTPUT_BYPASS", mpn: "UWT1E220MCL1GB", pinCount: 2 },
    { ref: "C_AUX", role: "CONTROLLER_BYPASS", mpn: "CC0603ZRY5V8BB104", pinCount: 2 },
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

/**
 * Converts the reviewed training intent into the narrow real-board-proof
 * input shape.  This is deliberately a candidate definition: the runner
 * creates KiCad files and validation evidence but never promotes this into a
 * delivery or manufacturing acceptance by itself.
 */
export function usbCFixedSourceRealBoardDefinition(template = usbCFixedSourceTemplate) {
  const contract = validateUsbCFixedSourceTemplate(template);
  if (!contract.ok) throw new Error(`USB-C fixed-source contract is invalid: ${contract.errors.join("; ")}`);
  return {
    id: "usb-c-fixed-source",
    topologyId: "usb-c-fixed-source",
    name: "USB-C Fixed 5 V / 1.5 A Source",
    preset: "blank-custom",
    // 892 mm²: the recessed output edge and the opposite input shoulder are
    // intentional mechanical constraints, not a rectangular fallback.
    outlinePoints: [[0, 0], [45, 0], [45, 20], [4, 20], [4, 18], [0, 18]],
    widthMm: 45,
    heightMm: 20,
    layers: template.mechanical.layers,
    // Native KiCad symbol bodies (especially the USB-C receptacle) have
    // meaningful physical extents.  Keep their labelled pin stubs in distinct
    // schematic lanes: the earlier generic grid put U1 GND directly through
    // C_OUT VBUS and created a real, silent GND/VBUS short in the netlist.
    schematicPlacements: {
      J1: { x: 22.86, y: 25.4 }, F1: { x: 60.96, y: 25.4 }, D1: { x: 99.06, y: 25.4 },
      U1: { x: 127, y: 63.5 }, J2: { x: 22.86, y: 86.36 },
      C_IN: { x: 71.12, y: 88.9 }, C_OUT: { x: 177.8, y: 96.52 },
      C_AUX: { x: 101.6, y: 101.6 }, R_REF: { x: 132.08, y: 116.84 },
      R_FAULT: { x: 165.1, y: 132.08 },
    },
    // The source is a single-sheet board. Root-sheet labels preserve the
    // bare canonical net names without the global-label collision mode that
    // KiCad reports for the duplicated USB-C power contacts.
    globalConnectivityLabels: false,
    // Explicit symbol locations are part of the generated project contract.
    // Without them, authoritative symbol pins from independently resolved
    // packages can land on the same default sheet location and KiCad quite
    // correctly reports two distinct net labels on one connection point.
    schematicPlacements: {
      J2: { x: 38.1, y: 101.6 }, U1: { x: 127.0, y: 101.6 },
      J1: { x: 38.1, y: 152.4 }, F1: { x: 63.5, y: 152.4 },
      D1: { x: 88.9, y: 152.4 }, C_IN: { x: 63.5, y: 127.0 },
      C_OUT: { x: 152.4, y: 127.0 }, C_AUX: { x: 114.3, y: 127.0 },
      R_REF: { x: 101.6, y: 76.2 }, R_FAULT: { x: 139.7, y: 152.4 },
    },
    prompt: "Generate the reviewed fixed 5 V / 1.5 A Type-C DFP. USB-PD and configuration EEPROM are explicitly absent.",
    intent: [
      "regulated SELV 5 V input",
      "fuse and TVS protection",
      "TPS25810 fixed 1.5 A Type-C current advertisement",
      "recessed USB-C output edge",
      "no USB-PD and no configuration EEPROM",
      "Board005 fabrication intent: standard 0.20 mm routing, with one source-backed 0.10 mm REF_RTN WQFN escape only",
    ],
    bom: template.requirements.map((part) => ({
      ref: part.ref,
      value: part.mpn,
      mpn: part.mpn,
      role: part.role,
      verificationStatus: "APPROVED_MAPPING",
    })),
    semanticEvidence: {
      usbCFixedSource: {
        contract: template.schema,
        noUsbPowerDelivery: true,
        noConfigurationEeprom: true,
        advertisedCurrentA: template.electrical.output.advertisedCurrentA,
        worstConnectorVbus: contract.worstConnectorVbus,
        fabricationCapability: { provider: "PCBWay", source: "https://www.pcbway.com/capabilities.html", stackup: "4-layer", minTraceWidthMm: 0.1, restrictedNet: "REF_RTN", restrictedPurpose: "TPS25810 0.5 mm-pitch reference-return escape" },
      },
    },
  };
}

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
      if (!Object.prototype.hasOwnProperty.call(template.controllerNetMap || {}, pin)) {
        errors.push(`tps25810-net-map-missing:${pin}`);
        continue;
      }
      const net = template.controllerNetMap[pin];
      if (["16", "17", "18", "19", "20"].includes(pin)) {
        if (net != null) errors.push(`tps25810-open-collector-must-be-open:${pin}`);
      } else if (!net) errors.push(`tps25810-net-map-missing:${pin}`);
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
