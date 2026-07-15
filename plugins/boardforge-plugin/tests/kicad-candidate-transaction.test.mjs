import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createKiCadCandidateService } from "../lib/platform/kicad/candidate-transaction-service.mjs";
import { createLocalServerRouter } from "../lib/platform/local-server/routes.mjs";
const cli = path.resolve("rust/target/debug/boardforge-kicad.exe");
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const source = "(kicad_sch (version 1) (symbol (at 1 2 0) (uuid s)))\n";
const transaction = {
  version: 1,
  operations: [
    { op: "move_symbol", uuid: "s", x: 4, y: 5, expected_x: 1, expected_y: 2 },
  ],
};
async function fixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bf-kicad-candidate-"));
  const file = path.join(root, "board.kicad_sch");
  await writeFile(file, source);
  return {
    root,
    file,
    service: createKiCadCandidateService({
      rootDir: root,
      cliPath: cli,
      ...options,
    }),
  };
}
test("candidate writer is isolated, atomic, reported, promoted locally, and discardable", async () => {
  const f = await fixture({
    kicadValidator: async () => ({
      status: "PASSED",
      stdout: "clean",
      stderr: "",
      timedOut: false,
      cleanup: { attempted: false },
    }),
  });
  const result = await f.service.apply({
    id: "c1",
    sourcePath: f.file,
    sourceHash: sha(source),
    transaction,
  });
  assert.equal(await readFile(f.file, "utf8"), source);
  assert.match(await readFile(result.candidatePath, "utf8"), /\(at 4 5 0\)/);
  assert.equal((await f.service.reports("c1")).diff.length, 1);
  await f.service.validate("c1");
  const promoted = await f.service.promote("c1");
  assert.ok(
    promoted.promotedPath.includes(
      `${path.sep}.boardforge${path.sep}local${path.sep}`,
    ),
  );
  assert.equal((await f.service.discard("c1")).sourceUnchanged, true);
  assert.equal(existsSync(path.dirname(result.candidatePath)), false);
  await rm(f.root, { recursive: true, force: true });
});
test("candidate writer rejects stale hashes without artifacts", async () => {
  const f = await fixture();
  await assert.rejects(
    () =>
      f.service.apply({
        id: "bad",
        sourcePath: f.file,
        sourceHash: "bad",
        transaction,
      }),
    (e) => e.status === "BLOCKED_STALE_SOURCE_HASH",
  );
  assert.equal(
    existsSync(path.join(f.root, ".boardforge", "candidates", "bad")),
    false,
  );
  await rm(f.root, { recursive: true, force: true });
});
test("v2 routes expose candidate lifecycle", async () => {
  const f = await fixture();
  const router = createLocalServerRouter({ rootDir: f.root, kicadValidator: async () => ({ status: "PASSED", stdout: "clean", stderr: "", timedOut: false, cleanup: { attempted: false } }) });
  const created = await router({
    method: "POST",
    pathname: "/v2/kicad/candidates",
    payload: {
      id: "route",
      sourcePath: f.file,
      sourceHash: sha(source),
      transaction,
    },
  });
  assert.equal(created.ok, true);
  assert.equal(
    (
      await router({
        method: "GET",
        pathname: "/v2/kicad/candidates/route/status",
      })
    ).data.sourceUnchanged,
    true,
  );
  assert.equal(
    (
      await router({
        method: "GET",
        pathname: "/v2/kicad/candidates/route/reports",
      })
    ).data.diff.length,
    1,
  );
  await router({
    method: "POST",
    pathname: "/kicad/v2/candidate/validate",
    payload: { id: "route" },
  });
  assert.equal(
    (
      await router({
        method: "POST",
        pathname: "/v2/kicad/candidates/route/promote-as-local",
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await router({
        method: "POST",
        pathname: "/v2/kicad/candidates/route/discard",
      })
    ).ok,
    true,
  );
  await rm(f.root, { recursive: true, force: true });
});
test("closure-contract aliases write, validate, inspect, promote, and discard", async () => {
  const f = await fixture();
  const router = createLocalServerRouter({ rootDir: f.root, kicadValidator: async () => ({ status: "BLOCKED_KICAD_CLI_UNAVAILABLE", explicitBlocker: true, stdout: "", stderr: "KiCad CLI unavailable", timedOut: false, cleanup: { attempted: false } }) });
  assert.equal(
    (
      await router({
        method: "POST",
        pathname: "/kicad/v2/candidate/write",
        payload: {
          id: "contract",
          sourcePath: f.file,
          sourceHash: sha(source),
          transaction,
        },
      })
    ).ok,
    true,
  );
  const validation = await router({
    method: "POST",
    pathname: "/kicad/v2/candidate/validate",
    payload: { id: "contract" },
  });
  assert.equal(validation.data.rust.reparsed, true);
  assert.equal(
    (
      await router({
        method: "GET",
        pathname: "/kicad/v2/candidate/contract/status",
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await router({
        method: "GET",
        pathname: "/kicad/v2/candidate/contract/reports",
      })
    ).data.diff.length,
    1,
  );
  const blockedPromotion = await router({
    method: "POST",
    pathname: "/kicad/v2/candidate/promote",
    payload: { id: "contract" },
  });
  assert.equal(blockedPromotion.ok, false);
  assert.equal(blockedPromotion.status, "BLOCKED_CANDIDATE_NOT_VALIDATED");
  assert.equal(
    (
      await router({
        method: "POST",
        pathname: "/kicad/v2/candidate/contract/discard",
      })
    ).ok,
    true,
  );
  await rm(f.root, { recursive: true, force: true });
});
test("validation persists bounded CLI evidence and blocks timeout promotion", async () => {
  const f = await fixture({
    kicadValidator: async ({ timeoutMs }) => ({
      status: "TIMEOUT_CLEANED",
      timeoutMs,
      stdout: "partial",
      stderr: "timed out",
      timedOut: true,
      cleanup: {
        attempted: true,
        method: "taskkill /t /f",
        status: 0,
        error: null,
      },
    }),
  });
  await f.service.apply({
    id: "timeout",
    sourcePath: f.file,
    sourceHash: sha(source),
    transaction,
  });
  const validation = await f.service.validate("timeout");
  assert.equal(validation.promotable, false);
  assert.equal(
    (await f.service.reports("timeout")).validation.kicad.cleanup.attempted,
    true,
  );
  await assert.rejects(
    () => f.service.promote("timeout"),
    (e) => e.status === "BLOCKED_CANDIDATE_NOT_VALIDATED",
  );
  await rm(f.root, { recursive: true, force: true });
});
