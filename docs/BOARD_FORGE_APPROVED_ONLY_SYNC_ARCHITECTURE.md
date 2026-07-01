# BoardForge Approved-Only Sync Architecture

BoardForge keeps experimental board generation local by default. License and auth checks may run silently, but project publishing requires explicit user approval.

## States

- `local_draft`: generated locally, not validated, not shown as a dashboard proof.
- `local_candidate`: locally validated enough for review, still unpublished.
- `approved_for_dashboard`: user explicitly approved publishing to dashboard/demo surfaces.
- `dashboard_published`: visible in dashboard/product proof surfaces.
- `archived`: retained for history but hidden from active runs.
- `failed_experiment`: kept local for learning and solution-library extraction.

## Rules

- License/auth checks are allowed silently.
- Project sync/publishing requires explicit user approval.
- Failed or experimental boards stay local unless approved.
- Dashboard should not fill with junk drafts.
- Manufacturing-ready claims require validation artifacts, not sync state.

