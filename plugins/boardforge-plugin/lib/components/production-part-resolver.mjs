const DEFAULT_TTL_MS = 5 * 60_000

export const preferredPartFamilies = Object.freeze({
  ESP32_S3: ['ESP32-S3-WROOM-1-N8R8', 'ESP32-S3-WROOM-1-N8'],
  USB: ['TYPE-C-31-M-12', 'USB4105-GF-A'],
  REGULATOR: ['ME6211C33M5G-N', 'MCP1700T-3302E/TT'],
  SENSOR_CONNECTOR: ['M20-9990645', '20021121-00006T4LF'],
  RES_5K1_0603: ['RC0603FR-075K1L', 'CRCW06035K10FKEA'],
})

export function createProductionPartResolver({ providers = [], cache = new Map(), ttlMs = DEFAULT_TTL_MS, retries = 1, now = () => Date.now() } = {}) {
  return async function resolve({ requirement, family }) {
    const candidates = [...new Set([requirement?.mpn, ...(preferredPartFamilies[family] || [])].filter(Boolean))]
    if (!candidates.length) return blocked('NO_APPROVED_CANDIDATE_FAMILY', family)
    const observations = []
    for (const mpn of candidates) {
      for (const provider of providers) {
        const key = `${provider.id}:${mpn}`.toLowerCase()
        let result = cache.get(key)
        if (!result || now() - result.cachedAt > ttlMs) {
          result = await boundedLookup(provider, mpn, retries)
          cache.set(key, { ...result, cachedAt: now() })
        }
        observations.push({ mpn, provider: provider.id, ...result })
      }
    }
    const eligible = observations.filter((row) => row.live === true && row.exact === true && row.lifecycle !== 'Obsolete' && row.lifecycle !== 'Discontinued')
    eligible.sort((a,b) => score(b,candidates)-score(a,candidates) || candidates.indexOf(a.mpn)-candidates.indexOf(b.mpn) || a.provider.localeCompare(b.provider))
    if (!eligible.length) return { ...blocked('NO_LIVE_EXACT_PRODUCTION_CANDIDATE', family), observations: redactObservations(observations) }
    const selected = eligible[0]
    return { status:'SELECTED', mpn:selected.mpn, provider:selected.provider, stockStatus:selected.stockStatus, quantityAvailable:selected.quantityAvailable, lifecycle:selected.lifecycle, checkedAt:selected.checkedAt, candidateRank:candidates.indexOf(selected.mpn), observations:redactObservations(observations) }
  }
}

export function digikeyProductionProvider(lookupService) {
  return { id:'digikey', async lookupExact(mpn) {
    const result=await lookupService.lookup({mpn}), selected=result?.selected
    return { live:Boolean(selected?.lastChecked), exact:selected?.matchType==='exact'&&same(selected?.manufacturerPartNumber,mpn), stockStatus:selected?.stockStatus||'UNKNOWN', quantityAvailable:Number(selected?.quantityAvailable||0), lifecycle:selected?.lifecycleStatus||'UNKNOWN', checkedAt:selected?.lastChecked||result?.lastChecked||null }
  }}
}

export function mouserProductionProvider(provider) {
  return { id:'mouser', async lookupExact(mpn) {
    const result=await provider.verifyPart({mpn}), evidence=result?.evidence||{}
    return {
      live:evidence.liveApiEvidence===true,
      exact:same(result?.mpn,mpn),
      stockStatus:result?.stockStatus||'UNKNOWN',
      quantityAvailable:Number(result?.stockQty||0),
      lifecycle:result?.lifecycle||result?.lifecycleStatus||'UNKNOWN',
      checkedAt:evidence.queriedAt||null,
      requestId:evidence.requestId||null,
    }
  }}
}

async function boundedLookup(provider,mpn,retries){let last;for(let attempt=0;attempt<=retries;attempt+=1){try{return await provider.lookupExact(mpn)}catch(error){last=error}}return {live:false,exact:false,errorCode:last?.code||'PROVIDER_LOOKUP_FAILED'}}
function score(row,candidates){return (row.quantityAvailable>0?100:0)+(row.stockStatus==='IN_STOCK'?50:0)+(row.lifecycle==='Active'?20:0)-candidates.indexOf(row.mpn)}
function redactObservations(rows){return rows.map(({mpn,provider,live,exact,stockStatus,quantityAvailable,lifecycle,checkedAt,requestId,errorCode})=>({mpn,provider,live,exact,stockStatus,quantityAvailable,lifecycle,checkedAt,requestId,errorCode}))}
function blocked(code,family){return {status:'BLOCKED',blocker:{code,family}}}
function same(a,b){return Boolean(a&&b&&String(a).toLowerCase()===String(b).toLowerCase())}
