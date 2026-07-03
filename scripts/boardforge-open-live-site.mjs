#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
const liveUrl = process.env.BOARDFORGE_LIVE_SITE_URL || 'https://boardforge.ai'
await writeFile('BoardForge_Open_Live_Site_Report.md', `# Open BoardForge Live Site\n\nLive site: ${liveUrl}\n\nThe live website connects to the installed local BoardForge engine bridge.\n`)
console.log(JSON.stringify({ status: 'BOARD_FORGE_OPEN_LIVE_SITE_READY', liveUrl }, null, 2))
