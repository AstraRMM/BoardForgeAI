import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  highDensityBreakoutProductionProposal as p,
  validateHighDensityBreakoutArchitecture as validate,
} from "../lib/phase2c/templates/high-density-breakout.mjs";
test("Board048 requests connector adaptation but catalog maps an ESP32 sensor", () => {
  const b = manifest.boards[47],
    d = catalogDefinition(b, 47),
    g = validate(d);
  assert.equal(b.id, "048_HIGH_DENSITY_BREAKOUT");
  assert.equal(b.purpose, "high-density connector adaptation");
  assert.equal(d.topologyId, "usb-c-esp32-sensor");
  assert.equal(g.ok, false);
  for (const code of [
    "high-density-source-connector-missing",
    "high-density-destination-connector-missing",
    "high-density-power-protection-missing",
    "high-density-signal-protection-missing",
    "high-density-module-identity-missing",
    "high-density-test-access-missing",
    "high-density-retention-missing",
    "high-density-shield-grounding-missing",
    "high-density-connectors-unverified",
    "high-density-pin-map-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board048 proposal preserves connector-family alternatives without exact mating guesses", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    ["Samtec QSH/QTH", "Hirose DF40", "ST M24C", "Schurter 3413"],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) =>
      /exact source and destination connector\/order codes/i.test(x),
    ),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) => /authoritative source pinout/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) => /prove one-to-one connectivity/i.test(x)),
  );
});
test("high-density breakout gate accepts explicit connectors pin map SI power and test evidence", () => {
  const roles = [
    "source high-density connector",
    "destination breakout connector",
    "connector power fuse protection",
    "connector ESD signal protection",
    "adapter ID EEPROM module identity",
    "continuity fixture test pad",
    "connector retention mounting hardware",
    "shield bond chassis connection",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      highDensityBreakout: {
        connectorOrderingMatingVerified: true,
        pinMapBijectionVerified: true,
        differentialPairPolarityVerified: true,
        stackupImpedanceChannelVerified: true,
        powerGroundContactBudgetVerified: true,
        protectionParasiticsVerified: true,
        identityCompatibilityVerified: true,
        mechanicalMatingVerified: true,
        productionContinuityIsolationVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
