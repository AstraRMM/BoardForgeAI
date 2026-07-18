import test from "node:test";
import assert from "node:assert/strict";
import { industrialIoTemplate as template, validateIndustrialIoProductionTopology as topologyGate, validateIndustrialIoTemplate as validate } from "../lib/phase2c/templates/industrial-io.mjs";
import { approvedAssetFor } from "../lib/components/approved-production-assets.mjs";
import { industrialIoImplementationGate, industrialIoProductionAssetGate } from "../lib/phase2c/industrial-io-production-engine.mjs";
import { categorySchematicPinMaps } from "../lib/real-board-proof.mjs";

const expectedPinMap = { 1: "GND", 2: "3V3", 3: "EN", 4: "LOGIC_IN1", 5: "LOGIC_IN2", 6: "NC", 7: "NC", 8: "GND", 9: "FIELD_GND2", 10: "FIELD_IN2", 11: "FIELD_SENSE2", 12: "NC", 13: "NC", 14: "FIELD_GND1", 15: "FIELD_IN1", 16: "FIELD_SENSE1" };

test("Board006 binds a source-correct isolated 24 V input envelope", () => {
  assert.deepEqual(validate(template), { ok: true, errors: [] });
  assert.equal(template.id, "006_INDUSTRIAL_IO");
  assert.equal(template.outline.family, "din rail");
  assert.match(template.purpose, /24 V digital-input/i);
  assert.ok(!template.requirements.some((part) => part.role === "ISOLATED_POWER"));
});

test("Board006 retains its no-mains, isolation, and conservative spacing constraints", () => {
  const altered = structuredClone(template);
  altered.electrical.noMains = false;
  altered.electrical.galvanicallyIsolated = false;
  altered.electrical.minimumCreepageMm = 3.9;
  altered.electrical.minimumClearanceMm = 3;
  const errors = validate(altered).errors;
  for (const code of ["mains-input-forbidden", "field-isolation-required", "creepage-too-small", "clearance-too-small"]) assert.ok(errors.includes(code), code);
});

test("Board006 requires both channels' RTHR, RSENSE, CIN, and logic bypass", () => {
  for (const role of ["ISO1212_RTHR_CH1", "ISO1212_RTHR_CH2", "ISO1212_RSENSE_CH1", "ISO1212_RSENSE_CH2", "ISO1212_CIN_CH1", "ISO1212_CIN_CH2", "ISO1212_LOGIC_DECOUPLING"]) {
    const altered = structuredClone(template);
    altered.requirements = altered.requirements.filter((part) => part.role !== role);
    assert.ok(validate(altered).errors.includes(`missing-role:${role}`), role);
  }
});

test("ISO1212DBQR binding follows the TI DBQ pinout and leaves substrate pins unconnected", () => {
  assert.deepEqual(approvedAssetFor("ISO1212DBQR", { requiredPinCount: 16 })?.pinMap, expectedPinMap);
});

test("Board006's generated net projection follows the ISO1212 application circuit", () => {
  const maps = categorySchematicPinMaps({ topologyId: "industrial-io-production" });
  assert.deepEqual(maps.U1, { 1: "GND", 2: "3V3", 3: "3V3", 4: "LOGIC_IN1", 5: "LOGIC_IN2", 8: "GND", 9: "FIELD_GND", 10: "FIELD_IN2_RSENSE", 11: "FIELD_SENSE2", 14: "FIELD_GND", 15: "FIELD_IN1_RSENSE", 16: "FIELD_SENSE1" });
  assert.deepEqual(maps.R1, { 1: "FIELD_IN1", 2: "FIELD_SENSE1" });
  assert.deepEqual(maps.R3, { 1: "FIELD_IN1_RSENSE", 2: "FIELD_GND" });
  assert.deepEqual(maps.C2, { 1: "FIELD_SENSE2", 2: "FIELD_GND" });
  assert.equal(maps.U3, undefined);
});

test("Board006's source-correct input passives have real two-terminal KiCad projections", () => {
  for (const [mpn, footprint] of Object.entries({ MMA02040C1001FB300: "Resistor_SMD:R_MELF_0204", "RC0603FR-07562RL": "Resistor_SMD:R_0603_1608Metric", CC0603KRX7R9BB103: "Capacitor_SMD:C_0603_1608Metric", CC0603ZRY5V8BB104: "Capacitor_SMD:C_0603_1608Metric" })) {
    const asset = approvedAssetFor(mpn, { requiredPinCount: 2 });
    assert.equal(asset?.symbol.pins.length, 2, mpn);
    assert.equal(asset?.footprint.libId, footprint, mpn);
  }
  assert.deepEqual(industrialIoProductionAssetGate(template), { ok: true, errors: [] });
});

test("Board006 refuses candidate generation until actual wiring and geometry evidence exist", () => {
  const result = industrialIoImplementationGate(template);
  assert.equal(result.ok, false);
  for (const code of ["iso1212-primary-source-unverified", "iso1212-channel-1-rthr-unproven", "iso1212-channel-2-cin-unproven", "iso1212-pin-6-must-be-nc", "iso1212-input-path-unverified", "isolation-keepout-unverified", "stm32-power-pin-48-unconnected"]) assert.ok(result.errors.includes(code), code);
});

test("Board006 topology gate accepts only live-sourced, electrically complete evidence", () => {
  const component = (ref, values) => ({ ref, ...values, primarySourceVerified: true, designCalculationVerified: true, liveDigiKeyVerified: true, liveMouserVerified: true });
  const channel = (index) => ({ RTHR: component(`R${index}`, { ohms: 1000, ratedPowerW: 0.4 }), RSENSE: component(`R${index + 2}`, { ohms: 562, ratedPowerW: 0.1 }), CIN: component(`C${index}`, { farads: 10e-9, ratedVoltageV: 50 }) });
  const result = topologyGate({
    iso1212: { primarySourceVerified: true, pinMap: expectedPinMap, channels: [channel(1), channel(2)], noConnectPins: ["6", "7", "12", "13"], inputPathVerified: true, logicDecouplingVerified: true },
    isolationCorridor: { keepoutVerified: true, clearanceMm: 3.2, creepageMm: 4 },
    stm32: { connectedPowerPins: ["1", "8", "9", "23", "24", "35", "36", "47", "48"] },
    assetBinding: { iso1212ExactMpnVerified: true, networkSymbolFootprintPinMapVerified: true },
  });
  assert.equal(result.ok, true, result.errors.join("; "));
});
