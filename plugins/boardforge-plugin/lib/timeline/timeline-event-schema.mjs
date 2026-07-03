export const TIMELINE_EVENT_TYPES = [
  'intake_started',
  'question_answered',
  'brief_generated',
  'brief_approved',
  'project_created',
  'outline_generated',
  'variant_generated',
  'job_started',
  'job_completed',
  'drc_changed',
  'erc_changed',
  'repair_attempted',
  'export_created',
  'review_generated',
  'risk_report_generated',
  'publish_attempted',
  'publish_blocked',
  'publish_confirmed',
  'archive',
  'keep_local',
]

export function createTimelineEvent(type, data = {}) {
  if (!TIMELINE_EVENT_TYPES.includes(type)) throw new Error(`unknown_timeline_event:${type}`)
  return {
    eventId: `${type}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    ...data,
  }
}
