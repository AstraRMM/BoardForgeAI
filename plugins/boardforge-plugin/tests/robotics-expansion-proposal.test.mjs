import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  roboticsExpansionProductionProposal as p,
  validateRoboticsExpansionArchitecture as validate,
} from "../lib/phase2c/templates/robotics-expansion.mjs";
test("Board034 requests modular robot IO but catalog maps a USB instrument", () => {
  const b = manifest.boards[33],
    d = catalogDefinition(b, 33),
    g = validate(d);
  assert.equal(b.id, "034_ROBOTICS_EXPANSION");
  assert.equal(b.purpose, "modular robot IO expansion");
  assert.equal(d.topologyId, "rp2040-instrument");
  assert.equal(g.ok, false);
  for (const code of [
    "robotics-expansion-mezzanine-connector-missing",
    "robotics-expansion-module-identity-missing",
    "robotics-expansion-io-controller-missing",
    "robotics-expansion-external-ports-missing",
    "robotics-expansion-port-protection-missing",
    "robotics-expansion-port-power-control-missing",
    "robotics-expansion-interface-conditioning-missing",
    "robotics-expansion-safe-output-gate-missing",
    "robotics-expansion-host-interface-unverified",
    "robotics-expansion-io-matrix-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board034 proposal preserves local-controller and expander alternatives", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "Raspberry Pi RP2040",
      "TI TCA9539",
      "Winbond W25Q",
      "ST M24C",
      "Microchip MCP1700",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /exact host board\/revision/i.test(x)),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) => /external I\/O types\/counts/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) => /generic header is insufficient/i.test(x)),
  );
});
test("robotics expansion gate accepts explicit host IO power and compatibility evidence", () => {
  const roles = [
    "host mezzanine connector",
    "module identity revision EEPROM",
    "expansion controller",
    "external IO connector",
    "external IO port protection",
    "port current limit expansion power switch",
    "bus buffer level translator",
    "hardware output enable safe output gate",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      roboticsExpansion: {
        hostPinoutMechanicalVerified: true,
        ioMatrixVerified: true,
        portElectricalVerified: true,
        timingBusLoadingVerified: true,
        powerHotplugBackfeedVerified: true,
        safeStateVerified: true,
        identityCompatibilityVerified: true,
        stackMechanicalVerified: true,
        productionCompatibilityTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
