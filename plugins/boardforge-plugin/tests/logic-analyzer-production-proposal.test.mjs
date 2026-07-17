import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  logicAnalyzerProductionProposal,
  validateLogicAnalyzerProductionProposal,
} from "../lib/phase2c/templates/logic-analyzer.mjs";
test("Board041 instrument shell cannot pass as logic analyzer", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[40], 40),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "logic-analyzer-probe-connectors-missing",
    "logic-analyzer-input-channels-missing",
    "logic-analyzer-input-protection-missing",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board041 reuses approved controller USB assets and blocks unresolved capture front end", () => {
  const p = logicAnalyzerProductionProposal,
    g = validateLogicAnalyzerProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("logic-analyzer-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "U_CAP",
    "U_FLASH",
    "J_USB",
    "D_USB",
    "J_PROBE",
    "P_PROTECT",
    "U_LEVEL",
    "P_TERM",
    "Y_SAMPLE",
    "P_TRIGGER",
    "U_MEM",
    "P_USB",
    "J_EXTCLK",
    "P_PWR",
    "P_TEST",
  ]);
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "logic-analyzer-channel-threshold-envelope-undeclared",
    "logic-analyzer-front-end-envelope-undeclared",
    "logic-analyzer-capture-envelope-undeclared",
    "logic-analyzer-timing-envelope-undeclared",
    "logic-analyzer-usb-envelope-undeclared",
    "logic-analyzer-power-envelope-undeclared",
    "logic-analyzer-signal-integrity-envelope-undeclared",
    "logic-analyzer-calibration-envelope-undeclared",
    "logic-analyzer-test-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board041 requires thresholds SI timing bandwidth ESD EMC and known-pattern evidence", () => {
  for (const k of [
    "channelVoltageThresholdVerified",
    "inputImpedanceCapacitanceVerified",
    "protectionLeakageSurvivalVerified",
    "probeCableRingingCrosstalkVerified",
    "sampleClockAccuracyJitterVerified",
    "triggerLatencyPositionVerified",
    "captureDepthMemoryBandwidthVerified",
    "usbSustainedThroughputVerified",
    "esdEmcVerified",
    "productionKnownPatternRateDepthVerified",
  ])
    assert.ok(logicAnalyzerProductionProposal.evidenceRequired.includes(k), k);
});
test("Board041 probe-comb outline stays inside 900 mm2", () => {
  const p = logicAnalyzerProductionProposal,
    g = validateLogicAnalyzerProductionProposal(p);
  assert.equal(g.areaMm2, 832);
  assert.ok(g.areaMm2 <= 900);
  assert.equal(p.outline.purposefulFeatures.probeComb.channelCount, 8);
  assert.equal(
    p.outline.purposefulFeatures.probeComb.interleavedGroundRequired,
    true,
  );
});
