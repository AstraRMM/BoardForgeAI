# BoardForge Current Limitations

- Visual/mechanical polish is improving, but routeability must stay the promotion gate.
- Full arbitrary dense-board routing still needs stronger local shove/regional reroute behavior.
- External router availability varies by workstation; optional backends must degrade gracefully.
- Sourcing integrations must never invent stock, pricing, or replacements.
- KiCad plugin UI is still thinner than the local engine and web-dashboard intent.
- The quick 90 report is a bounded health signal, not a substitute for the full regression suite.
- The web dashboard currently consumes generated manifest/dashboard JSON; live project orchestration from the browser still needs deeper engine integration.
- Supplier stock, price, lifecycle, and assembly status remain `NOT_API_VERIFIED` unless a real provider/API key verifies them.
- Dense ESC/FC-class designs are protected user projects and should not be used as uncontrolled training fixtures.
- REV_F proved true outline-aware placement, but the true outline-aware board is not manufacturing-ready until the exact finisher clears remaining KiCad unconnected items and ERC/DRC validation. A clean compact fallback is useful evidence, not proof that the product-shape board is done.

## Product Rule

When a feature proof routes worse than a verified baseline, BoardForge records the lesson and promotes the verified baseline.

When a fallback is promoted, BoardForge must label it as a fallback and keep the original feature proof blocked until its own KiCad validation passes.

When a clean synthetic fixture proves an end-to-end workflow, BoardForge should turn that proof into reusable tests, dashboard evidence, and solution-library knowledge before attempting harder board classes again.
