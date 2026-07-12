import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ROUTING_RULE_SOURCE,
  assertKiCadDsnRuleParity,
  buildDsnRuleValues,
  buildKiCadNetClasses,
} from "../lib/routing/routing-rule-source-of-truth.mjs";

test("routing rule source of truth provides default and role-specific rules", () => {
  assert.equal(DEFAULT_ROUTING_RULE_SOURCE.default.trackWidthMm, 0.20);
  assert.equal(DEFAULT_ROUTING_RULE_SOURCE.default.clearanceMm, 0.20);
  assert.equal(DEFAULT_ROUTING_RULE_SOURCE.power.trackWidthMm, 0.30);
  assert.equal(DEFAULT_ROUTING_RULE_SOURCE.usb.diffPairGapMm, 0.15);
});

test("KiCad and DSN routing rules stay in parity", () => {
  const parity = assertKiCadDsnRuleParity(DEFAULT_ROUTING_RULE_SOURCE);
  assert.equal(parity.ok, true);
  assert.deepEqual(parity.mismatches, []);

  const kicad = buildKiCadNetClasses(DEFAULT_ROUTING_RULE_SOURCE);
  const dsn = buildDsnRuleValues(DEFAULT_ROUTING_RULE_SOURCE);
  assert.equal(kicad.defaultClass.track_width, dsn.defaultWidth / 1000);
  assert.equal(kicad.defaultClass.clearance, dsn.defaultClearance / 1000);
});

test("no hidden 0.18mm routing default remains in source of truth", () => {
  const serialized = JSON.stringify(DEFAULT_ROUTING_RULE_SOURCE);
  assert.equal(serialized.includes("0.18"), false);
  assert.equal(buildDsnRuleValues(DEFAULT_ROUTING_RULE_SOURCE).defaultWidth, 200);
});
