import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  cameraTriggerProductionProposal as p,
  validateCameraTriggerArchitecture as validate,
} from "../lib/phase2c/templates/camera-trigger.mjs";
test("Board029 requests isolated synchronized triggering but catalog maps a CAN controller", () => {
  const b = manifest.boards[28],
    d = catalogDefinition(b, 28),
    g = validate(d);
  assert.equal(b.id, "029_CAMERA_TRIGGER");
  assert.equal(b.purpose, "isolated synchronized triggering");
  assert.equal(d.topologyId, "stm32-controller");
  assert.equal(g.ok, false);
  for (const code of [
    "camera-trigger-sync-input-missing",
    "camera-trigger-timing-controller-missing",
    "camera-trigger-isolation-missing",
    "camera-trigger-output-stage-missing",
    "camera-trigger-output-connectors-missing",
    "camera-trigger-output-protection-missing",
    "camera-trigger-clock-reference-missing",
    "camera-trigger-camera-interface-unverified",
    "camera-trigger-channel-count-undeclared",
    "camera-trigger-timing-budget-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board029 proposal preserves isolation alternatives without guessing camera wiring", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    ["TI ISO77xx", "Analog Devices ADuM540x", "ST STM32G0", "Abracon ABM8"],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(p.mandatoryUnresolved.some((x) => /exact camera models/i.test(x)));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /maximum latency\/skew\/jitter/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /never parallel unknown camera trigger supplies or grounds/i.test(x),
    ),
  );
});
test("camera trigger gate accepts explicit isolation timing and interface evidence", () => {
  const roles = [
    "sync input connector",
    "deterministic trigger timer",
    "isolated trigger channel",
    "camera trigger driver",
    "camera output connector",
    "camera output protection trigger ESD",
    "trigger clock timing reference",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      cameraTrigger: {
        cameraElectricalInterfaceVerified: true,
        outputChannelCount: 4,
        isolationSafetyVerified: true,
        timingBudgetVerified: true,
        pulseBehaviorVerified: true,
        powerFaultBehaviorVerified: true,
        groundingShieldingVerified: true,
        mechanicalInterfaceVerified: true,
        productionTimingTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
