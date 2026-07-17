import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  agricultureNodeProductionProposal as p,
  validateAgricultureNodeArchitecture as validate,
} from "../lib/phase2c/templates/agriculture-node.mjs";
test("Board032 requests remote soil and climate monitoring but catalog has neither", () => {
  const b = manifest.boards[31],
    d = catalogDefinition(b, 31),
    g = validate(d);
  assert.equal(b.id, "032_AGRICULTURE_NODE");
  assert.equal(b.purpose, "remote soil and climate monitoring");
  assert.equal(d.topologyId, "usb-c-esp32-sensor");
  assert.equal(g.ok, false);
  for (const code of [
    "agriculture-soil-probe-missing",
    "agriculture-soil-interface-missing",
    "agriculture-climate-sensor-missing",
    "agriculture-telemetry-radio-missing",
    "agriculture-antenna-missing",
    "agriculture-power-management-missing",
    "agriculture-local-storage-missing",
    "agriculture-field-protection-missing",
    "agriculture-soil-calibration-unverified",
    "agriculture-seasonal-energy-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board032 proposal keeps sensing capabilities non-exact and site gated", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI HDC302x",
      "Analog Devices AD7745/AD7746",
      "Raspberry Pi RP2040",
      "Winbond W25Q",
      "ST M24C",
      "Microchip MCP1700",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(p.mandatoryUnresolved.some((x) => /soil quantities/i.test(x)));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /deployment country\/site/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /month-by-month or worst-season energy budget/i.test(x),
    ),
  );
});
test("agriculture node gate accepts explicit sensing link energy and field evidence", () => {
  const roles = [
    "soil probe",
    "soil front end probe interface",
    "humidity temperature climate sensor",
    "remote telemetry radio",
    "remote telemetry antenna",
    "seasonal battery power management",
    "outage local log storage",
    "field surge protection",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      agricultureNode: {
        soilMeasurementCalibrationVerified: true,
        climateExposureVerified: true,
        radioRegionLinkVerified: true,
        antennaAssemblyVerified: true,
        seasonalEnergyBudgetVerified: true,
        corrosionSurgeVerified: true,
        dataRecoverySecurityVerified: true,
        weatherproofMechanicalVerified: true,
        productionFieldTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
