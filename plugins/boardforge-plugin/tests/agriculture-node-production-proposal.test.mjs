import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  agricultureNodeProductionProposal,
  validateAgricultureNodeProductionProposal,
} from "../lib/phase2c/templates/agriculture-node.mjs";
test("Board032 indoor sensor shell cannot pass as remote agriculture node", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[31], 31),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "soil-sensor-interface-missing",
    "climate-sensor-missing",
    "agriculture-radio-missing",
    "field-interface-protection-missing",
    "agriculture-probe-excitation-missing",
    "agriculture-cable-surge-path-missing",
    "agriculture-antenna-network-missing",
    "agriculture-energy-source-missing",
    "agriculture-energy-budget-missing",
    "agriculture-local-storage-timebase-missing",
    "agriculture-ingress-condensation-missing",
    "agriculture-corrosion-uv-evidence-missing",
    "agriculture-category-mapped-to-indoor-sensor-shell",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board032 reuses approved controller climate storage power and blocks field assets", () => {
  const p = agricultureNodeProductionProposal,
    g = validateAgricultureNodeProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("agriculture-node-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "U_CLIMATE",
    "U_LOG",
    "U_META",
    "U_PWR",
    "S_SOIL",
    "P_SOIL",
    "D_FIELD",
    "U_RADIO",
    "J_ANT",
    "P_SOLAR",
    "U_CHG",
    "BT1",
    "P_SLEEP",
    "U_RTC",
    "J_FIELD",
    "P_VENT",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "agriculture-node-site-envelope-undeclared",
    "agriculture-node-soil-envelope-undeclared",
    "agriculture-node-radio-envelope-undeclared",
    "agriculture-node-seasonal-energy-envelope-undeclared",
    "agriculture-node-environment-envelope-undeclared",
    "agriculture-node-data-envelope-undeclared",
    "agriculture-node-service-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board032 requires seasonal energy soil radio condensation and environment evidence", () => {
  for (const k of [
    "soilCalibrationSalinityTemperatureVerified",
    "fieldCableSurgePathVerified",
    "radioRegionLinkBudgetVerified",
    "antennaWetVegetationDetuningVerified",
    "seasonalSolarEnergyBalanceVerified",
    "batteryChargeTemperatureAgingVerified",
    "sleepWakeLeakageScheduleVerified",
    "ingressVentCondensationVerified",
    "uvChemicalFertilizerCorrosionVerified",
    "productionFieldSealEnergyRadioTestVerified",
  ])
    assert.ok(
      agricultureNodeProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board032 gland and antenna outline stays inside 3350 mm2", () => {
  const p = agricultureNodeProductionProposal,
    g = validateAgricultureNodeProductionProposal(p);
  assert.equal(g.areaMm2, 3274);
  assert.ok(g.areaMm2 <= 3350);
  assert.equal(p.outline.purposefulFeatures.antennaCopperKeepoutRequired, true);
  assert.equal(p.outline.purposefulFeatures.drainageAndVentRequired, true);
});
