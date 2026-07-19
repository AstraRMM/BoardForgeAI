import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  dronePeripheralProductionProposal as p,
  validateDronePeripheralArchitecture as validate,
} from "../lib/phase2c/templates/drone-peripheral.mjs";
test("Board021 requests flight-stack aggregation but catalog maps a generic controller", () => {
  const b = manifest.boards[20],
    d = catalogDefinition(b, 20),
    g = validate(d);
  assert.equal(b.id, "021_DRONE_PERIPHERAL");
  assert.equal(b.purpose, "flight-stack peripheral aggregation");
  assert.equal(d.topologyId, "stm32-controller");
  assert.equal(g.ok, false);
  for (const code of [
    "drone-flight-stack-connector-missing",
    "drone-peripheral-ports-missing",
    "drone-power-input-protection-missing",
    "drone-port-power-limiting-missing",
    "drone-flight-stack-standard-unverified",
    "drone-pinout-unverified",
    "drone-bus-loading-unverified",
    "drone-termination-policy-unverified",
    "drone-power-budget-unverified",
    "drone-fault-containment-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board021 proposal refuses a guessed autopilot connector or exact interface parts", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(p.candidates.map((x) => x.family), ["STM32F103C8T6", "BME280", "TCAN33x", "TCA4307"]);
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  for (const key of ["performanceEnvelope", "interfaceEnvelopes", "powerEnvelope", "sensorEnvelope", "failsafeEnvelope"]) assert.equal(p[key], null);
  assert.ok(p.bom.find((x) => x.ref === "U_MCU").status.startsWith("BLOCKED"));
});
test("drone aggregator gate accepts explicit interface and fault evidence", () => {
  const roles = [
    "flight stack connector",
    "peripheral connector",
    "power backfeed protection",
    "per-port current limit",
    "external signal ESD bus protection",
    "interface transceiver bus buffer",
    "port fault status",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      dronePeripheral: {
        flightStackStandardVerified: true,
        pinoutVerified: true,
        voltageDomainsVerified: true,
        busLoadingVerified: true,
        terminationPolicyVerified: true,
        powerBudgetVerified: true,
        faultContainmentVerified: true,
        mechanicalVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
