import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  solarMpptProductionProposal,
  validateSolarMpptProductionProposal,
} from "../lib/phase2c/templates/solar-mppt.mjs";
test("Board050 PD sink cannot pass as solar MPPT charger", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[49], 49),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "solar-panel-input-missing",
    "solar-input-protection-missing",
    "solar-mppt-converter-missing",
    "solar-inductor-power-stage-missing",
    "solar-battery-connector-protection-missing",
    "solar-charge-current-voltage-sense-missing",
    "solar-battery-temperature-missing",
    "solar-chemistry-profile-evidence-missing",
    "solar-panel-operating-envelope-missing",
    "solar-mppt-efficiency-thermal-evidence-missing",
    "solar-charge-safety-state-missing",
    "solar-production-load-test-missing",
    "solar-mppt-category-mapped-to-pd-sink",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board050 reuses approved support and blocks solar battery power chain", () => {
  const p = solarMpptProductionProposal,
    g = validateSolarMpptProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("solar-mppt-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "F_PANEL",
    "D_PANEL",
    "C_BULK",
    "U_CFG",
    "J_PANEL",
    "P_PANEL",
    "U_MPPT",
    "P_STAGE",
    "J_BAT",
    "TH_BAT",
    "R_PV",
    "R_BAT",
    "P_PATH",
    "P_SAFE",
    "U_TEMP",
    "J_SERVICE",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "solar-mppt-pv-envelope-undeclared",
    "solar-mppt-battery-envelope-undeclared",
    "solar-mppt-chemistry-envelope-undeclared",
    "solar-mppt-topology-envelope-undeclared",
    "solar-mppt-power-stage-envelope-undeclared",
    "solar-mppt-control-envelope-undeclared",
    "solar-mppt-stability-envelope-undeclared",
    "solar-mppt-protection-envelope-undeclared",
    "solar-mppt-thermal-envelope-undeclared",
    "solar-mppt-calibration-envelope-undeclared",
    "solar-mppt-test-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board050 requires panel battery MPPT stability safety thermal and sweep evidence", () => {
  for (const k of [
    "panelVocVmpIscImpTemperatureVerified",
    "batteryChemistryCellsProfileVerified",
    "converterRangeTopologyVerified",
    "mpptAlgorithmShadingDynamicsVerified",
    "switchMagneticStressSoaVerified",
    "loopStabilityCompensationVerified",
    "panelBatterySensingAccuracyVerified",
    "watchdogFaultSafeStateVerified",
    "efficiencyLossThermalVerified",
    "productionSolarBatterySweepVerified",
  ])
    assert.ok(solarMpptProductionProposal.evidenceRequired.includes(k), k);
});
test("Board050 thermal-ear outline stays inside 1250 mm2", () => {
  const p = solarMpptProductionProposal,
    g = validateSolarMpptProductionProposal(p);
  assert.equal(g.areaMm2, 1220);
  assert.ok(g.areaMm2 <= 1250);
  assert.equal(p.outline.purposefulFeatures.mountHoleCount, 2);
  assert.equal(
    p.outline.purposefulFeatures.powerStageAirflowCorridorRequired,
    true,
  );
});
