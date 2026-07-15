# BoardForge Local Engine Contract Freeze (v1)

This document freezes the Node localhost engine surface before strangler migration to Rust. The machine-readable authority is `contracts/local-engine/v1/routes.json`; representative typed envelopes are in `fixtures.json` and constrained by `contract.schema.json`.

## Transport and security

- Bind: `127.0.0.1:38991`; localhost requests only.
- JSON over HTTP. Implemented verbs are GET and POST; OPTIONS is handled for CORS.
- All routes except pairing verification/revocation require the local pairing token. The token is supplied as `x-boardforge-token` or `pairingToken` in the JSON body.
- The fixed response envelope is `{ ok, status, data, errors, warnings, artifactPaths }`. Current HTTP mapping is 200 when `ok` is true and 400 otherwise.
- Project and outline paths pass the protected-path guard. Publish additionally requires explicit confirmation.

## Route families

The frozen manifest covers pairing (4 routes), service/setup/sourcing (9), outline (7), evidence/import (3), intake/brief (5), project lifecycle and engineering actions (28), and jobs (6). Aliases such as both outline generation paths are intentionally retained.

Dynamic route notation (`:id`) describes path parameters, not literal paths. Query-based `projectDir` remains supported on project and outline GET routes. Payload shapes are presently action-specific and permissive; the stable v1 guarantees are route, verb, envelope, status vocabulary, security guard, and artifact-path reporting. Deep request/response schemas should be added fixture-by-fixture before a route switches to Rust.

## Client compatibility finding

The browser artifact client advertises an older subset through `localArtifactApiContract.endpoints`, while the job client separately advertises job routes. Neither list is the complete server contract. Rust parity must use the frozen manifest and tests, not either client list alone. Existing browser callers continue to work; this freeze does not alter runtime behavior.

## Migration rule

A Rust route may replace its Node counterpart only when it consumes the same fixture request, returns a structurally equivalent normalized envelope, preserves security/path behavior, and passes KiCad structural comparison where artifacts are emitted. Unsupported KiCad constructs must survive round trip rather than be silently discarded.
