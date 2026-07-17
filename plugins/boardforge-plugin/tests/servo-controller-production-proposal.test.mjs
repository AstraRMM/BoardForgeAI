import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import {
  catalogDefinition,
  validateCatalogSemanticTopology,
} from "../lib/phase2c/catalog-production-engine.mjs";
import {
  servoControllerProductionProposal,
  validateServoControllerProductionProposal,
} from "../lib/phase2c/templates/servo-controller.mjs";
import { approvedAssetFor } from "../lib/components/approved-production-assets.mjs";
import { resolveAuthoritativeKiCadSymbol } from "../lib/components/authoritative-kicad-symbol-resolver.mjs";
import { resolveAuthoritativeKiCadFootprint } from "../lib/components/authoritative-kicad-footprint-resolver.mjs";
test("Board015 generic controller cannot pass as multi-channel servo hardware", () => {
  const d = catalogDefinition(manifest.boards[14], 14),
    g = validateCatalogSemanticTopology(d);
  assert.equal(g.ok, false);
  for (const c of [
    "servo-channel-connectors-missing",
    "servo-pwm-controller-missing",
    "servo-power-entry-protection-missing",
    "servo-rail-bulk-decoupling-missing",
    "servo-rail-current-capability-missing",
    "servo-signal-protection-missing",
    "servo-failsafe-output-state-missing",
    "servo-supply-monitoring-missing",
  ])
    assert.ok(g.errors.includes(c), c);
});
test("Board015 defines eight channels and blocks every envelope-dependent exact asset", () => {
  const p = servoControllerProductionProposal,
    g = validateServoControllerProductionProposal(p);
  assert.equal(p.channelCount, 8);
  assert.equal(g.ok, false);
  assert.ok(g.errors.includes("servo-exact-assets-unapproved"));
  assert.deepEqual(g.blockedRefs, [
    "J_SERVO",
    "R_SIG",
    "U_RAIL",
    "U_MON",
    "U_LOGIC",
    "J_PWR",
  ]);
  for (const r of ["U_PWM", "F1", "Q_REV", "D_TVS", "C_BULK", "C_LOCAL"])
    assert.equal(
      p.bom.find((x) => x.ref === r).status,
      "APPROVED_EXACT_ASSET",
      r,
    );
});
test("Board015 completeness gate rejects absent servo rail and pulse envelopes", () => {
  const g = validateServoControllerProductionProposal(
    servoControllerProductionProposal,
  );
  for (const code of [
    "servo-electrical-envelope-undeclared",
    "servo-rail-envelope-undeclared",
    "servo-pulse-envelope-undeclared",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board015 requires failsafe monitoring simultaneous-stall and thermal evidence", () => {
  for (const k of [
    "simultaneousStallCurrentVerified",
    "failsafeOutputsVerified",
    "supplyMonitoringFaultThresholdsVerified",
    "copperConnectorThermalVerified",
    "productionLoadFaultTestVerified",
  ])
    assert.ok(
      servoControllerProductionProposal.evidenceRequired.includes(k),
      k,
    );
});
test("Board015 connector-comb outline has eight teeth within 3000 mm2", () => {
  const g = validateServoControllerProductionProposal(
    servoControllerProductionProposal,
  );
  assert.equal(g.areaMm2, 2816);
  assert.ok(g.areaMm2 <= 3000);
  assert.equal(
    servoControllerProductionProposal.outline.purposefulFeatures
      .servoConnectorTeeth,
    8,
  );
  assert.equal(
    servoControllerProductionProposal.outline.purposefulFeatures
      .highCurrentSpineRequired,
    true,
  );
});
test("Board015 PCA9685PW,118 exact asset matches installed 28-pin symbol and TSSOP footprint", () => {
  const a = approvedAssetFor("PCA9685PW,118"),
    s = resolveAuthoritativeKiCadSymbol(a.symbol.libId),
    f = resolveAuthoritativeKiCadFootprint(a.footprint.libId);
  assert.equal(s.pins.length, 28);
  assert.equal(f.padNumbers.length, 28);
  assert.equal(s.pinMap["23"], "~{OE}");
  assert.equal(s.pinMap["26"], "SCL");
  assert.equal(s.pinMap["27"], "SDA");
  assert.equal(a.symbolPinMap["23"], "PWM_OE_N");
  assert.equal(a.footprintPadMap["6"], "SERVO_PWM1");
  assert.equal(a.footprintPadMap["13"], "SERVO_PWM8");
});
test("Board015 quantifies why one TPS25200 cannot be assumed for eight unknown servos", () => {
  const q = servoControllerProductionProposal.quantifiedBlockers;
  assert.equal(q.channelCount, 8);
  assert.equal(
    q.equalShareContinuousCurrentA,
    q.tps25200ContinuousCurrentA / 8,
  );
  assert.equal(
    q.equalShareMaximumLimitA,
    q.tps25200MaximumAdjustableLimitA / 8,
  );
  for (const key of [
    "aggregateStallCurrentA",
    "railFaultEnergyJ",
    "allowedRailDroopV",
    "requiredBulkCapacitanceF",
    "connectorCurrentPerContactA",
    "copperTemperatureRiseC",
    "pulseMinimumUs",
    "pulseMaximumUs",
    "pulseFrameRateHz",
    "failsafeMaximumPulsePersistenceMs",
  ])
    assert.equal(q[key], null, key);
  assert.match(q.conclusion, /no servo population/i);
});
