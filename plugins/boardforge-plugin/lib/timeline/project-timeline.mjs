import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { createTimelineEvent } from './timeline-event-schema.mjs'

export async function writeProjectTimeline({ projectDir, events = [] }) {
  await mkdir(projectDir, { recursive: true })
  const normalizedEvents = events.map((event) => event.eventId ? event : createTimelineEvent(event.type, event))
  const report = {
    status: 'BOARD_FORGE_PROJECT_TIMELINE_WRITTEN',
    projectDir,
    events: normalizedEvents,
    trustNotes: [
      'Timeline records local engine actions for auditability.',
      'Publishing requires explicit user confirmation.',
    ],
  }
  const jsonPath = path.join(projectDir, 'BoardForge_Project_Timeline.json')
  const mdPath = path.join(projectDir, 'BoardForge_Project_Timeline.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  await writeFile(mdPath, renderTimelineMarkdown(report))
  return { status: report.status, report, artifactPaths: [jsonPath, mdPath] }
}

function renderTimelineMarkdown(report) {
  return [
    '# BoardForge Project Timeline',
    '',
    `Project: ${report.projectDir}`,
    '',
    ...report.events.map((event) => `- ${event.timestamp}: ${event.type} ${event.summary || ''}`.trim()),
    '',
    '## Trust Notes',
    ...report.trustNotes.map((note) => `- ${note}`),
    '',
  ].join('\n')
}
