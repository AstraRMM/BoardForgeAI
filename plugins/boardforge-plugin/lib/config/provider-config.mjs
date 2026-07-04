import { loadBoardForgeEnv } from './env-loader.mjs'

export function getProviderConfig({ env, cwd = process.cwd() } = {}) {
  const loaded = env ? { env, loadedFiles: [] } : loadBoardForgeEnv({ cwd })
  const source = loaded.env
  const digikeyConfigured = Boolean(source.DIGIKEY_CLIENT_ID && source.DIGIKEY_CLIENT_SECRET)
  const mouserProductApi = Boolean(source.MOUSER_PRODUCT_API_KEY || source.MOUSER_SEARCH_API_KEY)
  return {
    loadedFiles: loaded.loadedFiles,
    providers: {
      digikey: {
        name: 'DigiKey',
        status: digikeyConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
        configured: digikeyConfigured,
        missingEnv: ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET'].filter((key) => !source[key]),
        callbackUrl: source.DIGIKEY_CALLBACK_URL || 'https://www.boardforge-ai.com/api/integrations/digikey/callback',
        enabledApis: String(source.DIGIKEY_ENABLED_APIS || 'ProductInformationV4').split(',').map((item) => item.trim()).filter(Boolean),
      },
      mouser: {
        name: 'Mouser',
        status: mouserProductApi ? 'CONFIGURED' : 'NOT_CONFIGURED',
        configured: mouserProductApi,
        limitation: mouserProductApi ? null : 'Only order/cart/history credentials are available; no product/search sourcing API is configured.',
      },
      lcsc: { name: 'LCSC', status: source.LCSC_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED', configured: Boolean(source.LCSC_API_KEY) },
      jlcpcb: { name: 'JLCPCB Assembly', status: source.JLCPCB_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED', configured: Boolean(source.JLCPCB_API_KEY) },
    },
  }
}

export function publicProviderConfig(options = {}) {
  const config = getProviderConfig(options)
  return {
    loadedFiles: config.loadedFiles,
    providers: Object.fromEntries(Object.entries(config.providers).map(([id, provider]) => [id, {
      name: provider.name,
      status: provider.status,
      configured: provider.configured,
      missingEnv: provider.missingEnv || [],
      enabledApis: provider.enabledApis || [],
      limitation: provider.limitation || null,
    }])),
  }
}
