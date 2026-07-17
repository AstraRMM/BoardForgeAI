import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  measurementBoardProductionProposal,
  validateMeasurementBoardProductionProposal,
} from "../lib/phase2c/templates/measurement-board.mjs";
test("Board043 PD sink cannot pass as precision measurement instrument", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[42], 42),
  );
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("measurement-category-mapped-to-pd-sink"));
  assert.equal(g.ok, false);
});
test("Board043 reuses approved control storage and blocks precision measurement chain", () => {
  const p = measurementBoardProductionProposal,
    g = validateMeasurementBoardProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("measurement-board-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "U_CAL",
    "U_LOG",
    "U_PWR",
    "J_V",
    "J_KELVIN",
    "P_ATT",
    "P_PROTECT",
    "U_SOURCE",
    "U_AFE",
    "U_ADC",
    "U_REF",
    "P_RANGE",
    "P_FILTER",
    "P_GUARD",
    "U_TEMP",
    "J_HOST",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "measurement-board-range-envelope-undeclared",
    "measurement-board-wiring-envelope-undeclared",
    "measurement-board-uncertainty-envelope-undeclared",
    "measurement-board-safety-envelope-undeclared",
    "measurement-board-environment-envelope-undeclared",
    "measurement-board-calibration-envelope-undeclared",
    "measurement-board-power-envelope-undeclared",
    "measurement-board-host-envelope-undeclared",
    "measurement-board-test-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board043 requires accuracy noise drift leakage safety EMC and calibration evidence", () => {
  for (const k of [
    "attenuatorRatioDriftVerified",
    "inputProtectionLeakageRecoveryVerified",
    "sourceCurrentComplianceNoiseVerified",
    "afeBiasNoiseLinearityVerified",
    "adcReferenceDriftVerified",
    "fullRangeUncertaintyBudgetVerified",
    "guardLeakageHumidityVerified",
    "thermalEmfGradientVerified",
    "measurementCategoryGroundingVerified",
    "productionTraceableRangeTemperatureCalibrationVerified",
  ])
    assert.ok(
      measurementBoardProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board043 guarded terminal outline stays inside 1600 mm2", () => {
  const p = measurementBoardProductionProposal,
    g = validateMeasurementBoardProductionProposal(p);
  assert.equal(g.areaMm2, 1540);
  assert.ok(g.areaMm2 <= 1600);
  assert.equal(
    p.outline.purposefulFeatures.guardedTerminalWing.terminalCount,
    4,
  );
  assert.equal(p.outline.purposefulFeatures.slotMoatRequired, true);
});
