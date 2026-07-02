# BoardForge Live Web Intake Flow

The web intake flow is local-engine backed. It starts an artifact session, applies answers, regenerates the board brief, blocks build until approval, and creates a local candidate only after approval.

If the local engine is unavailable, the web app must show:

`BoardForge Local Engine is offline. Start it to generate, route, repair, or export boards.`

No cloud-complete state is faked.
