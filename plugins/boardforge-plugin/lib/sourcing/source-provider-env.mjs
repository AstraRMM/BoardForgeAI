export const sourcingProviderEnvSpec = [
  { id: 'digikey', name: 'DigiKey', env: ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET'], callbackEnv: 'DIGIKEY_CALLBACK_URL' },
  { id: 'mouser', name: 'Mouser', env: ['MOUSER_PRODUCT_API_KEY'], forcedStatus: 'NOT_CONFIGURED', limitation: 'Mouser order/cart/history APIs are not sourcing verification APIs.' },
  { id: 'lcsc', name: 'LCSC', env: ['LCSC_API_KEY'] },
  { id: 'jlcpcb', name: 'JLCPCB Assembly', env: ['JLCPCB_API_KEY'] },
]

export function detectSourcingProviderEnv(env = process.env) {
  return sourcingProviderEnvSpec.map((provider) => {
    const present = provider.env.filter((name) => Boolean(env[name]))
    const missing = provider.env.filter((name) => !env[name])
    return {
      provider: provider.id,
      name: provider.name,
      requiredEnv: provider.env,
      envKeysPresent: present,
      missingEnv: missing,
      apiCallable: provider.forcedStatus ? false : missing.length === 0,
      verificationAvailable: provider.forcedStatus ? 'not_configured' : missing.length === 0 ? 'configured_not_called' : 'not_configured',
      limitation: provider.limitation || null,
      fallbackBehavior: {
        sourcingStatus: 'NOT_CHECKED',
        stockStatus: 'UNKNOWN',
        assemblyAvailability: 'UNKNOWN',
        fakeStockAllowed: false,
      },
    }
  })
}

export function writeSourcingApiStatusMarkdown(rows = []) {
  return [
    '# BoardForge Sourcing API Status Report',
    '',
    'BoardForge does not fake stock or assembly availability. Missing API keys produce NOT_CHECKED / UNKNOWN status.',
    '',
    '| Provider | Required env | Missing env | Env keys present | API callable | Verification available | Fallback behavior |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.name} | ${row.requiredEnv.join(', ')} | ${row.missingEnv.join(', ') || 'none'} | ${row.envKeysPresent.join(', ') || 'none'} | ${row.apiCallable ? 'yes' : 'no'} | ${row.verificationAvailable} | ${row.fallbackBehavior.sourcingStatus}/${row.fallbackBehavior.stockStatus}/${row.fallbackBehavior.assemblyAvailability} |`),
    '',
  ].join('\n')
}
