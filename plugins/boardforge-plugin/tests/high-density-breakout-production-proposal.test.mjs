import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  highDensityBreakoutProductionProposal,
  validateHighDensityBreakoutProductionProposal,
} from "../lib/phase2c/templates/high-density-breakout.mjs";
test("Board048 wireless sensor shell cannot pass as high-density adapter", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[47], 47),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "high-density-connectors-missing",
    "breakout-pin-map-evidence-missing",
    "breakout-power-ground-map-missing",
    "breakout-differential-pair-map-missing",
    "breakout-protection-missing",
    "breakout-power-protection-missing",
    "breakout-impedance-stackup-evidence-missing",
    "breakout-length-skew-evidence-missing",
    "breakout-connector-rating-evidence-missing",
    "breakout-keying-orientation-missing",
    "breakout-identification-missing",
    "breakout-continuity-production-test-missing",
    "breakout-category-mapped-to-wireless-sensor",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board048 reuses approved ID/fuse and blocks connector-specific adapter hardware", () => {
  const p = highDensityBreakoutProductionProposal,
    g = validateHighDensityBreakoutProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("high-density-breakout-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_ID",
    "F_PWR",
    "J_SRC",
    "J_DST",
    "P_PINMAP",
    "P_PWRMAP",
    "P_PAIR",
    "P_STACK",
    "P_SIGPROT",
    "P_PWRPROT",
    "P_SHIELD",
    "P_IDCFG",
    "P_MECH",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_ID").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "high-density-breakout-source-connector-envelope-undeclared",
    "high-density-breakout-destination-connector-envelope-undeclared",
    "high-density-breakout-pin-map-envelope-undeclared",
    "high-density-breakout-signal-integrity-envelope-undeclared",
    "high-density-breakout-power-envelope-undeclared",
    "high-density-breakout-protection-envelope-undeclared",
    "high-density-breakout-mechanical-envelope-undeclared",
    "high-density-breakout-identity-envelope-undeclared",
    "high-density-breakout-test-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board048 requires bijection SI power mechanics protection and continuity evidence", () => {
  for (const k of [
    "pinMapBijectionVerified",
    "differentialPairPolarityVerified",
    "powerGroundContactBudgetVerified",
    "connectorVoltageCurrentCycleVerified",
    "stackupImpedanceVerified",
    "channelInsertionLossVerified",
    "lengthSkewTimingVerified",
    "protectionParasiticsVerified",
    "connectorXyHeightToleranceVerified",
    "productionContinuityIsolationChannelVerified",
  ])
    assert.ok(
      highDensityBreakoutProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board048 connector-matched outline stays inside 3350 mm2", () => {
  const p = highDensityBreakoutProductionProposal,
    g = validateHighDensityBreakoutProductionProposal(p);
  assert.equal(g.areaMm2, 3272);
  assert.ok(g.areaMm2 <= 3350);
  assert.equal(p.outline.purposefulFeatures.pinOneDatumsOpposed, true);
  assert.equal(p.outline.purposefulFeatures.connectorKeepoutsRequired, true);
});
