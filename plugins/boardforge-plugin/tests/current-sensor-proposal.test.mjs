import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  currentSensorProductionProposal as p,
  validateCurrentSensorArchitecture as validate,
} from "../lib/phase2c/templates/current-sensor.mjs";
test("Board046 requests isolated current measurement but catalog maps only a PD supply", () => {
  const b = manifest.boards[45],
    d = catalogDefinition(b, 45),
    g = validate(d);
  assert.equal(b.id, "046_CURRENT_SENSOR");
  assert.equal(b.purpose, "isolated current measurement");
  assert.equal(d.topologyId, "usb-c-pd-sink");
  assert.equal(g.ok, false);
  for (const code of [
    "current-sensor-primary-path-missing",
    "current-sensor-isolated-sensing-missing",
    "current-sensor-isolation-barrier-missing",
    "current-sensor-output-conditioning-missing",
    "current-sensor-output-connector-missing",
    "current-sensor-power-domain-missing",
    "current-sensor-temperature-sensing-missing",
    "current-sensor-output-protection-missing",
    "current-sensor-range-unverified",
    "current-sensor-isolation-safety-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board046 proposal preserves magnetic-conductor and isolated-shunt alternatives", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI TMCS1101",
      "TI AMC1300",
      "ST STM32G0",
      "ST M24C",
      "Microchip MCP1700",
      "TDK MPZ1608",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /current ranges and waveforms/i.test(x)),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) =>
      /isolation working\/transient voltage/i.test(x),
    ),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /component isolation rating alone is not system compliance/i.test(x),
    ),
  );
});
test("isolated current sensor gate accepts explicit path safety output and calibration evidence", () => {
  const roles = [
    "primary conductor",
    "isolated current sensor",
    "isolation barrier creepage",
    "output conditioning",
    "measurement output connector",
    "sensor quiet power",
    "conductor temperature sensor",
    "output ESD telemetry protection",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      currentSensor: {
        currentRangeWaveformVerified: true,
        conductorShuntFaultEnergyVerified: true,
        isolationSafetyVerified: true,
        outputInterfaceVerified: true,
        powerDomainsVerified: true,
        bandwidthErrorBudgetVerified: true,
        thermalVerified: true,
        magneticImmunityVerified: true,
        calibrationTraceabilityVerified: true,
        productionDielectricFunctionalTestVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
