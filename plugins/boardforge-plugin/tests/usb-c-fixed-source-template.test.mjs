import test from "node:test";
import assert from "node:assert/strict";
import { usbCFixedSourceTemplate as template, validateUsbCFixedSourceReleaseEvidence as release, validateUsbCFixedSourceTemplate as validate } from "../lib/phase2c/templates/usb-c-fixed-source.mjs";

test("Board005 fixed source replaces PD and EEPROM configuration with real TPS25810 1.5 A straps", () => {
  const gate = validate(template);
  assert.equal(gate.ok, true, gate.errors.join("; "));
  assert.equal(template.replaces, "005_USB_C_PD_SOURCE");
  assert.equal(template.electrical.noUsbPowerDelivery, true);
  assert.equal(template.electrical.noConfigurationEeprom, true);
  assert.equal(template.fixedConfiguration.chg, "HIGH_TO_AUX");
  assert.equal(template.fixedConfiguration.chgHi, "LOW_TO_GND");
  assert.deepEqual(template.electrical.sourceSwitch.currentLimitA, [1.58, 1.82]);
  assert.ok(gate.worstConnectorVbus >= 4.75);
  assert.equal(Object.keys(template.controllerPinFunctions).length, 21);
  assert.equal(template.controllerPinFunctions[7], "CHG");
  assert.equal(template.controllerPinFunctions[8], "CHG_HI");
  assert.equal(template.controllerNetMap[14], "VBUS");
  assert.equal(template.controllerNetMap[15], "VBUS");
});

test("fixed source refuses a PD claim, wrong 1.5 A straps, or erased pin coverage", () => {
  const pd = structuredClone(template); pd.electrical.noUsbPowerDelivery = false;
  assert.ok(validate(pd).errors.includes("usb-pd-must-be-explicitly-absent"));
  const straps = structuredClone(template); straps.fixedConfiguration.chgHi = "HIGH_TO_AUX";
  assert.ok(validate(straps).errors.includes("tps25810-1p5a-strap-invalid"));
  const pins = structuredClone(template); delete pins.controllerNetMap[20];
  assert.ok(validate(pins).errors.includes("tps25810-net-map-missing:20"));
  const functionMap = structuredClone(template); functionMap.controllerPinFunctions[7] = "GND";
  assert.ok(validate(functionMap).errors.includes("tps25810-symbol-function-mismatch:7"));
});

test("fixed source cannot turn contract data into a release without fresh dual-provider and KiCad evidence", () => {
  const gate = release();
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.includes("live-digikey-coverage-missing"));
  assert.ok(gate.errors.includes("live-mouser-coverage-missing"));
  assert.ok(gate.errors.includes("kicad-validation-not-clean:ercErrors"));
  assert.ok(gate.errors.includes("manufacturing-acceptance-missing"));
});
