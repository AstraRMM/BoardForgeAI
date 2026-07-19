import path from "node:path";
import { execFile as childExecFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { runRealBoardProof } from "../real-board-proof.mjs";
import { productionAssetBindings, runPhase2cManufacturingPipeline } from "./manufacturing-pipeline.mjs";
import {
  usbCFixedSourceRealBoardDefinition,
  usbCFixedSourceTemplate,
  validateUsbCFixedSourceReleaseEvidence,
} from "./templates/usb-c-fixed-source.mjs";

const execFile = promisify(childExecFile);
const repoRoot = path.resolve(import.meta.dirname, "../../../..");

/**
 * Emit a separate, candidate-only KiCad project for the fixed-current Board005
 * replacement.  The function intentionally does not call the challenge
 * delivery/checkpoint writer: a clean-looking project without current live
 * supplier evidence and manufacturing acceptance is not an accepted board.
 */
export async function generateUsbCFixedSourceProductionCandidate({ outputRoot, fresh = true, liveBindings = true } = {}) {
  if (!outputRoot) throw new TypeError("outputRoot is required for a fixed-source production candidate");
  const root = path.resolve(outputRoot);
  if (fresh) await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const definition = usbCFixedSourceRealBoardDefinition(usbCFixedSourceTemplate);
  const summary = await runRealBoardProof({
    outputRoot: root,
    fresh: false,
    board: definition.id,
    boardDefinitions: [definition],
    liveBindings,
  });
  const generated = summary.boards[0];
  const validation = {
    ercErrors: generated?.erc?.issueCounts?.errors ?? generated?.erc?.errors ?? null,
    ercWarnings: generated?.erc?.issueCounts?.warnings ?? generated?.erc?.warnings ?? null,
    drcErrors: generated?.drc?.issueCounts?.errors ?? generated?.drc?.errors ?? null,
    drcWarnings: generated?.drc?.issueCounts?.warnings ?? generated?.drc?.warnings ?? null,
    unconnected: generated?.drc?.issueCounts?.unconnected ?? generated?.drc?.unconnected ?? 0,
  };
  // Consume only the timestamped live provider records produced by the real
  // proof.  Missing reports deliberately remain empty and keep release closed.
  const sourcing = await liveProviderEvidence(generated?.outputFolder, definition);
  // A non-live candidate is intentionally only an electrical-development
  // artifact; it cannot satisfy the manufacturer acceptance contract.
  const manufacturing = liveBindings ? await manufacturingAcceptance({ generated, definition }) : null;
  const releaseGate = validateUsbCFixedSourceReleaseEvidence({
    template: usbCFixedSourceTemplate,
    sourcing,
    validation,
    manufacturingAccepted: manufacturing?.acceptance?.accepted === true,
  });
  const result = {
    schema: "boardforge.phase2c.usb-c-fixed-source-production-candidate.v1",
    status: releaseGate.ok ? "CANDIDATE_ACCEPTED_RELEASE_READY" : "CANDIDATE_EMITTED_RELEASE_GATE_STILL_CLOSED",
    // The runner consumes top-level strict acceptance while the detailed
    // evidence remains attached below.  A closed release gate never exposes
    // an accepted result merely because an intermediate artifact exists.
    acceptance: releaseGate.ok && manufacturing?.acceptance?.accepted === true
      ? manufacturing.acceptance
      : { status: "BOARD_REJECTED", accepted: false, blockers: [{ code: "USB_C_FIXED_SOURCE_RELEASE_GATE_CLOSED" }] },
    projectDir: generated?.outputFolder || null,
    definition,
    realBoardProof: generated || null,
    manufacturingEvidence: manufacturing || null,
    validation,
    releaseGate,
    deliveryMutation: false,
  };
  await writeFile(path.join(root, "BoardForge_USB_C_Fixed_Source_Candidate.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  return result;
}

/**
 * This is deliberately the same real KiCad CLI manufacturing path used by the
 * phase-2c gate.  Its input is the newly-created candidate's own KiCad files,
 * live provider report, canonical binding report, and Rust reparse result;
 * no release status is inferred from the candidate generator alone.
 */
async function manufacturingAcceptance({ generated, definition }) {
  const projectDir = generated?.outputFolder;
  if (!projectDir || !generated?.assetBinding) return null;
  const files = await readdir(projectDir);
  const schematic = files.find((file) => file.endsWith(".kicad_sch"));
  const pcb = files.find((file) => file.endsWith(".kicad_pcb"));
  if (!schematic || !pcb) return null;
  const schematicFile = path.join(projectDir, schematic);
  const pcbFile = path.join(projectDir, pcb);
  const sourcing = await readFile(path.join(projectDir, "BoardForge_BOM_Sourcing_Report.json"), "utf8").then(JSON.parse);
  const sourceBytes = (await readFile(pcbFile)).length;
  const rust = await execFile(path.join(repoRoot, "rust/target/debug/boardforge-kicad.exe"), ["normalize", pcbFile], { maxBuffer: 50 * 1024 * 1024 });
  const area = Number(definition?.widthMm) * Number(definition?.heightMm);
  const proof = {
    rustReparsePassed: rust.stdout.length > 0,
    structuralDiff: { sourceBytes, normalizedBytes: rust.stdout.length },
  };
  return runPhase2cManufacturingPipeline({
    projectDir,
    schematicFile,
    pcbFile,
    sourcing,
    assetBindings: productionAssetBindings(generated.assetBinding),
    proof,
    metrics: { boardAreaMm2: area, componentDensity: sourcing.rows.length / area },
    unconnectedItems: generated?.drc?.issueCounts?.unconnected ?? generated?.drc?.unconnected ?? 0,
  });
}

async function liveProviderEvidence(projectDir, definition) {
  if (!projectDir) return {};
  const report = await readFile(path.join(projectDir, "BoardForge_BOM_Sourcing_Report.json"), "utf8").then(JSON.parse).catch(() => null);
  if (report?.status !== "SOURCING_LIVE_VERIFIED" || !Array.isArray(report.rows)) return {};
  const expected = new Set((definition?.bom || []).map((row) => row.mpn));
  const rows = (provider) => [...new Map(report.rows.filter((row) => expected.has(row.mpn)).map((row) => [row.mpn, row])).values()].map((row) => {
    const evidence = row.providers?.[provider];
    return { mpn: row.mpn, quantityAvailable: evidence?.quantityAvailable, lifecycle: evidence?.live === true ? "active" : null, verifiedAt: evidence?.queriedAt || null };
  });
  return { digikey: rows("digikey"), mouser: rows("mouser") };
}
