# BoardForge Create Flow

The BoardForge create flow now connects the premium question engine to project creation.

## Flow
1. User provides a natural-language board request.
2. BoardForge infers board type.
3. Required questions are selected.
4. Conditional follow-ups are added only when the prompt or answers make them relevant.
5. Safe defaults are recorded.
6. BoardForge writes `BoardForge_Board_Brief.md` and `BoardForge_Board_Brief.json`.
7. Project generation is blocked until the brief is approved.
8. Approved creates become `local_candidate`.
9. Dashboard visibility remains false.
10. Publish requires explicit approval and confirmation.

## Examples

```bash
npm run boardforge:create -- --prompt "Make a compact robotics controller"
```

This writes a board brief and blocks before project generation.

```bash
npm run boardforge:create -- --prompt "Make a compact robotics controller" --approve-brief --dev
```

This uses explicit development approval and creates a local candidate.

## Proof Fixture

`C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-QUESTION-FLOW-ROBOTICS-01_REV_A`

The proof fixture was created from:

`Make a compact robotics controller with CAN and USB-C.`

Expected evidence:
- board type: `robotics_controller`
- conditional follow-ups: `can_interface`, `usb_c_mode`
- project state: `local_candidate`
- dashboard visible: false
- publish approved: false
