# BoardForge Limitations

BoardForge is an alpha local-first PCB engineering platform. It has strong synthetic fixture proof, but it is not yet a promise that arbitrary uploaded boards will finish automatically.

## Known Limits

- Real ESC/FC-class dense boards still need supervised engineering or manual finishing.
- Supplier stock and compliance cannot be claimed without configured provider APIs.
- PoE fixtures are electrical workflow proofs, not IEEE compliance proof.
- The KiCad plugin currently controls the local engine; it is not where core routing logic lives.
- Local shove/rip-up and placement repair are early and require more hard-board evidence.

These limits are product guardrails, not excuses. Each one should become a fixture, test, or solution-library lesson before BoardForge claims production reliability.
