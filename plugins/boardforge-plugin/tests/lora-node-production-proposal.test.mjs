import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  loraNodeProductionProposal,
  validateLoraNodeProductionProposal,
} from "../lib/phase2c/templates/lora-node.mjs";
test("Board024 generic ESP32 shell cannot pass as a LoRa sensor node", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[23], 23),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "lora-radio-missing",
    "lora-antenna-network-missing",
    "low-power-supply-control-missing",
    "lora-region-frequency-evidence-missing",
    "lora-rf-filter-match-missing",
    "lora-rf-esd-missing",
    "lora-reference-clock-missing",
    "lora-host-control-interface-missing",
    "lora-tx-current-decoupling-missing",
    "lora-link-budget-evidence-missing",
    "lora-category-mapped-to-esp32-shell",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board024 accepts only registry assets and blocks unresolved RF power and security parts", () => {
  const p = loraNodeProductionProposal,
    g = validateLoraNodeProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("lora-node-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "U_SENSOR",
    "U_PWR",
    "U_RADIO",
    "J_ANT",
    "P_RF",
    "D_RF",
    "Y_RF",
    "P_SOURCE",
    "P_SLEEP",
    "J_PROV",
    "P_SEC",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "lora-node-regional-envelope-undeclared",
    "lora-node-network-envelope-undeclared",
    "lora-node-link-envelope-undeclared",
    "lora-node-rf-envelope-undeclared",
    "lora-node-sensing-envelope-undeclared",
    "lora-node-energy-envelope-undeclared",
    "lora-node-security-envelope-undeclared",
    "lora-node-environment-envelope-undeclared",
    "lora-node-service-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board024 requires regional RF link energy sleep security and environmental evidence", () => {
  for (const k of [
    "regionFrequencyDutyCycleVerified",
    "rfMatchHarmonicEsdVerified",
    "antennaImpedanceEfficiencyDetuningVerified",
    "linkBudgetFadeMarginVerified",
    "energyBudgetTemperatureRetryVerified",
    "sleepWakeLeakageTimingVerified",
    "provisioningKeyFrameCounterSecurityVerified",
    "enclosureThermalEnvironmentalVerified",
    "productionRfCurrentCredentialTestVerified",
  ])
    assert.ok(loraNodeProductionProposal.evidenceRequired.includes(k), k);
});
test("Board024 antenna-clearance outline stays inside 3350 mm2", () => {
  const p = loraNodeProductionProposal,
    g = validateLoraNodeProductionProposal(p);
  assert.equal(g.areaMm2, 3132);
  assert.ok(g.areaMm2 <= 3350);
  assert.deepEqual(p.outline.purposefulFeatures.antennaNose, {
    projectionMm: 7,
    spanMm: 20,
  });
  assert.equal(p.outline.purposefulFeatures.antennaCopperKeepoutRequired, true);
});
