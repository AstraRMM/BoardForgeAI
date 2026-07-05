# BoardForge AI Website Copy

## Hero

BoardForge AI

From PCB idea to manufacturable KiCad project.

Generate schematics, create board outlines, place components, route with FreeRouting, repair DRC/ERC, verify parts, and export manufacturing packages.

## How It Works

1. Describe the board you want.
2. BoardForge creates a KiCad project, schematic, PCB, constraints, and reports.
3. External routers handle bulk copper.
4. BoardForge validates, repairs, finishes exact routes, and packages manufacturing files.
5. You review the evidence and send clean outputs to fabrication.

## Product Surfaces

- Web app for project intake, dashboards, reports, and downloads.
- Local engine for real KiCad file generation and validation.
- KiCad plugin for in-editor actions and status.
- CLI for deterministic workflows and replay.
- AI control layer for Codex, ChatGPT, Claude, or future BoardForge agents.

## Feature Grid

- Real KiCad schematic and PCB generation
- Custom outline engine
- Outline-aware placement and routeability scoring
- FreeRouting bulk routing
- SES import and validation
- DRC/ERC repair
- Exact ratsnest finishing
- BOM/CPL/Gerber/Drill/JLCPCB export
- Solution-library learning

## Honesty Line

BoardForge does not fake routing, validation, sourcing, or manufacturing readiness. Advanced dense boards may require supervised workflows or exact design relaxations.
## Live Website + Local Engine

BoardForge AI is a live website connected to an installed local BoardForge engine. The website is the product surface; the local engine bridge controls KiCad, FreeRouting, board files, reviews, repairs, reports, and manufacturing exports on the user's machine.

Projects stay local unless the user explicitly approves dashboard publishing.
## Sourcing Command Center Copy

Verify BOM risk before assembly. BoardForge checks supplier availability through the installed local engine, keeps credentials off the live website, and distinguishes fab-ready boards from assembly-verified builds.

Make Sourcable identifies unavailable or risky BOM rows, searches DigiKey and Mouser evidence through the local engine, and creates an approval-required substitution plan. BoardForge never silently swaps parts or claims fake stock.
