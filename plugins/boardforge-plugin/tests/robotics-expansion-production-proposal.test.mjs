import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  roboticsExpansionProductionProposal,
  validateRoboticsExpansionProductionProposal,
} from "../lib/phase2c/templates/robotics-expansion.mjs";
test("Board034 USB instrument shell cannot pass as robot mezzanine", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[33], 33),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "robotics-expansion-mezzanine-connectors-missing",
    "robotics-expansion-pin-map-evidence-missing",
    "robotics-expansion-rail-ownership-missing",
    "robotics-expansion-io-connectors-missing",
    "robotics-expansion-io-protection-missing",
    "robotics-expansion-level-translation-missing",
    "robotics-expansion-default-state-missing",
    "robotics-expansion-identification-missing",
    "robotics-expansion-hotplug-evidence-missing",
    "robotics-expansion-current-capacity-missing",
    "robotics-expansion-category-mapped-to-usb-instrument",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board034 reuses approved local assets and blocks parent-specific hardware", () => {
  const p = roboticsExpansionProductionProposal,
    g = validateRoboticsExpansionProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("robotics-expansion-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CTRL",
    "U_FLASH",
    "U_ID",
    "U_PWR",
    "J_MEZZ_A",
    "J_MEZZ_B",
    "P_PINMAP",
    "J_IO1",
    "J_IO2",
    "P_IO",
    "U_LEVEL",
    "P_PWR",
    "P_SAFE",
    "J_SERVICE",
    "P_MECH",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "robotics-expansion-parent-envelope-undeclared",
    "robotics-expansion-connector-envelope-undeclared",
    "robotics-expansion-pin-map-envelope-undeclared",
    "robotics-expansion-io-envelope-undeclared",
    "robotics-expansion-rail-ownership-envelope-undeclared",
    "robotics-expansion-mechanical-envelope-undeclared",
    "robotics-expansion-safety-envelope-undeclared",
    "robotics-expansion-service-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board034 requires mating SI backpower thermal vibration and identity evidence", () => {
  for (const k of [
    "parentConnectorPairMatchedVerified",
    "parentPinMapReservedPinsVerified",
    "connectorXyRotationStackHeightVerified",
    "levelTranslationBusLoadingVerified",
    "railOwnershipSequenceBackpowerVerified",
    "connectorAmpacityTemperatureRiseVerified",
    "identityRevisionCompatibilityVerified",
    "shockVibrationRetentionVerified",
    "productionRepeatedMateStackCompatibilityVerified",
  ])
    assert.ok(
      roboticsExpansionProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board034 parent-matched outline stays inside 1250 mm2", () => {
  const p = roboticsExpansionProductionProposal,
    g = validateRoboticsExpansionProductionProposal(p);
  assert.equal(g.areaMm2, 1128);
  assert.ok(g.areaMm2 <= 1250);
  assert.equal(p.outline.purposefulFeatures.mezzanineKeepoutRequired, true);
  assert.equal(p.outline.purposefulFeatures.heightEnvelopeRequired, true);
});
