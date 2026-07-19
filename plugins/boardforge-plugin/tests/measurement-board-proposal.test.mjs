import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  measurementBoardProductionProposal as p,
  validateMeasurementBoardArchitecture as validate,
} from "../lib/phase2c/templates/measurement-board.mjs";
test("Board043 requests precision resistance and voltage but catalog maps only a PD supply", () => {
  const b = manifest.boards[42],
    d = catalogDefinition(b, 42),
    g = validate(d);
  assert.equal(b.id, "043_MEASUREMENT_BOARD");
  assert.equal(b.purpose, "precision resistance and voltage measurement");
  assert.equal(d.topologyId, "usb-c-pd-sink");
  assert.equal(g.ok, false);
  for (const code of [
    "measurement-voltage-input-missing",
    "measurement-kelvin-terminals-missing",
    "measurement-input-protection-missing",
    "measurement-resistance-excitation-missing",
    "measurement-precision-adc-missing",
    "measurement-reference-missing",
    "measurement-guarding-missing",
    "measurement-temperature-monitor-missing",
    "measurement-range-wiring-unverified",
    "measurement-uncertainty-budget-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board043 proposal keeps precision ADC and reference capabilities non-exact", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI ADS1262",
      "TI REF70",
      "ST STM32G0",
      "ST M24C",
      "Winbond W25Q",
      "Microchip MCP1700",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /voltage and resistance ranges/i.test(x)),
  );
  assert.ok(
    p.mandatoryUnresolved.some((x) =>
      /measurement category\/isolation/i.test(x),
    ),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /excitation source cannot be applied to an energized voltage input/i.test(
        x,
      ),
    ),
  );
});
test("measurement gate accepts explicit voltage resistance uncertainty and calibration evidence", () => {
  const roles = [
    "measurement voltage input connector",
    "Kelvin terminal four-wire resistance connector",
    "precision overvoltage measurement input protection",
    "precision current source resistance excitation",
    "precision ADC",
    "precision reference",
    "driven analog guard",
    "temperature sensor",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      measurementBoard: {
        rangeWiringRequirementsVerified: true,
        modeInterlockVerified: true,
        voltagePathVerified: true,
        resistanceExcitationVerified: true,
        uncertaintyBudgetVerified: true,
        leakageGuardVerified: true,
        thermalEmfVerified: true,
        measurementCategorySafetyVerified: true,
        calibrationTraceabilityVerified: true,
        productionCalibrationVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
