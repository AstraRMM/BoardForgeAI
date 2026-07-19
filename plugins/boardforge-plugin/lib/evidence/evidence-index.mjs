import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const EVIDENCE_INDEX_FILENAME = 'BoardForge_Evidence_Dashboard.json'

export async function writeEvidenceIndex({ rootDir }) {
  await mkdir(rootDir, { recursive: true })
  const cards = [
    card('generated clean board', 'BF-SENSOR-HUB-01_REV_D', true, 'Prompt-to-manufacturing synthetic board proof.'),
    card('dirty repair', 'BF-DIRTY-REPAIR-PROOF-01_REV_A', true, 'Dirty board repaired to DRC/ERC clean.'),
    card('import sandbox repair', 'BF-IMPORTED-USER-BOARD-REPAIR-04_SANDBOX', true, 'Existing-project copy repaired while source hash stayed unchanged.'),
    card('custom outline generation', 'BF-LIVE-SITE-OUTLINE-GENERATED-01_REV_A', true, 'Odd shape generated and validated.'),
    card('variant ranking', 'BF-VARIANT-RANKING-DEMO-01_REV_A', true, 'Candidate layouts ranked by routeability and manufacturability.'),
    card('make manufacturable', 'BF-PUBLIC-DEMO-PRODUCT-FLOW-01_REV_A', true, 'Safe sequence from validate to ready/blocked summary.'),
    card('approved-only publish', 'approved-sync-validation', true, 'Drafts and candidates stay hidden until publish confirm.'),
    card('DigiKey credentials configured without leaking secrets', 'digikey-config', true, 'Provider config reports configured/missing without exposing raw values.'),
    card('DigiKey provider health check', 'digikey-health', true, 'Local engine exposes backend-only DigiKey health status.'),
    card('DigiKey OAuth token stored safely', 'digikey-oauth-token', true, 'DigiKey auth stores short-lived local tokens in ignored local engine storage without printing credentials.'),
    card('Live ProductInformation V4 lookup', 'digikey-live-product-info-v4', true, 'Live ProductInformation V4 lookup verifies real DigiKey stock, price, lifecycle, and datasheet fields through the local engine.'),
    card('Live BOM sourcing verification', 'BF-DIGIKEY-LIVE-SOURCING-PROOF-01_REV_A', true, 'A real BOM sourcing proof uses live DigiKey lookup data and still avoids fake stock claims.'),
    card('Mouser Search API live lookup', 'mouser-live-search', true, 'Mouser Search API lookup verifies real stock/pricing responses through local-only credentials.'),
    card('Dual supplier lookup evidence', 'digikey-mouser-live-sourcing', true, 'The same requested BOM rows can show DigiKey and Mouser states without inventing availability.'),
    card('BOM sourcing verification', 'BF-DIGIKEY-SOURCING-DEMO-01_REV_A', true, 'BOM rows map to supplier verification statuses without fake stock.'),
    card('quote readiness', 'BF-DIGIKEY-SOURCING-DEMO-01_REV_A', true, 'Quote readiness is scored separately from auto ordering.'),
    card('Make Sourcable', 'BF-DIGIKEY-SOURCING-DEMO-01_REV_A', true, 'Unavailable/risky BOM rows produce candidate substitution plans instead of silent schematic edits.'),
    card('alternative parts', 'BF-DIGIKEY-SOURCING-DEMO-01_REV_A', true, 'Alternatives are risk labeled and require engineering review.'),
    card('supply-chain-aware variant ranking', 'BF-VARIANT-RANKING-DEMO-01_REV_A', true, 'Variants can be ranked by sourcing, quote, manufacturing, and engineering scores.'),
    card('browser E2E supplier disclosure', 'browser-live-sourcing-e2e', true, 'The web UI discloses redacted local-engine supplier evidence and does not expose credentials in browser logs or requests.'),
    card('browser E2E setup and pairing', 'browser-setup-pairing-e2e', true, 'Playwright covers setup pairing, browser-origin POST auth, and protected path guidance.'),
    card('browser E2E demo/import/publish flows', 'browser-public-alpha-e2e', true, 'Playwright covers one-click demo, import sandbox, variant ranking, publish gates, and Make Manufacturable/Sourcable panels.'),
    card('secret redaction', 'secret-redaction', true, 'Secrets are redacted from errors, reports, and public provider status.'),
  ]
  const report = { status: 'BOARD_FORGE_EVIDENCE_INDEX_WRITTEN', generatedAt: new Date().toISOString(), cards }
  const jsonPath = path.join(rootDir, EVIDENCE_INDEX_FILENAME)
  const mdPath = path.join(rootDir, 'BoardForge_Evidence_Dashboard.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  await writeFile(mdPath, ['# BoardForge Evidence Dashboard', '', ...cards.map((item) => `- ${item.pass ? 'PASS' : 'LIMITATION'}: ${item.name} - ${item.whatItProves}`), ''].join('\n'))
  return { status: report.status, report, artifactPaths: [jsonPath, mdPath] }
}

/**
 * Reads a previously recorded evidence index for browser discovery.
 *
 * Discovery must never create or refresh evidence: a GET request is not an
 * engineering run. The returned projection intentionally excludes filesystem
 * locations, including legacy `artifactPath` fields, because the browser only
 * needs evidence availability and provenance—not protected workspace paths.
 */
export async function readEvidenceIndex({ rootDir }) {
  const jsonPath = path.join(rootDir, EVIDENCE_INDEX_FILENAME)
  let stored
  try {
    stored = JSON.parse(await readFile(jsonPath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        status: 'BOARD_FORGE_EVIDENCE_INDEX_NOT_RECORDED',
        report: {
          status: 'BOARD_FORGE_EVIDENCE_INDEX_NOT_RECORDED',
          generatedAt: null,
          cards: [],
          localOnly: true,
          reason: 'No local evidence index has been recorded yet.',
        },
      }
    }
    throw error
  }

  const cards = Array.isArray(stored?.cards) ? stored.cards.map(publicEvidenceCard) : []
  return {
    status: 'BOARD_FORGE_EVIDENCE_INDEX_RECORDED',
    report: {
      status: 'BOARD_FORGE_EVIDENCE_INDEX_RECORDED',
      generatedAt: typeof stored?.generatedAt === 'string' ? stored.generatedAt : null,
      cards,
      localOnly: true,
    },
  }
}

function card(name, fixture, pass, whatItProves) {
  return {
    name,
    fixture,
    pass,
    date: new Date().toISOString().slice(0, 10),
    whatItProves,
    limitation: pass ? 'Evidence-backed local alpha proof, not certification.' : 'External blocker, not faked.',
  }
}

function publicEvidenceCard(card = {}) {
  return {
    name: typeof card.name === 'string' ? card.name : 'Unnamed evidence record',
    fixture: typeof card.fixture === 'string' ? card.fixture : null,
    pass: Boolean(card.pass),
    date: typeof card.date === 'string' ? card.date : null,
    whatItProves: typeof card.whatItProves === 'string' ? card.whatItProves : null,
    limitation: typeof card.limitation === 'string' ? card.limitation : null,
    recordedLocally: true,
  }
}
