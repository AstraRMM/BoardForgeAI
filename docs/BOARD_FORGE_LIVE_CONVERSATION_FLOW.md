# BoardForge Live Conversation Flow

BoardForge conversation sessions turn the prompt scaffold into a multi-turn local workflow.

## Flow
1. Start with a user prompt.
2. Infer board type.
3. Ask the minimum useful question batch.
4. Apply answers and trigger conditional follow-ups.
5. Update assumptions, skipped questions, and risk notes.
6. Generate or regenerate the board brief.
7. Block build until approval.
8. Create a local candidate after approval.
9. Keep the project local until explicit publish confirmation.

Primary artifact:

```text
BoardForge_Conversation_Session.json
```

The session is a local engine artifact, not a cloud job.
