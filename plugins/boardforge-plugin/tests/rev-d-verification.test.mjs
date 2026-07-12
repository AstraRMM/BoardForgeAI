import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const revDRoot = "C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-SENSOR-HUB-01_REV_D";

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(revDRoot, name), "utf8"));
}

test("verified part selection reports every REV_D component without fake stock", () => {
  const parts = readJson("BoardForge_REV_D_Verified_Part_Selection_Report.json");
  assert.ok(parts.length >= 30);
  assert.equal(parts.every((part) => part.selectedMPN && part.symbol && part.footprint), true);
  assert.equal(parts.every((part) => ["NOT_API_VERIFIED", "PLACEHOLDER"].includes(part.sourcingStatus)), true);
  assert.equal(parts.every((part) => part.stockStatus === "not_checked"), true);
});

test("symbol footprint pinmap equivalence passes critical REV_D components", () => {
  const rows = readJson("BoardForge_REV_D_Pin_Map_Equivalence_Report.json");
  assert.ok(rows.length >= 30);
  assert.equal(rows.every((row) => row.status === "PASS"), true);
  assert.equal(rows.find((row) => row.ref === "U1").criticalNetsChecked.includes("SWDIO"), true);
  assert.equal(rows.find((row) => row.ref === "J1").criticalNetsChecked.includes("USB_D+"), true);
});

test("no silent placeholders are allowed in REV_D manufacturing disclosure", () => {
  const parts = readJson("BoardForge_REV_D_Verified_Part_Selection_Report.json");
  const silent = parts.filter((part) => !part.sourcingStatus || !part.risk);
  assert.deepEqual(silent, []);
});

test("sourcing status report marks unverified candidates instead of faking availability", () => {
  const parts = readJson("BoardForge_REV_D_Verified_Part_Selection_Report.json");
  assert.equal(parts.some((part) => part.sourcingStatus === "NOT_API_VERIFIED"), true);
  assert.equal(parts.some((part) => part.stockStatus === "in_stock"), false);
});

test("REV_D end-to-end manufacturing candidate is clean and disclosed", () => {
  const drc = readJson("BoardForge_REV_D_Final_DRC.json");
  const erc = readJson("BoardForge_REV_D_Final_ERC.json");
  const manifest = readJson("manufacturing/BoardForge_REV_D_Manufacturing_Manifest.json");
  assert.equal((drc.violations ?? []).length, 0);
  assert.equal((drc.unconnected_items ?? []).length, 0);
  assert.equal((erc.violations ?? []).length, 0);
  assert.equal(manifest.bomSourcingFields, true);
  assert.equal(manifest.placeholderDisclosure, true);
  assert.equal(fs.existsSync(path.join(revDRoot, "manufacturing", "BF-SENSOR-HUB-01_REV_D_JLCPCB.zip")), true);
});
