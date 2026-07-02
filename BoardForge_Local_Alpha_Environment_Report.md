# BoardForge Local Alpha Environment Report

- repo: C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai
- node: C:\Program Files\nodejs\node.exe
- npm: C:\Program Files\nodejs\npm.ps1
- git: C:\Program Files\Git\cmd\git.exe
- npm install completed: True
- KiCad command: missing
- KiCad CLI: missing
- Java: missing
- FreeRouting jar: missing
- web build present: True
- local engine: npm scripts available

## Supplier API Keys

- DIGIKEY_CLIENT_ID: missing
- DIGIKEY_CLIENT_SECRET: missing
- MOUSER_API_KEY: missing
- LCSC_API_KEY: missing
- JLCPCB_API_KEY: missing

## Missing Dependency Setup

- Node/npm: install Node.js LTS from https://nodejs.org/ and rerun npm install.
- Git: install Git for Windows and reopen the terminal.
- KiCad/KiCad CLI: install KiCad 8+ and ensure kicad-cli is on PATH.
- Java/FreeRouting: install Java 17+ and place/configure a FreeRouting jar for bulk routing demos.
- Supplier keys: set DIGIKEY_CLIENT_ID, DIGIKEY_CLIENT_SECRET, MOUSER_API_KEY, LCSC_API_KEY, and JLCPCB_API_KEY only when real verification is intended.

Missing KiCad, Java, FreeRouting, or supplier keys are reported honestly. BoardForge does not fake routing, sourcing, stock, assembly availability, or compliance.

Next local commands:

- npm install
- npm run build:web
- npm run boardforge:demo
- npm run dev:web
