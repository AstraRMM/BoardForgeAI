# BoardForge AI Website Copy

## Hero

From PCB idea to evidence-backed KiCad project.

BoardForge is an AI PCB engineering command center that helps you generate board briefs, create custom outlines, validate KiCad projects, verify live supplier sourcing, repair manufacturability issues, and export fabrication packages when evidence supports them.

Primary CTAs:

- Start Building
- Try Demo
- View Evidence

Core flow:

Describe -> Generate -> Validate -> Source -> Repair -> Export

## Positioning

BoardForge does not just generate a PCB. It reviews it, checks it, sources it, explains blockers, helps repair it, and packages it for manufacturing.

The live website is the command center. The installed local engine safely handles KiCad, board files, DRC/ERC reports, exports, and source protection on the user's machine.

## Core Tool Copy

- AI Board Generator: turn requirements into an approved board brief and KiCad creation path.
- Custom Board Generator: create rounded boards, mounting ears, cutouts, drone stacks, custom polygons, and Edge.Cuts seeds.
- KiCad Project Import: copy existing projects into a protected sandbox before any repair action.
- Make Manufacturable: review DRC/ERC, placement, routing, export blockers, and repair recommendations.
- Make Sourcable: verify BOM risk, supplier availability, alternatives, and quote readiness.
- Live DigiKey + Mouser Sourcing: use configured local supplier credentials for real lookup evidence. DigiKey ProductInformation V4 and Mouser Search API are live paths; direct DigiKey Quote API is only marked ready after live endpoint proof.
- JLCPCB Export Package: prepare Gerbers, drill files, BOM, CPL, manifests, and limitation reports.
- Evidence Dashboard: show proof cards, reports, tests, blockers, and alpha readiness.

## Honesty Rules

Use:

- AI PCB engineering command center
- KiCad-native project output
- local-first source protection
- DRC/ERC validation
- live DigiKey/Mouser sourcing where configured
- Make Manufacturable
- Make Sourcable
- evidence-backed readiness
- public alpha with limitations

Do not use:

- certified
- guaranteed manufacturable
- fully autonomous arbitrary PCB design
- replaces engineers completely
- PoE certified
- assembly guaranteed
- fake stock
- fake supplier availability

## Public Alpha Line

BoardForge public-alpha software is ready with external certs pending: the launcher package is unsigned until a code-signing certificate exists, PoE compliance and safety review remain external, and DigiKey Quote API support is only claimed after live endpoint proof. DigiKey ProductInformation and Mouser live sourcing are supported with local credentials.
