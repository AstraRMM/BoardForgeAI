# BoardForge Approved Sync Validation

Approved-only sync prevents generated drafts and failed experiments from filling the dashboard.

Validated flows:

- `local_draft` is hidden from the main dashboard.
- `local_candidate` is hidden from the main dashboard.
- publish without explicit confirmation is blocked.
- publish with approval and confirmation creates `dashboard_published`.
- `brief_rejected` and `failed_experiment` stay hidden.

Evidence files:

```text
BoardForge_Approved_Sync_Validation.json
BoardForge_Approved_Sync_Validation_Report.md
```

License/auth checks are separate from project publishing. Sync/publish requires explicit user approval.
