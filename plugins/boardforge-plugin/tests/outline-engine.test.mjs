import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { generateOutlineCandidate } from "../lib/outline/board-outline-engine.mjs";
import { edgeCutsSegments } from "../lib/outline/edgecuts-writer.mjs";
import { buildMechanicalConstraints, OUTLINE_MODES } from "../lib/outline/outline-presets.mjs";
import { shrinkWrapBox } from "../lib/outline/shrinkwrap-outline.mjs";
import { validateOutlinePolygon } from "../lib/outline/outline-validator.mjs";

const revERoot = "C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-SENSOR-HUB-01_REV_E_OUTLINE_ENGINE";

const fixtureItems = [
  { ref: "J1", x1: 2.8, y1: 17.5, x2: 9.1, y2: 24.5 },
  { ref: "U1", x1: 22.4, y1: 14.2, x2: 39.6, y2: 27.8 },
  { ref: "J5", x1: 55.6, y1: 12.8, x2: 56.4, y2: 17.2 },
];

test("outline engine generates compact candidate modes", () => {
  const constraints = buildMechanicalConstraints({ componentMarginMm: 2 });
  const rounded = generateOutlineCandidate({ mode: "ROUNDED_RECTANGLE", items: fixtureItems, constraints });
  const ears = generateOutlineCandidate({ mode: "MOUNTING_EAR_BOARD", items: fixtureItems, constraints });
  assert.ok(OUTLINE_MODES.includes("MOUNTING_EAR_BOARD"));
  assert.ok(rounded.areaMm2 > 0);
  assert.ok(ears.points.length > rounded.points.length);
});

test("edgecuts writer emits closed Edge.Cuts segment loop", () => {
  const candidate = generateOutlineCandidate({ mode: "OCTAGONAL_BOARD", items: fixtureItems, constraints: buildMechanicalConstraints() });
  const segments = edgeCutsSegments(candidate.points);
  assert.equal(segments.length, candidate.points.length);
  assert.deepEqual(segments.at(-1).end, candidate.points[0]);
});

test("outline validator rejects empty and accepts generated polygon", () => {
  assert.equal(validateOutlinePolygon([]).valid, false);
  const candidate = generateOutlineCandidate({ mode: "ROUNDED_RECTANGLE", items: fixtureItems, constraints: buildMechanicalConstraints() });
  assert.equal(validateOutlinePolygon(candidate.points).valid, true);
});

test("shrinkwrap outline expands physical item bounds by requested margin", () => {
  const box = shrinkWrapBox(fixtureItems, { componentMarginMm: 2 });
  assert.equal(box.x1, 0.7999999999999998);
  assert.equal(box.x2, 58.4);
});

test("mounting hole constraints are represented in mechanical constraints", () => {
  const constraints = buildMechanicalConstraints({ mountingHoles: { count: 4, diameterMm: 2.2, style: "corner", edgeMarginMm: 3 } });
  assert.equal(constraints.mountingHoles.count, 4);
  assert.equal(constraints.mountingHoles.diameterMm, 2.2);
});

test("connector edge placement preferences are part of outline constraints", () => {
  const constraints = buildMechanicalConstraints({ connectorEdgePreferences: [{ ref: "J1", edge: "left", flushToEdge: true }] });
  assert.equal(constraints.connectorEdgePreferences[0].ref, "J1");
  assert.equal(constraints.connectorEdgePreferences[0].edge, "left");
});

test("outline-aware placement keeps REV_E final candidate DRC clean", () => {
  const drc = JSON.parse(fs.readFileSync(path.join(revERoot, "BoardForge_REV_E_Final_DRC.json"), "utf8"));
  assert.equal((drc.violations ?? []).length, 0);
  assert.equal((drc.unconnected_items ?? []).length, 0);
});

test("silkscreen cleanup reports zero REV_E silkscreen DRC", () => {
  const report = fs.readFileSync(path.join(revERoot, "BoardForge_REV_E_Silkscreen_Cleanup_Report.md"), "utf8");
  assert.match(report, /Silkscreen DRC: 0/);
});

test("REV_E outline manufacturing candidate exports package", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(revERoot, "manufacturing/BoardForge_REV_E_Manufacturing_Manifest.json"), "utf8"));
  assert.equal(manifest.exported, true);
  assert.equal(manifest.edgeCutsValid, true);
  assert.equal(fs.existsSync(path.join(revERoot, "manufacturing/BF-SENSOR-HUB-01_REV_E_JLCPCB.zip")), true);
});
