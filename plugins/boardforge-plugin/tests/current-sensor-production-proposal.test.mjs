import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  currentSensorProductionProposal,
  validateCurrentSensorProductionProposal,
} from "../lib/phase2c/templates/current-sensor.mjs";
test("Board046 PD sink cannot pass as isolated current sensor", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[45], 45),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "isolated-current-sensor-missing",
    "current-conductor-or-shunt-missing",
    "current-isolation-barrier-missing",
    "current-sensor-rated-insulation-missing",
    "current-sensor-primary-protection-missing",
    "current-sensor-secondary-power-missing",
    "current-measurement-output-missing",
    "current-sensor-output-protection-missing",
    "current-sensor-offset-calibration-missing",
    "current-sensor-range-bandwidth-evidence-missing",
    "current-sensor-thermal-error-evidence-missing",
    "current-sensor-saturation-fault-test-missing",
    "current-sensor-category-mapped-to-pd-sink",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board046 reuses approved secondary assets and blocks isolation current path", () => {
  const p = currentSensorProductionProposal,
    g = validateCurrentSensorProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("current-sensor-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "U_CAL",
    "U_PWR",
    "FB_PWR",
    "U_SENSE",
    "P_PRIMARY",
    "J_PRI_IN",
    "J_PRI_OUT",
    "P_BARRIER",
    "P_PRIPROT",
    "P_ISOPWR",
    "P_OUT",
    "J_OUT",
    "D_OUT",
    "U_TEMP",
    "P_MAG",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "current-sensor-current-waveform-envelope-undeclared",
    "current-sensor-conductor-envelope-undeclared",
    "current-sensor-fault-envelope-undeclared",
    "current-sensor-isolation-envelope-undeclared",
    "current-sensor-output-envelope-undeclared",
    "current-sensor-power-envelope-undeclared",
    "current-sensor-thermal-envelope-undeclared",
    "current-sensor-magnetic-envelope-undeclared",
    "current-sensor-calibration-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board046 requires insulation fault thermal magnetic and dielectric evidence", () => {
  for (const k of [
    "primaryContinuousPulseFaultI2tVerified",
    "terminalAmpacityForceVerified",
    "workingTransientInsulationVerified",
    "creepageClearanceSlotVerified",
    "isolatedPowerCmtEmissionsVerified",
    "offsetGainNoiseLinearityVerified",
    "thermalDriftTemperatureRiseVerified",
    "externalMagneticCrosstalkVerified",
    "saturationOvercurrentRecoveryVerified",
    "productionDielectricBidirectionalCalibrationVerified",
  ])
    assert.ok(currentSensorProductionProposal.evidenceRequired.includes(k), k);
});
test("Board046 conductor-window outline stays inside 2650 mm2", () => {
  const p = currentSensorProductionProposal,
    g = validateCurrentSensorProductionProposal(p);
  assert.equal(g.areaMm2, 2176);
  assert.ok(g.areaMm2 <= 2650);
  assert.deepEqual(p.outline.purposefulFeatures.conductorWindowNotch, {
    widthMm: 14,
    depthMm: 16,
  });
  assert.equal(
    p.outline.purposefulFeatures.primarySecondaryBarrierSlotRequired,
    true,
  );
});
