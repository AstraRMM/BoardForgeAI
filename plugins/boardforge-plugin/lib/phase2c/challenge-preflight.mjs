import { validateChallengeManifest } from '../challenge/phase2c-challenge.mjs'

export function evaluateChallengePreflight({ manifest, digikey, mouser, kicad, rust, outputRoot }) {
  const manifestResult = validateChallengeManifest(manifest)
  const checks = [
    check('CHALLENGE_MANIFEST', manifestResult.ok, manifestResult.errors.join('; ') || `${manifest.boards.length} unique specifications`),
    check('OUTPUT_ROOT', Boolean(outputRoot), outputRoot || 'missing'),
    check('DIGIKEY_LIVE_AUTH', digikey?.configured === true && digikey?.authenticated === true, digikey?.authenticated ? 'authenticated' : 'live OAuth authentication unavailable'),
    check('MOUSER_LIVE_API', mouser?.configured === true && mouser?.liveReachable === true, mouser?.liveReachable ? 'live API reachable' : 'live Search API unavailable'),
    check('KICAD_CLI', kicad?.available === true, kicad?.version || 'unavailable'),
    check('RUST_ENGINE', rust?.available === true, rust?.version || 'unavailable'),
  ]
  const blockers = checks.filter(row => !row.passed)
  return { schema:'boardforge.phase2c.challenge-preflight.v1', status:blockers.length?'BLOCKED_PREFLIGHT':'READY_TO_GENERATE', checks, blockers, acceptedBoards:0, attemptedBoards:0, preventedWaste:true }
}

function check(id, passed, detail) { return { id, passed:Boolean(passed), detail } }
