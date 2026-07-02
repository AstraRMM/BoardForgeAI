# BoardForge Approved-Only Sync Architecture

BoardForge is local-first. Engine license checks may run silently, but project publishing is an explicit user decision.

## States
- `local_draft`: generated or imported locally; never visible on the main dashboard.
- `local_candidate`: reached a meaningful milestone and is ready for review.
- `approved_for_dashboard`: user explicitly approved publish.
- `dashboard_published`: dashboard-visible metadata has been synced.
- `archived`: hidden unless the user opens archive.
- `failed_experiment`: kept local or archived; never auto-published.

## Rules
- Drafts and failed experiments must not clutter the account dashboard.
- `boardforge publish` requires `--confirm`.
- Hosted/cloud sync is not assumed; current implementation writes local dashboard-ready artifacts.
- Main dashboards show only `dashboard_published` projects.
- Draft/dev views may show local candidates, archives, and failed experiments.

## Artifacts
Every project manifest can carry:

```json
{
  "projectState": "local_draft",
  "publishApproved": false,
  "dashboardVisible": false,
  "syncStatus": "not_synced",
  "userApprovalRequired": true,
  "approvalHistory": []
}
```

## Implementation
- `lib/platform/project-publish-state.mjs`
- `lib/platform/project-publish-gate.mjs`
- `lib/platform/project-sync-client.mjs`
- `lib/platform/project-sync-manifest.mjs`
- `lib/platform/project-approval-report.mjs`

