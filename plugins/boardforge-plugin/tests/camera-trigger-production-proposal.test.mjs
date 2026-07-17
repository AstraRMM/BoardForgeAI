import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  cameraTriggerProductionProposal,
  validateCameraTriggerProductionProposal,
} from "../lib/phase2c/templates/camera-trigger.mjs";
test("Board029 generic sensor shell cannot pass as an isolated trigger", () => {
  const g = validateCatalogSemanticTopology(
    catalogDefinition(manifest.boards[28], 28),
  );
  assert.equal(g.ok, false);
  for (const c of [
    "camera-trigger-timing-source-missing",
    "camera-trigger-isolation-missing",
    "camera-trigger-output-drivers-missing",
    "camera-trigger-output-connectors-missing",
    "camera-trigger-output-protection-missing",
    "camera-trigger-sync-input-missing",
    "camera-trigger-jitter-skew-evidence-missing",
    "camera-trigger-voltage-interface-evidence-missing",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board029 has four explicit channels and blocks every unresolved interface", () => {
  const p = cameraTriggerProductionProposal,
    g = validateCameraTriggerProductionProposal(p);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("camera-trigger-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs.slice(0, 2), ["U_CTRL", "Y_TIME"]);
  for (const prefix of ["U_ISO", "Q_OUT", "J_CAM", "P_OUT"])
    assert.equal(
      p.bom.filter((x) => x.ref.startsWith(prefix)).length,
      4,
      prefix,
    );
  assert.equal(
    p.bom.find((x) => x.ref === "C_DEC").status,
    "APPROVED_EXACT_ASSET",
  );
  for (const code of [
    "camera-trigger-camera-interface-envelope-undeclared",
    "camera-trigger-timing-envelope-undeclared",
    "camera-trigger-channel-envelope-undeclared",
    "camera-trigger-isolation-envelope-undeclared",
    "camera-trigger-sync-envelope-undeclared",
    "camera-trigger-power-envelope-undeclared",
    "camera-trigger-environment-envelope-undeclared",
    "camera-trigger-safety-envelope-undeclared",
    "camera-trigger-service-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board029 requires latency skew jitter level failsafe EMC and production timing evidence", () => {
  for (const k of [
    "cameraVoltageCurrentPolarityVerified",
    "hardwareTimingLatencyBudgetVerified",
    "interChannelSkewJitterVerified",
    "pulseWidthRetriggerVerified",
    "startupResetBrownoutNoPulseVerified",
    "cableEsdSurgeEmcVerified",
    "productionFourChannelTimingIsolationTestVerified",
  ])
    assert.ok(cameraTriggerProductionProposal.evidenceRequired.includes(k), k);
});
test("Board029 four-bay camera edge stays inside 2300 mm2", () => {
  const p = cameraTriggerProductionProposal,
    g = validateCameraTriggerProductionProposal(p);
  assert.equal(g.areaMm2, 2240);
  assert.ok(g.areaMm2 <= 2300);
  assert.equal(p.outline.purposefulFeatures.cameraConnectorEdge.bayCount, 4);
  assert.equal(
    p.outline.purposefulFeatures.barrierSlotRequiredPerChannel,
    true,
  );
});
