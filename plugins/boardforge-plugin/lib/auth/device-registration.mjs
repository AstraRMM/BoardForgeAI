import os from 'node:os'

export function buildDeviceRegistration({ env = process.env, hostname = os.hostname() } = {}) {
  return {
    schema: 'boardforge.device-registration.v1',
    deviceId: env.BOARDFORGE_DEVICE_ID || `local-${hostname}`,
    hostname,
    accountId: env.BOARDFORGE_ACCOUNT_ID || null,
    registered: Boolean(env.BOARDFORGE_DEVICE_ID),
    devMode: String(env.BOARDFORGE_DEV_LICENSE || '').toLowerCase() === 'true',
  }
}
