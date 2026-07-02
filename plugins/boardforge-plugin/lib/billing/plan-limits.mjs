export const PLAN_LIMITS = Object.freeze({
  free: {
    projectsPerMonth: 0,
    manufacturingExportsPerMonth: 0,
    syncProjects: false,
    note: 'Free plan can inspect docs and local status only.',
  },
  dev: {
    projectsPerMonth: Number.POSITIVE_INFINITY,
    manufacturingExportsPerMonth: Number.POSITIVE_INFINITY,
    syncProjects: true,
    note: 'Explicit local development mode for BoardForge product work.',
  },
  pro: {
    projectsPerMonth: 50,
    manufacturingExportsPerMonth: 25,
    syncProjects: true,
    note: 'Paid individual engineering plan placeholder.',
  },
  team: {
    projectsPerMonth: 250,
    manufacturingExportsPerMonth: 100,
    syncProjects: true,
    note: 'Paid team engineering plan placeholder.',
  },
})

export function limitsForPlan(plan = 'free') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}
