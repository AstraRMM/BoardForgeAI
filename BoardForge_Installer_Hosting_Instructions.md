# BoardForge Installer Hosting Instructions

Upload this exact immutable installer file: BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe

Target HTTPS URL: https://www.boardforge-ai.com/downloads/BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe

Rules:
- Do not replace the binary at the same URL after Microsoft submission.
- For an update, publish a new versioned URL and submit that package in Partner Center.
- Host the `.sha256` checksum beside the installer for verification.
- Keep install silent parameter `/S` in Partner Center.
