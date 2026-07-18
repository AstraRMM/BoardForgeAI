export const INDUSTRIAL_IO_TEMPLATE_SCHEMA = "boardforge.phase2c.production-template.industrial-io.v2";

const part = (ref, role, mpn, pinCount, rating = {}) => ({ ref, role, mpn, pinCount, rating });

// This is a source-correct two-channel, group-isolated 24 V digital-input
// module. ISO1212 derives its field-side power from its inputs; adding an
// unrelated isolated DC/DC converter would not make the input circuit safer.
export const industrialIoTemplate = Object.freeze({
  schema: INDUSTRIAL_IO_TEMPLATE_SCHEMA,
  id: "006_INDUSTRIAL_IO",
  class: "industrial-control",
  purpose: "two-channel isolated 24 V digital-input controller",
  outline: { kind: "custom", family: "din rail", maximumAreaMm2: 2650, maximumWidthMm: 88, minimumRailClearanceMm: 3 },
  electrical: { layers: 4, fieldInputMaximumVdc: 24, logicVoltageV: 3.3, galvanicallyIsolated: true, noMains: true, minimumIsolationVrms: 2500, minimumCreepageMm: 4, minimumClearanceMm: 3.2 },
  requirements: [
    part("J1", "FIELD_INPUT_TERMINAL", "1725656", 4, { ratedV: 250, ratedA: 12 }),
    part("F1", "FIELD_INPUT_FUSE", "0451002.MRL", 2, { ratedVdc: 125, ratedA: 2 }),
    part("D1", "FIELD_TVS", "SMBJ33A", 2, { standoffV: 33 }),
    part("U1", "ISOLATED_DIGITAL_INPUT", "ISO1212DBQR", 16, { channels: 2, isolationVrms: 2500 }),
    part("U2", "LOGIC_CONTROLLER", "STM32F103C8T6", 48, { logicVoltageV: 3.3 }),
    part("J2", "LOGIC_IO_HEADER", "M20-9990645", 6, { logicVoltageV: 3.3 }),
    part("R1", "ISO1212_RTHR_CH1", "MMA02040C1001FB300", 2, { ohms: 1000, ratedPowerW: 0.4 }),
    part("R2", "ISO1212_RTHR_CH2", "MMA02040C1001FB300", 2, { ohms: 1000, ratedPowerW: 0.4 }),
    part("R3", "ISO1212_RSENSE_CH1", "RC0603FR-07562RL", 2, { ohms: 562, ratedPowerW: 0.1, tolerancePercent: 1 }),
    part("R4", "ISO1212_RSENSE_CH2", "RC0603FR-07562RL", 2, { ohms: 562, ratedPowerW: 0.1, tolerancePercent: 1 }),
    part("C1", "ISO1212_CIN_CH1", "CC0603KRX7R9BB103", 2, { farads: 10e-9, ratedVoltageV: 50 }),
    part("C2", "ISO1212_CIN_CH2", "CC0603KRX7R9BB103", 2, { farads: 10e-9, ratedVoltageV: 50 }),
    part("C3", "ISO1212_LOGIC_DECOUPLING", "CC0603ZRY5V8BB104", 2, { farads: 100e-9, ratedVoltageV: 25 }),
  ],
  iso1212Networks: [
    { channel: 1, RTHR: { ref: "R1", mpn: "MMA02040C1001FB300", ohms: 1000, ratedPowerW: 0.4 }, RSENSE: { ref: "R3", mpn: "RC0603FR-07562RL", ohms: 562, ratedPowerW: 0.1 }, CIN: { ref: "C1", mpn: "CC0603KRX7R9BB103", farads: 10e-9, ratedVoltageV: 50 } },
    { channel: 2, RTHR: { ref: "R2", mpn: "MMA02040C1001FB300", ohms: 1000, ratedPowerW: 0.4 }, RSENSE: { ref: "R4", mpn: "RC0603FR-07562RL", ohms: 562, ratedPowerW: 0.1 }, CIN: { ref: "C2", mpn: "CC0603KRX7R9BB103", farads: 10e-9, ratedVoltageV: 50 } },
  ],
  mandatoryCircuits: [
    "fused and TVS-clamped 24 V field entry",
    "two ISO1212 input networks with 1 kilohm RTHR, 562 ohm RSENSE and 10 nF CIN",
    "logic-side ISO1212 0.1 uF bypass located at VCC1/GND1",
    "3.3 V STM32 controller and service header",
  ],
  isolationGate: { failClosed: true, requiredEvidence: ["KiCad DRC with isolation keepout", "creepage and clearance geometry report", "TI ISO1212 2500 VRMS rating", "field/logic net-domain audit", "exact input-network component and pin-map binding"] },
  sourcing: { exactMpnRequired: true, liveClaim: false, runtimeStatus: "REQUIRES_LIVE_VERIFICATION" },
  acceptance: { minimumFunctionalBlocks: 4, placeholderPartsAllowed: false, zeroUnroutedRequired: true, dinRailOutlineRequired: true },
});

export function validateIndustrialIoTemplate(template = industrialIoTemplate) {
  const errors = [];
  if (template.schema !== INDUSTRIAL_IO_TEMPLATE_SCHEMA) errors.push("schema");
  if (template.id !== "006_INDUSTRIAL_IO" || template.class !== "industrial-control") errors.push("manifest-identity");
  if (template.outline?.kind !== "custom" || template.outline?.family !== "din rail") errors.push("din-rail-outline-required");
  if (template.outline?.maximumAreaMm2 > 2650) errors.push("area-exceeds-manifest");
  if (!template.electrical?.noMains) errors.push("mains-input-forbidden");
  if (!template.electrical?.galvanicallyIsolated) errors.push("field-isolation-required");
  if (template.electrical?.minimumIsolationVrms < 2500) errors.push("isolation-rating-too-low");
  if (template.electrical?.minimumCreepageMm < 4) errors.push("creepage-too-small");
  if (template.electrical?.minimumClearanceMm < 3.2) errors.push("clearance-too-small");
  for (const role of ["FIELD_INPUT_TERMINAL", "FIELD_INPUT_FUSE", "FIELD_TVS", "ISOLATED_DIGITAL_INPUT", "LOGIC_CONTROLLER", "LOGIC_IO_HEADER", "ISO1212_RTHR_CH1", "ISO1212_RTHR_CH2", "ISO1212_RSENSE_CH1", "ISO1212_RSENSE_CH2", "ISO1212_CIN_CH1", "ISO1212_CIN_CH2", "ISO1212_LOGIC_DECOUPLING"]) if (!template.requirements?.some((part) => part.role === role)) errors.push(`missing-role:${role}`);
  if (!template.isolationGate?.failClosed) errors.push("isolation-gate-must-fail-closed");
  if (template.sourcing?.liveClaim && template.sourcing?.runtimeStatus !== "LIVE_VERIFIED") errors.push("false-live-claim");
  if (template.acceptance?.minimumFunctionalBlocks < 4) errors.push("insufficient-functional-blocks");
  return { ok: !errors.length, errors };
}

export const INDUSTRIAL_IO_PRODUCTION_TOPOLOGY_REQUIREMENTS = Object.freeze({
  iso1212: { channels: 2, requiredNetworkRoles: Object.freeze(["RTHR", "RSENSE", "CIN"]), requiredNoConnectPins: Object.freeze(["6", "7", "12", "13"]), pinMap: Object.freeze({ 1: "GND", 2: "3V3", 3: "EN", 4: "LOGIC_IN1", 5: "LOGIC_IN2", 8: "GND", 9: "FIELD_GND2", 10: "FIELD_IN2", 11: "FIELD_SENSE2", 14: "FIELD_GND1", 15: "FIELD_IN1", 16: "FIELD_SENSE1" }) },
  isolationCorridor: { minimumClearanceMm: 3.2, minimumCreepageMm: 4, keepoutRequired: true },
  stm32f103c8t6: { requiredPowerPins: Object.freeze(["1", "8", "9", "23", "24", "35", "36", "47", "48"]) },
});

export function validateIndustrialIoProductionTopology(evidence = {}) {
  const errors = [], requirements = INDUSTRIAL_IO_PRODUCTION_TOPOLOGY_REQUIREMENTS, iso = evidence.iso1212 || {};
  if (iso.primarySourceVerified !== true) errors.push("iso1212-primary-source-unverified");
  for (const [pin, net] of Object.entries(requirements.iso1212.pinMap)) if (iso.pinMap?.[pin] !== net) errors.push(`iso1212-pin-${pin}-must-be-${net}`);
  const channels = iso.channels || [];
  for (let index = 0; index < requirements.iso1212.channels; index++) for (const role of requirements.iso1212.requiredNetworkRoles) {
    const component = channels[index]?.[role];
    if (!component?.primarySourceVerified || !component?.designCalculationVerified || !component?.ref || !component?.liveDigiKeyVerified || !component?.liveMouserVerified) errors.push(`iso1212-channel-${index + 1}-${role.toLowerCase()}-unproven`);
    else if (role === "CIN" ? !((component.farads || 0) > 0 && (component.ratedVoltageV || 0) > 0) : !((component.ohms || 0) > 0 && (component.ratedPowerW || 0) > 0)) errors.push(`iso1212-channel-${index + 1}-${role.toLowerCase()}-value-or-rating-invalid`);
  }
  for (const pin of requirements.iso1212.requiredNoConnectPins) if (!iso.noConnectPins?.includes(pin)) errors.push(`iso1212-pin-${pin}-must-be-nc`);
  if (iso.inputPathVerified !== true) errors.push("iso1212-input-path-unverified");
  if (iso.logicDecouplingVerified !== true) errors.push("iso1212-logic-decoupling-unverified");
  const corridor = evidence.isolationCorridor || {};
  if (corridor.keepoutVerified !== true) errors.push("isolation-keepout-unverified");
  if ((corridor.clearanceMm || 0) < requirements.isolationCorridor.minimumClearanceMm) errors.push("isolation-clearance-below-3.2mm");
  if ((corridor.creepageMm || 0) < requirements.isolationCorridor.minimumCreepageMm) errors.push("isolation-creepage-below-4mm");
  const connected = new Set(evidence.stm32?.connectedPowerPins || []);
  for (const pin of requirements.stm32f103c8t6.requiredPowerPins) if (!connected.has(pin)) errors.push(`stm32-power-pin-${pin}-unconnected`);
  if (evidence.assetBinding?.iso1212ExactMpnVerified !== true || evidence.assetBinding?.networkSymbolFootprintPinMapVerified !== true) errors.push("iso1212-production-asset-binding-unverified");
  return { ok: !errors.length, errors, requirements };
}
