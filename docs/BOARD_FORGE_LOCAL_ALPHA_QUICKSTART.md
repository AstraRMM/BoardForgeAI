# BoardForge Local Alpha Quickstart

BoardForge local alpha runs from:

`C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai`

## Start

```powershell
cd C:\Users\luifi\Desktop\BoardForge_Dev\boardforge-ai
.\tools\boardforge-launcher\BoardForge_Check_Environment.ps1
.\tools\boardforge-launcher\BoardForge_Start_Local_Alpha.ps1
```

Open:

`http://localhost:3000/dashboard`

## Run The Demo

```powershell
npm run boardforge:demo
```

The demo writes artifacts to:

`C:\Users\luifi\Desktop\BoardForge_New_Board_Fixtures\BF-ALPHA-DEMO-ROBOTICS-CONTROLLER-01`

It proves prompt intake, conditional questions, board brief generation, revision, approval, local candidate state, publish confirmation, sourcing honesty, and local artifact-backed status.

## Safety

BoardForge must not touch ESC/FC projects. Existing user projects should be imported into a sandbox before any route, repair, cleanup, or export action.

## External Blockers

Supplier API keys are needed for live stock/assembly verification. PoE compliance and isolation safety require real engineering review.
