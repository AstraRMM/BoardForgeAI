import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { readdir, rm } from "node:fs/promises";
import { usbCFixedSourceRealBoardDefinition } from "../lib/phase2c/templates/usb-c-fixed-source.mjs";
import { generateUsbCFixedSourceProductionCandidate } from "../lib/phase2c/usb-c-fixed-source-production-engine.mjs";
import { categorySchematicPinMaps, usbCFixedSourceCategoryPcbEvidence } from "../lib/real-board-proof.mjs";

test("fixed-source Board005 topology keeps every TPS25810 pin and candidate output outside delivery", () => {
  const definition = usbCFixedSourceRealBoardDefinition();
  assert.equal(definition.topologyId, "usb-c-fixed-source");
  assert.equal(definition.layers, 4);
  assert.ok(definition.outlinePoints.length >= 6);
  assert.equal(Object.keys(definition.schematicPlacements).length, definition.bom.length, "each authoritative symbol needs an independent sheet location");
  const pins = categorySchematicPinMaps(definition).U1;
  assert.equal(Object.keys(pins).length, 21);
  assert.equal(pins[7], "5V_FUSED");
  assert.equal(pins[8], "GND");
  assert.equal(pins[14], "VBUS");
  const pcb = usbCFixedSourceCategoryPcbEvidence();
  assert.deepEqual(pcb.footprints.map((row) => row.ref).sort(), definition.bom.map((row) => row.ref).sort());
  assert.equal(pcb.segments.length, 0, "authoritative routing must begin from resolved exact pads");
});

test("fixed-source candidate emits a separate KiCad project and keeps release closed", { timeout: 120000 }, async () => {
  const root = path.join(os.tmpdir(), `BoardForge_Real_Board_Proofs-fixed-source-${Date.now()}`);
  try {
    const result = await generateUsbCFixedSourceProductionCandidate({ outputRoot: root, liveBindings: false });
    assert.equal(result.deliveryMutation, false);
    assert.equal(result.releaseGate.ok, false);
    assert.equal(result.acceptance.accepted, false, "a non-live candidate cannot expose runner acceptance");
    assert.match(result.status, /CANDIDATE_EMITTED_RELEASE_GATE_STILL_CLOSED/);
    assert.ok(result.projectDir);
    const files = await readdir(result.projectDir);
    assert.ok(files.some((name) => name.endsWith(".kicad_sch")));
    assert.ok(files.some((name) => name.endsWith(".kicad_pcb")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
