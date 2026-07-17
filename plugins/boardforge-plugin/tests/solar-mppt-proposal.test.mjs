import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  solarMpptProductionProposal as p,
  validateSolarMpptArchitecture as validate,
} from "../lib/phase2c/templates/solar-mppt.mjs";
test("Board050 requests solar harvesting and charging but catalog maps a PD buck supply", () => {
  const b = manifest.boards[49],
    d = catalogDefinition(b, 49),
    g = validate(d);
  assert.equal(b.id, "050_SOLAR_MPPT");
  assert.equal(b.purpose, "solar energy harvesting and charging");
  assert.equal(d.topologyId, "usb-c-pd-sink");
  assert.equal(g.ok, false);
  for (const code of [
    "solar-mppt-panel-input-missing",
    "solar-mppt-panel-protection-missing",
    "solar-mppt-controller-missing",
    "solar-mppt-power-stage-missing",
    "solar-mppt-battery-connector-missing",
    "solar-mppt-battery-protection-missing",
    "solar-mppt-panel-current-sense-missing",
    "solar-mppt-battery-current-sense-missing",
    "solar-mppt-battery-temperature-missing",
    "solar-mppt-panel-envelope-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board050 proposal preserves buck and buck-boost MPPT alternatives", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI BQ24650",
      "Analog Devices LT8490",
      "ST STM32G0",
      "Schurter 3413 / Littelfuse SMAJ",
      "Nichicon UWT",
      "ST M24C",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /exact panel\/module and array/i.test(x)),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) => /battery chemistry\/cells/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /buck-only solar charger cannot charge/i.test(x),
    ),
  );
  assert.ok(
    p.requiredTopology.some((x) => /not universally optimal MPPT/i.test(x)),
  );
});
test("solar MPPT gate accepts explicit panel battery power stage and safety evidence", () => {
  const roles = [
    "solar panel connector",
    "PV reverse surge panel protection",
    "MPPT charger controller",
    "MPPT power stage converter inductor",
    "battery pack connector",
    "battery charge reverse protection",
    "PV shunt panel current sense",
    "charge shunt battery current sense",
    "battery thermistor",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      solarMppt: {
        panelIvTemperatureVerified: true,
        batteryChemistryChargeProfileVerified: true,
        converterRangeTopologyVerified: true,
        mpptPolicyDynamicsVerified: true,
        protectionFaultEnergyVerified: true,
        powerStageStabilityVerified: true,
        sensingCalibrationVerified: true,
        thermalEfficiencyVerified: true,
        bmsSystemLoadSafetyVerified: true,
        productionSolarBatteryTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
