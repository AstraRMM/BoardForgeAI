# BoardForge Create Flow

BoardForge create is a contract-first workflow:

1. Read the natural-language prompt.
2. Infer the board type.
3. Ask the minimum useful questions.
4. Record assumptions and skipped questions.
5. Generate `BoardForge_Board_Brief.md` and `BoardForge_Board_Brief.json`.
6. Block build until the brief is approved.
7. Create a `local_candidate` after approval.
8. Keep the candidate hidden from the dashboard.
9. Publish only after explicit dashboard approval and confirmation.

The CLI proof path is:

```bash
npm run boardforge:intake -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output ./BF-PROMPT-LAYER-ROBOTICS-01
npm run boardforge:brief -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output ./BF-PROMPT-LAYER-ROBOTICS-01
npm run boardforge:approve-brief -- --project ./BF-PROMPT-LAYER-ROBOTICS-01
npm run boardforge:create -- --prompt "Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM." --output ./BF-PROMPT-LAYER-ROBOTICS-01 --approve-brief --dev
```

`--dev` is a local alpha/testing bypass. It must not become an invisible production bypass.
