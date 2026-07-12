import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  compareSchematicGraphToPcbText,
  readKiCadSchematicSymbolGraph,
  validateRealSchematicSymbolGraph,
} from "../lib/schematic/real-schematic-symbol-graph.mjs";

const revCRoot = "C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-SENSOR-HUB-01_REV_C";
const schematicPath = path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C.kicad_sch");
const pcbPath = path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C_boardforge_rules_unified_silk_cleanup.kicad_pcb");

const requiredNets = [
  "+5V",
  "+3V3",
  "GND",
  "USB_D+",
  "USB_D-",
  "MCU_NRST",
  "SWDIO",
  "SWCLK",
  "I2C1_SCL",
  "I2C1_SDA",
  "UART1_TX",
  "UART1_RX",
  "CAN_TX",
  "CAN_RX",
  "CANH",
  "CANL",
  "IMU_INT",
  "BARO_INT",
  "LED_STATUS",
  "BOOT0",
];

test("real schematic symbol graph includes connected symbols and named nets", () => {
  const graph = readKiCadSchematicSymbolGraph(schematicPath);
  const validation = validateRealSchematicSymbolGraph(graph, requiredNets);
  assert.equal(validation.valid, true);
  assert.ok(validation.symbolCount >= 25);
});

test("symbol footprint field completeness covers every schematic component", () => {
  const graph = readKiCadSchematicSymbolGraph(schematicPath);
  assert.equal(graph.symbols.every((symbol) => symbol.reference && symbol.value && symbol.footprint), true);
  assert.equal(graph.symbols.some((symbol) => symbol.reference === "U1" && /STM32G431/.test(symbol.value)), true);
});

test("schematic to PCB netlist consistency keeps generated references on the PCB", () => {
  const graph = readKiCadSchematicSymbolGraph(schematicPath);
  const pcbText = fs.readFileSync(pcbPath, "utf8");
  const consistency = compareSchematicGraphToPcbText(graph, pcbText);
  assert.equal(consistency.consistent, true);
});

test("REV_C end-to-end manufacturing candidate has clean DRC, ERC, and package", () => {
  const drc = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_Final_DRC.json"), "utf8"));
  const erc = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_Final_ERC.json"), "utf8"));
  assert.equal((drc.violations ?? []).length, 0);
  assert.equal((drc.unconnected_items ?? []).length, 0);
  assert.equal((erc.violations ?? []).length, 0);
  assert.equal(fs.existsSync(path.join(revCRoot, "manufacturing", "BF-SENSOR-HUB-01_REV_C_JLCPCB.zip")), true);
});

test("freerouting workflow produced SES and direct import evidence", () => {
  const importReport = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_SES_Import_Report.json"), "utf8"));
  assert.equal(fs.existsSync(path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C_freerouting.ses")), true);
  assert.ok(importReport.tracksImported > 0);
  assert.ok(importReport.viasImported > 0);
  assert.deepEqual(importReport.failures, []);
});

test("postroute cleanup preserved connectivity while removing silkscreen DRC", () => {
  const cleanup = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_PostRoute_Cleanup_Report.json"), "utf8"));
  const drc = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_Final_DRC.json"), "utf8"));
  assert.ok(cleanup.grTextRemoved >= 9);
  assert.equal((drc.unconnected_items ?? []).length, 0);
  assert.equal(drc.violations.length, 0);
});

test("new-project generation creates REV_C KiCad project files", () => {
  assert.equal(fs.existsSync(path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C.kicad_pro")), true);
  assert.equal(fs.existsSync(path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C.kicad_sch")), true);
  assert.equal(fs.existsSync(path.join(revCRoot, "BF-SENSOR-HUB-01_REV_C.kicad_pcb")), true);
});

test("real KiCad schematic generation produces loadable symbol graph", () => {
  const graph = readKiCadSchematicSymbolGraph(schematicPath);
  assert.ok(graph.symbolCount >= 25);
  assert.equal(graph.labels.includes("SWDIO"), true);
  assert.equal(graph.labels.includes("I2C1_SCL"), true);
});

test("footprint sanity uses non-empty routable footprint fields", () => {
  const graph = readKiCadSchematicSymbolGraph(schematicPath);
  assert.equal(graph.symbols.every((symbol) => symbol.footprint.includes(":")), true);
});

test("preroute shorts zero before FreeRouting", () => {
  const report = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_PreRoute_Shorts_Report.json"), "utf8"));
  assert.equal(report.preRouteShorts, 0);
  assert.equal(report.forbiddenVias, 0);
});

test("SES import succeeds for REV_C FreeRouting output", () => {
  const report = JSON.parse(fs.readFileSync(path.join(revCRoot, "BoardForge_REV_C_SES_Import_Report.json"), "utf8"));
  assert.ok(report.tracksImported > 0);
  assert.ok(report.viasImported > 0);
  assert.equal(report.failures.length, 0);
});
