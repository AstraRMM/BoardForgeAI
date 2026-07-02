# BoardForge Product Surface Audit

## Real Product Surfaces

- Localhost engine service at `127.0.0.1:38991`
- Web app pages for dashboard, new board, custom outline, projects, downloads, readiness, upload/import, pricing, docs
- KiCad plugin scaffold with protected-path and sandbox policy
- CLI and local-service CLI clients
- Project manifests, dashboard cards, previews, downloads manifests, replay commands
- Manufacturing ZIP gates for proven synthetic/imported fixtures

## Scaffolded / Alpha Surfaces

- Web action panels describe localhost routes and offline behavior; browser-side mutations are alpha local-service flow, not hosted cloud execution
- KiCad native UI remains log/status oriented until a richer panel is built
- License/entitlement gate is local/dev scaffold, not production billing
- Supplier providers are API-path ready but require credentials

## Missing / Next

- Production installer/signing
- Supplier API credentials and verified assembly readiness
- Real PoE compliance/safety review
- Rich native KiCad panel
- Broader arbitrary imported-board routing beyond sandbox proof suite
