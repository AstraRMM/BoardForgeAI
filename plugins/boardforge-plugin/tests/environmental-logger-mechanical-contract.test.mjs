import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  ENVIRONMENTAL_LOGGER_MECHANICAL_CONTRACT as contract,
  validateEnvironmentalLoggerMechanicalGeometry as validate,
} from "../lib/phase2c/environmental-logger-mechanical-contract.mjs";

const ventedOutline = [
  [0, 0],
  [56, 0],
  [56, 7],
  [64, 7],
  [64, 33],
  [56, 33],
  [56, 40],
  [0, 40],
  [0, 30],
  [-3, 27],
  [-3, 13],
  [0, 10],
];
const valid = () => ({
  outline: ventedOutline,
  outlineClosed: true,
  ventedChamber: {
    projectionMm: 8,
    spanMm: 26,
    edgeCutsVerified: true,
    openings: [
      { openAreaMm2: 12, edgeCutsVerified: true },
      { openAreaMm2: 12, edgeCutsVerified: true },
      { openAreaMm2: 12, edgeCutsVerified: true },
    ],
    airPathToSensorsVerified: true,
    drainAndCondensationPathVerified: true,
    enclosureVentAlignmentVerified: true,
    weatherShieldClearanceVerified: true,
  },
  placements: {
    environmentalSensors: { minX: 57, maxX: 63 },
    loggerElectronics: { minX: 18, maxX: 46 },
    serviceConnector: { minX: 1, maxX: 5 },
  },
  separation: {
    sensorToHeatSourceMm: 12,
    noHeatSpreadingCopperIntoChamber: true,
    sensorAirflowNotBlockedByTallParts: true,
  },
  mountingHoles: [
    {
      x: 8,
      y: 6,
      diameterMm: 3,
      copperKeepoutRadiusMm: 3,
      allLayersKeepout: true,
      blocksVentOrDrain: false,
    },
    {
      x: 8,
      y: 34,
      diameterMm: 3,
      copperKeepoutRadiusMm: 3,
      allLayersKeepout: true,
      blocksVentOrDrain: false,
    },
  ],
  serviceAccessClearOfVents: true,
});

test("Board023 manifest preserves vented-enclosure intent and 3000mm2 cap", () => {
  const board = manifest.boards[22];
  assert.equal(board.id, "023_ENVIRONMENTAL_LOGGER");
  assert.equal(board.outline.family, "vented enclosure-environmental-logger");
  assert.equal(board.maximumAreaMm2, 3000);
  assert.equal(contract.maximumAreaMm2, 3000);
});
test("current catalog outline is not accepted without functional vent evidence", () => {
  const definition = catalogDefinition(manifest.boards[22], 22),
    result = validate({
      outline: definition.outlinePoints,
      outlineClosed: true,
    });
  assert.equal(result.ok, false);
  assert.ok(result.areaMm2 < 3000);
  assert.ok(result.errors.includes("purposeful-vented-chamber-unverified"));
  assert.ok(result.errors.includes("environmental-vent-openings-insufficient"));
});
test("purposeful vented logger envelope fits the maximum area", () => {
  const result = validate(valid());
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.areaMm2, 2499);
  assert.equal(result.bounds.width, 67);
  assert.equal(result.bounds.height, 40);
});
test("vent count, open area, airflow and drainage fail closed", () => {
  const x = valid();
  x.ventedChamber.openings = x.ventedChamber.openings.slice(0, 2);
  x.ventedChamber.airPathToSensorsVerified = false;
  x.ventedChamber.drainAndCondensationPathVerified = false;
  const e = validate(x).errors;
  assert.ok(e.includes("environmental-vent-openings-insufficient"));
  assert.ok(e.includes("sensor-chamber-air-and-drain-path-unverified"));
});
test("sensor chamber remains thermally separated and unobstructed", () => {
  const x = valid();
  x.separation.sensorToHeatSourceMm = 5;
  x.separation.noHeatSpreadingCopperIntoChamber = false;
  x.separation.sensorAirflowNotBlockedByTallParts = false;
  const e = validate(x).errors;
  assert.ok(e.includes("sensor-heat-source-separation-insufficient"));
  assert.ok(e.includes("sensor-chamber-thermal-isolation-unverified"));
  assert.ok(e.includes("sensor-airflow-component-clearance-unverified"));
});
test("mounting and service access cannot compromise environmental paths", () => {
  const x = valid();
  x.mountingHoles[0].blocksVentOrDrain = true;
  x.mountingHoles[1].allLayersKeepout = false;
  x.placements.serviceConnector.maxX = 12;
  x.serviceAccessClearOfVents = false;
  const e = validate(x).errors;
  assert.ok(e.includes("mounting-hole-1-blocks-environmental-path"));
  assert.ok(e.includes("mounting-hole-2-keepout-unverified"));
  assert.ok(e.includes("service-connector-not-opposite-vented-chamber"));
  assert.ok(e.includes("service-access-vent-clearance-unverified"));
});
