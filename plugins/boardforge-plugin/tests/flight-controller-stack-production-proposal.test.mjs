import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  dronePeripheralProductionProposal,
  validateFlightControllerStackProductionProposal,
} from "../lib/phase2c/templates/drone-peripheral.mjs";
test("Board021 generic controller cannot pass as a flight-stack design", () => {
  const d = catalogDefinition(manifest.boards[20], 20),
    g = validateCatalogSemanticTopology(d);
  assert.equal(g.ok, false);
  for (const c of [
    "drone-stack-connectors-missing",
    "drone-peripheral-ports-missing",
    "drone-port-protection-missing",
    "drone-power-rail-distribution-missing",
    "drone-power-monitoring-missing",
    "drone-level-translation-missing",
    "drone-port-ground-return-evidence-missing",
    "drone-stack-pin-map-evidence-missing",
    "drone-peripheral-category-mapped-to-can-controller",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board021 requires flight MCU IMU barometer and mapped flight interfaces", () => {
  const p = dronePeripheralProductionProposal,
    g = validateFlightControllerStackProductionProposal(p);
  assert.equal(p.bom.find((x) => x.ref === "J_MOTOR").quantity, 4);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("flight-controller-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_MCU",
    "U_IMU",
    "U_BARO",
    "P_BARO",
    "J_MOTOR",
    "J_RX",
    "J_GNSS",
    "J_TELEM",
    "J_DEBUG",
    "P_SIG",
    "U_CURRENT",
    "P_POWER",
    "U_SAFE",
  ]);
  for (const r of ["F_IN", "Q_REV", "D_IN", "C_DEC"])
    assert.equal(
      p.bom.find((x) => x.ref === r).status,
      "APPROVED_EXACT_ASSET",
      r,
    );
});
test("Board021 requires mapping current thermal vibration watchdog and motor-disarm evidence", () => {
  for (const k of [
    "stackStandardPinMapVerified",
    "motorMappingsVerified",
    "powerCurrentSensingVerified",
    "watchdogBrownoutFailsafeVerified",
    "motorDisarmedDefaultVerified",
    "stackMountVibrationVerified",
    "productionSensorMotorFailsafeTestVerified",
  ])
    assert.ok(
      dronePeripheralProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board021 stack-mount outline stays inside 2300 mm2", () => {
  const g = validateFlightControllerStackProductionProposal(
    dronePeripheralProductionProposal,
  );
  assert.equal(g.areaMm2, 1993);
  assert.ok(g.areaMm2 <= 2300);
  assert.equal(
    dronePeripheralProductionProposal.outline.purposefulFeatures
      .stackHolePatternMm,
    30.5,
  );
  assert.equal(
    dronePeripheralProductionProposal.outline.purposefulFeatures
      .mountingHoleCount,
    4,
  );
});
