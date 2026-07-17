import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../../../fixtures/phase2c/50-board-challenge-manifest.mjs";
import { catalogDefinition } from "../lib/phase2c/catalog-production-engine.mjs";
import {
  GPS_IMU_MECHANICAL_CONTRACT as contract,
  validateGpsImuMechanicalGeometry as validate,
} from "../lib/phase2c/gps-imu-mechanical-contract.mjs";

const purposefulOutline = [
  [0, 0],
  [42, 0],
  [48, 4],
  [50, 9],
  [50, 15],
  [48, 20],
  [42, 24],
  [0, 24],
];
const valid = () => ({
  outline: purposefulOutline,
  outlineClosed: true,
  rfNose: { projectionMm: 8, spanMm: 12, edgeCutsVerified: true },
  antennaKeepout: {
    allCopperLayers: true,
    noPlanesTracksOrVias: true,
    noComponentsExceptFeedAndMatching: true,
    skyViewClear: true,
    enclosureClearanceVerified: true,
  },
  placements: {
    rearConnectors: { minX: 1, maxX: 5 },
    imu: { minX: 17, maxX: 25, minY: 9, maxY: 15 },
    gnssReceiver: { minX: 31, maxX: 40 },
    antenna: { minX: 43, maxX: 49 },
  },
  connectorCableExitClearOfSkyView: true,
  imuDatum: {
    axisDatumRecorded: true,
    rotationRecorded: true,
    mechanicalCenterVerified: true,
  },
  separation: {
    imuToNoisyCircuitMm: 9,
    antennaToNoisyCircuitMm: 12,
    feedAndMatchingAdjacentToAntenna: true,
  },
  mountingHoles: [
    {
      x: 10,
      y: 5,
      diameterMm: 3,
      copperKeepoutRadiusMm: 3,
      allLayersKeepout: true,
      insideAntennaKeepout: false,
    },
    {
      x: 10,
      y: 19,
      diameterMm: 3,
      copperKeepoutRadiusMm: 3,
      allLayersKeepout: true,
      insideAntennaKeepout: false,
    },
  ],
  mountingSymmetricAboutImu: true,
});

test("Board022 manifest preserves RF-nose intent and 2650mm2 cap", () => {
  const board = manifest.boards[21];
  assert.equal(board.id, "022_GPS_IMU");
  assert.equal(board.outline.family, "rf keepout nose-gps-imu");
  assert.equal(board.maximumAreaMm2, 2650);
  assert.equal(contract.maximumAreaMm2, 2650);
});
test("current catalog outline is under area cap but fails without functional RF evidence", () => {
  const definition = catalogDefinition(manifest.boards[21], 21),
    result = validate({
      outline: definition.outlinePoints,
      outlineClosed: true,
    });
  assert.equal(Number(result.areaMm2.toFixed(2)), 1184.11);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("purposeful-rf-nose-unverified"));
  assert.ok(result.errors.includes("antenna-all-layer-keepout-unverified"));
});
test("purposeful antenna-nose navigation envelope fits the maximum area", () => {
  const result = validate(valid());
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.areaMm2, 1150);
  assert.equal(result.bounds.width, 50);
  assert.equal(result.bounds.height, 24);
});
test("antenna nose fails closed without all-layer keepout and sky view", () => {
  const x = valid();
  x.antennaKeepout.noPlanesTracksOrVias = false;
  x.antennaKeepout.skyViewClear = false;
  x.placements.antenna.minX = 38;
  const e = validate(x).errors;
  assert.ok(e.includes("antenna-all-layer-keepout-unverified"));
  assert.ok(e.includes("antenna-sky-view-unverified"));
  assert.ok(e.includes("antenna-not-in-rf-nose"));
});
test("IMU datum and noisy-circuit separation are mandatory", () => {
  const x = valid();
  x.imuDatum.axisDatumRecorded = false;
  x.separation.imuToNoisyCircuitMm = 4;
  x.separation.antennaToNoisyCircuitMm = 6;
  const e = validate(x).errors;
  assert.ok(e.includes("imu-axis-and-center-datum-unverified"));
  assert.ok(e.includes("imu-noisy-circuit-separation-insufficient"));
  assert.ok(e.includes("antenna-noisy-circuit-separation-insufficient"));
});
test("mounting and rear cable exit remain outside the antenna region", () => {
  const x = valid();
  x.placements.rearConnectors.maxX = 15;
  x.connectorCableExitClearOfSkyView = false;
  x.mountingHoles[0].insideAntennaKeepout = true;
  x.mountingSymmetricAboutImu = false;
  const e = validate(x).errors;
  assert.ok(e.includes("connectors-not-opposite-rf-nose"));
  assert.ok(e.includes("connector-cable-exit-sky-view-unverified"));
  assert.ok(e.includes("mounting-hole-1-intrudes-antenna-keepout"));
  assert.ok(e.includes("mounting-not-symmetric-about-imu"));
});
