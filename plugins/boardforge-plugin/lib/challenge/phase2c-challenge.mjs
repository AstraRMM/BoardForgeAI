import { createHash } from 'node:crypto';

export const CHALLENGE_SCHEMA = 'boardforge.phase2c.challenge.v1';
export const ACCEPTANCE_SCHEMA = 'boardforge.phase2c.acceptance.v1';
export const LEARNING_SCHEMA = 'boardforge.phase2c.learning-ledger.v1';

const REQUIRED_STAGES = [
  'requirements', 'architecture', 'schematic', 'componentSelection', 'outline',
  'placement', 'routing', 'erc', 'drc', 'manufacturing', 'liveSourcing', 'proof',
];

const REQUIRED_ARTIFACTS = [
  'requirements', 'architecture', 'boardBrief', 'schematic', 'pcb', 'gerbers',
  'drill', 'bom', 'cpl', 'manufacturingZip', 'engineeringReport',
  'validationReport', 'sourcingReport', 'evidence', 'health', 'routeability',
  'compactness', 'proof',
];

export function stableDigest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function validateChallengeManifest(manifest) {
  const errors = [];
  if (manifest?.schema !== CHALLENGE_SCHEMA) errors.push(`schema must be ${CHALLENGE_SCHEMA}`);
  if (!Array.isArray(manifest?.boards) || manifest.boards.length !== 50) errors.push('exactly 50 board specifications are required');
  const ids = new Set();
  const slugs = new Set();
  for (const [index, board] of (manifest?.boards ?? []).entries()) {
    const where = `boards[${index}]`;
    if (!/^\d{3}_[A-Z0-9_]+$/.test(board.id ?? '')) errors.push(`${where}.id is invalid`);
    if (ids.has(board.id)) errors.push(`${where}.id is duplicated`); else ids.add(board.id);
    if (!/^[a-z0-9-]+$/.test(board.slug ?? '')) errors.push(`${where}.slug is invalid`);
    if (slugs.has(board.slug)) errors.push(`${where}.slug is duplicated`); else slugs.add(board.slug);
    if (!board.purpose || !board.architectureClass) errors.push(`${where} needs purpose and architectureClass`);
    if (!Number.isInteger(board.minimumFunctionalBlocks) || board.minimumFunctionalBlocks < 3) errors.push(`${where}.minimumFunctionalBlocks must be >= 3`);
    if (!Number.isFinite(board.maximumAreaMm2) || board.maximumAreaMm2 <= 0) errors.push(`${where}.maximumAreaMm2 must be positive`);
    if (!['standard', 'custom'].includes(board.outline?.kind)) errors.push(`${where}.outline.kind is invalid`);
    if (board.outline?.kind === 'custom' && !board.outline?.purpose) errors.push(`${where}.outline.purpose is required`);
    if (!Array.isArray(board.distinguishingFeatures) || board.distinguishingFeatures.length < 2) errors.push(`${where} needs distinguishing features`);
  }
  const custom = (manifest?.boards ?? []).filter((board) => board.outline?.kind === 'custom').length;
  if (custom < 30) errors.push(`custom outline quota is ${custom}/50; minimum is 30/50`);
  return { ok: errors.length === 0, errors, customOutlineCount: custom };
}

export function evaluateBoardAcceptance(record) {
  const failures = [];
  if (record?.schema !== ACCEPTANCE_SCHEMA) failures.push(`schema must be ${ACCEPTANCE_SCHEMA}`);
  for (const stage of REQUIRED_STAGES) {
    if (record?.stages?.[stage]?.status !== 'passed') failures.push(`stage ${stage} did not pass`);
  }
  for (const artifact of REQUIRED_ARTIFACTS) {
    const evidence = record?.artifacts?.[artifact];
    if (!evidence?.path || !evidence?.sha256 || evidence.syntheticPlaceholder === true) failures.push(`artifact ${artifact} lacks verified evidence`);
  }
  if (record?.validation?.ercViolations !== 0) failures.push('ERC must be zero');
  if (record?.validation?.drcViolations !== 0) failures.push('DRC must be zero');
  if (record?.validation?.kicadCliRan !== true) failures.push('KiCad CLI validation must run');
  if (record?.sourcing?.digikey?.liveVerified !== true) failures.push('DigiKey sourcing is not live verified');
  if (record?.sourcing?.mouser?.liveVerified !== true) failures.push('Mouser sourcing is not live verified');
  if (record?.sourceProtection?.sourceHashBefore !== record?.sourceProtection?.sourceHashAfter) failures.push('source project was mutated');
  if (record?.manufacturing?.ready !== true) failures.push('manufacturing package is not ready');
  if (!(record?.metrics?.componentDensityPerCm2 > 0)) failures.push('component density is not measured');
  if (!(record?.metrics?.boardAreaMm2 > 0)) failures.push('board area is not measured');
  return { accepted: failures.length === 0, failures };
}

export function validateLearningEntry(entry) {
  const errors = [];
  if (entry?.schema !== LEARNING_SCHEMA) errors.push(`schema must be ${LEARNING_SCHEMA}`);
  if (!entry?.boardId || !entry?.attemptId || !entry?.failedStage || !entry?.rootCause) errors.push('failure identity and root cause are required');
  const outcomes = ['engineChange', 'regressionTest', 'documentedLimitation'].filter((key) => entry?.outcome?.[key]);
  if (outcomes.length === 0) errors.push('failure needs an engine change, regression test, or documented limitation');
  if (entry?.retry?.status === 'passed' && !entry?.retry?.evidenceSha256) errors.push('a passed retry needs immutable evidence');
  return { ok: errors.length === 0, errors };
}

export function appendLearningEntry(ledger, entry) {
  const result = validateLearningEntry(entry);
  if (!result.ok) throw new Error(result.errors.join('; '));
  const entries = [...(ledger?.entries ?? []), { ...entry, digest: stableDigest(entry) }];
  return { schema: LEARNING_SCHEMA, entries };
}

export const challengeContract = Object.freeze({
  requiredStages: REQUIRED_STAGES,
  requiredArtifacts: REQUIRED_ARTIFACTS,
  acceptance: 'all_gates_must_pass',
  retryPolicy: 'fix_engine_add_regression_or_document_limitation_before_retry',
  speedTargetSeconds: 90,
});
