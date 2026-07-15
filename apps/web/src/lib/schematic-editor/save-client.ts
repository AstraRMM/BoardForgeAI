// Node's test runner requires the extension; the app bundler accepts it.
// @ts-expect-error TS5097 -- direct TypeScript execution under Node 24.
import { diffSchematic, type SchematicDocument } from "./model.ts";

export const SCHEMATIC_TRANSACTION_VERSION = 1 as const;
export const schematicCandidateRouteContract = {
  note: "Aligned with the kicad-v2 local-engine contract. Write creates only an isolated sandbox candidate; promote is the sole explicit local-project mutation.",
  create: "POST /kicad/v2/candidate/write",
  validate: "POST /kicad/v2/candidate/validate",
  status: "GET /kicad/v2/candidate/:id/status",
  reports: "GET /kicad/v2/candidate/:id/reports",
  promote: "POST /kicad/v2/candidate/promote",
  discard: "POST /kicad/v2/candidate/discard",
} as const;
export type EditOperation = {
  op: string;
  uuid: string;
  name?: string;
  value?: string;
  expected?: string;
  expected_x?: number;
  expected_y?: number;
  expected_angle?: number;
  expected_start?: [number, number];
  expected_end?: [number, number];
  x?: number;
  y?: number;
  angle?: number;
  start?: [number, number];
  end?: [number, number];
  text?: string;
  kind?: "local" | "global" | "hierarchical";
};
export type ApprovedSchematicTransaction = {
  contractVersion: "kicad-edit-v2";
  sourcePath: string;
  sandboxPath: string;
  baseDocumentHash: string;
  candidateId: string;
  approved: true;
  writeMode: "PRESERVE_MODE";
  transaction: {
    version: typeof SCHEMATIC_TRANSACTION_VERSION;
    operations: EditOperation[];
  };
  writePolicy: {
    directWrite: false;
    requireValidation: true;
    requireExplicitPromotion: true;
  };
};
export type CandidateReport = {
  id: string;
  state:
    "queued" | "validating" | "ready" | "blocked" | "promoted" | "discarded";
  progress: number;
  summary: string;
  warnings: string[];
  errors: string[];
  report?: Record<string, unknown>;
};
function candidateReport(value: any): CandidateReport {
  if (value?.state) return value as CandidateReport;
  const status = String(value?.status || value?.validation?.status || "");
  const ready = /VALID(?:_WITH_WARNINGS)?$/.test(status);
  const promoted = status.includes("PROMOTED");
  const discarded = status.includes("DISCARDED");
  const state: CandidateReport["state"] = promoted
    ? "promoted"
    : discarded
      ? "discarded"
      : ready
        ? "ready"
        : status.includes("BLOCK") || status.includes("ERROR")
          ? "blocked"
          : "validating";
  return {
    id: value?.id || "unknown",
    state,
    progress: ["ready", "blocked", "promoted", "discarded"].includes(state)
      ? 100
      : 60,
    summary: status || "Candidate status recorded",
    warnings:
      value?.erc === "ERC_WARNINGS_CLASSIFIED"
        ? ["KiCad loaded the candidate and reported classified ERC warnings."]
        : [],
    errors: state === "blocked" ? [value?.kicad?.stderr || status] : [],
    report: value,
  };
}
type Fetcher = typeof fetch;
const BASE = "http://127.0.0.1:38991";
async function request<T>(
  fetcher: Fetcher,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new Error(
      "Local engine not connected. Start the BoardForge desktop helper; no files were changed.",
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    const message = body?.errors?.[0]?.message || body?.message;
    throw new Error(
      typeof message === "string"
        ? message
        : `Local engine request failed (${response.status}); no files were changed.`,
    );
  }
  return (body?.data ?? body) as T;
}
function hashDocument(document: SchematicDocument) {
  const text = JSON.stringify(document);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
export function schematicOperations(
  base: SchematicDocument,
  next: SchematicDocument,
): EditOperation[] {
  const operations: EditOperation[] = [];
  for (const before of base.symbols) {
    const after = next.symbols.find((x) => x.id === before.id);
    if (!after) continue;
    if (before.x !== after.x || before.y !== after.y)
      operations.push({
        op: "move_symbol",
        uuid: before.id,
        x: after.x,
        y: after.y,
        expected_x: before.x,
        expected_y: before.y,
      });
    if (before.rotation !== after.rotation)
      operations.push({
        op: "rotate_symbol",
        uuid: before.id,
        angle: after.rotation,
        expected_angle: before.rotation,
      });
    for (const name of ["reference", "value", "footprint"] as const)
      if (before[name] !== after[name])
        operations.push({
          op: "edit_property",
          uuid: before.id,
          name,
          value: after[name],
          expected: before[name],
        });
  }
  for (const wire of next.wires)
    if (!base.wires.some((x) => x.id === wire.id))
      operations.push({
        op: "add_wire",
        uuid: wire.id,
        start: [wire.start.x, wire.start.y],
        end: [wire.end.x, wire.end.y],
      });
  for (const wire of base.wires)
    if (!next.wires.some((x) => x.id === wire.id))
      operations.push({
        op: "delete_wire",
        uuid: wire.id,
        expected_start: [wire.start.x, wire.start.y],
        expected_end: [wire.end.x, wire.end.y],
      });
  for (const label of next.labels) {
    const before = base.labels.find((x) => x.id === label.id);
    if (!before)
      operations.push({
        op: "add_label",
        uuid: label.id,
        x: label.x,
        y: label.y,
        text: label.text,
        kind: "local",
      });
    else {
      if (before.x !== label.x || before.y !== label.y)
        operations.push({
          op: "move_label",
          uuid: label.id,
          x: label.x,
          y: label.y,
          expected_x: before.x,
          expected_y: before.y,
        });
      if (before.text !== label.text)
        operations.push({
          op: "edit_label",
          uuid: label.id,
          text: label.text,
          expected: before.text,
        });
    }
  }
  for (const label of base.labels)
    if (!next.labels.some((x) => x.id === label.id))
      operations.push({
        op: "delete_label",
        uuid: label.id,
        expected: label.text,
      });
  if (diffSchematic(base, next).length && !operations.length)
    throw new Error(
      "The current change set contains an unsupported transaction operation",
    );
  return operations;
}
export function buildApprovedTransaction(
  sourcePath: string,
  sandboxPath: string,
  base: SchematicDocument,
  document: SchematicDocument,
  sourceHash?: string,
): ApprovedSchematicTransaction {
  const operations = schematicOperations(base, document);
  if (!operations.length)
    throw new Error("Cannot approve an empty schematic transaction");
  const baseDocumentHash = sourceHash || hashDocument(base);
  return {
    contractVersion: "kicad-edit-v2",
    sourcePath,
    sandboxPath,
    baseDocumentHash,
    candidateId: `schematic-${baseDocumentHash.slice(-8)}`,
    approved: true,
    writeMode: "PRESERVE_MODE",
    transaction: { version: 1, operations },
    writePolicy: {
      directWrite: false,
      requireValidation: true,
      requireExplicitPromotion: true,
    },
  };
}
export function createSchematicSaveClient(fetcher: Fetcher = fetch) {
  return {
    create: async (transaction: ApprovedSchematicTransaction) => {
      const written = await request<any>(fetcher, "/kicad/v2/candidate/write", {
        method: "POST",
        body: JSON.stringify(transaction),
      });
      return candidateReport(
        await request<any>(fetcher, "/kicad/v2/candidate/validate", {
          method: "POST",
          body: JSON.stringify({
            candidateId: written.id || transaction.candidateId,
            approved: true,
          }),
        }),
      );
    },
    status: async (id: string) =>
      candidateReport(
        await request<any>(
          fetcher,
          `/kicad/v2/candidate/${encodeURIComponent(id)}/status`,
        ),
      ),
    report: async (id: string) =>
      candidateReport(
        await request<any>(
          fetcher,
          `/kicad/v2/candidate/${encodeURIComponent(id)}/reports`,
        ),
      ),
    promoteLocal: async (id: string) =>
      candidateReport(
        await request<any>(fetcher, "/kicad/v2/candidate/promote", {
          method: "POST",
          body: JSON.stringify({ candidateId: id, approved: true }),
        }),
      ),
    discard: async (id: string) =>
      candidateReport(
        await request<any>(fetcher, "/kicad/v2/candidate/discard", {
          method: "POST",
          body: JSON.stringify({ candidateId: id }),
        }),
      ),
  };
}
