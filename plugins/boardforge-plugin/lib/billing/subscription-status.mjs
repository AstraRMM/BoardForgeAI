import { entitlementsForPlan } from './entitlements.mjs'
import { limitsForPlan } from './plan-limits.mjs'

export function readSubscriptionStatus(env = process.env) {
  const devMode = String(env.BOARDFORGE_DEV_LICENSE || '').toLowerCase() === 'true'
  const plan = devMode ? 'dev' : env.BOARDFORGE_PLAN || 'free'
  const licenseKey = env.BOARDFORGE_LICENSE_KEY || null
  const active = devMode || Boolean(licenseKey)
  return {
    schema: 'boardforge.subscription-status.v1',
    active,
    plan,
    devMode,
    licenseKeyPresent: Boolean(licenseKey),
    entitlements: active ? entitlementsForPlan(plan) : [],
    limits: limitsForPlan(plan),
    source: devMode ? 'BOARDFORGE_DEV_LICENSE' : licenseKey ? 'BOARDFORGE_LICENSE_KEY' : 'none',
  }
}
