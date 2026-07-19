import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  hmiControllerProductionProposal as p,
  validateHmiControllerArchitecture as validate,
} from "../lib/phase2c/templates/hmi-controller.mjs";
test("Board038 requests display and controls but catalog maps a USB instrument", () => {
  const b = manifest.boards[37],
    d = catalogDefinition(b, 37),
    g = validate(d);
  assert.equal(b.id, "038_HMI_CONTROLLER");
  assert.equal(b.purpose, "display and operator controls");
  assert.equal(d.topologyId, "rp2040-instrument");
  assert.equal(g.ok, false);
  for (const code of [
    "hmi-controller-graphics-engine-missing",
    "hmi-controller-panel-connector-missing",
    "hmi-controller-backlight-driver-missing",
    "hmi-controller-operator-controls-missing",
    "hmi-controller-interface-protection-missing",
    "hmi-controller-host-interface-missing",
    "hmi-controller-panel-power-missing",
    "hmi-controller-supervision-missing",
    "hmi-controller-panel-interface-unverified",
    "hmi-controller-rendering-memory-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board038 proposal preserves integrated and external graphics alternatives", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "ST STM32H7",
      "Bridgetek BT81x EVE",
      "Raspberry Pi RP2040",
      "Winbond W25Q",
      "ST M24C",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /exact panel\/touch model/i.test(x)),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) => /graphics content\/complexity/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /not a safety-rated emergency stop/i.test(x),
    ),
  );
});
test("HMI gate accepts explicit panel controls host power and production evidence", () => {
  const roles = [
    "HMI graphics controller",
    "display panel connector",
    "backlight driver",
    "operator control button encoder",
    "display ESD operator interface protection",
    "host interface connector",
    "display power sequencing panel rail control",
    "watchdog reset supervisor",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      hmiController: {
        panelInterfaceTimingVerified: true,
        renderingMemoryBudgetVerified: true,
        operatorControlVerified: true,
        hostProtocolVerified: true,
        powerBacklightThermalVerified: true,
        signalIntegrityEmcVerified: true,
        safePresentationVerified: true,
        displayMechanicalVerified: true,
        productionUiTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
