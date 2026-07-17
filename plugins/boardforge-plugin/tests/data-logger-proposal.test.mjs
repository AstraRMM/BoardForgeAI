import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  dataLoggerProductionProposal as p,
  validateDataLoggerArchitecture as validate,
} from "../lib/phase2c/templates/data-logger.mjs";
test("Board028 requests multi-channel removable logging but catalog has neither", () => {
  const b = manifest.boards[27],
    d = catalogDefinition(b, 27),
    g = validate(d);
  assert.equal(b.id, "028_DATA_LOGGER");
  assert.equal(b.purpose, "multi-channel removable logging");
  assert.equal(d.topologyId, "usb-c-esp32-sensor");
  assert.equal(g.ok, false);
  for (const code of [
    "data-logger-channel-connectors-missing",
    "data-logger-input-protection-missing",
    "data-logger-channel-conditioning-missing",
    "data-logger-converter-missing",
    "data-logger-reference-missing",
    "data-logger-removable-storage-missing",
    "data-logger-controller-missing",
    "data-logger-timebase-missing",
    "data-logger-channel-requirements-unverified",
    "data-logger-storage-capacity-endurance-unverified",
  ])
    assert.ok(g.errors.includes(code), code);
});
test("Board028 proposal preserves converter alternatives and refuses guessed channels", () => {
  assert.match(p.status, /BLOCKED/);
  assert.deepEqual(
    p.candidates.map((x) => x.family),
    [
      "TI ADS131M04",
      "Analog Devices AD7606B",
      "ST STM32G0",
      "Winbond W25Q",
      "ST M24C",
      "Microchip MCP1700",
    ],
  );
  assert.ok(p.candidates.every((x) => x.exactMpn === null));
  assert.ok(p.mandatoryUnresolved.some((x) => /channel count/i.test(x)));
  assert.ok(
    p.mandatoryUnresolved.some((x) => /removable medium\/form factor/i.test(x)),
  );
  assert.ok(
    p.requiredTopology.some((x) =>
      /radio\/USB or filesystem activity must not silently drop samples/i.test(
        x,
      ),
    ),
  );
});
test("data logger gate accepts explicit channel storage timing and recovery evidence", () => {
  const roles = [
    "channel input connector",
    "channel input protection",
    "anti-alias analog front end",
    "ADC data acquisition converter",
    "ADC voltage reference",
    "SD card removable storage connector",
    "acquisition logging controller",
    "RTC timestamp timebase",
  ];
  const d = {
    bom: roles.map((role, i) => ({ ref: `X${i}`, role })),
    semanticEvidence: {
      dataLogger: {
        channelRequirementsVerified: true,
        inputSafetyVerified: true,
        acquisitionPerformanceVerified: true,
        errorBudgetVerified: true,
        timingSynchronizationVerified: true,
        storageCapacityEnduranceVerified: true,
        mediaRemovalRecoveryVerified: true,
        powerIntegrityVerified: true,
        mechanicalMediaVerified: true,
        productionCalibrationVerified: true,
      },
    },
  };
  assert.deepEqual(validate(d), { ok: true, errors: [] });
});
