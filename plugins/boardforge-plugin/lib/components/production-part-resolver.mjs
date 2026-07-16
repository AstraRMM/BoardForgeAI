const DEFAULT_TTL_MS = 5 * 60_000

export const preferredPartFamilies = Object.freeze({
  STM32_MCU: ['STM32F103C8T6','STM32G0B1CBT6'],
  CAN_TRANSCEIVER: ['SN65HVD230DR','TCAN332DR'],
  ESP32_S3: ['ESP32-S3-WROOM-1-N8R8', 'ESP32-S3-WROOM-1-N8'],
  USB: ['TYPE-C-31-M-12', 'USB4105-GF-A'],
  REGULATOR: ['ME6211C33M5G-N', 'MCP1700T-3302E/TT'],
  SENSOR_CONNECTOR: ['M20-9990645', '20021121-00006T4LF'],
  RES_5K1_0603: ['RC0603FR-075K1L', 'CRCW06035K10FKEA'],
  CAN_TERM_120R_0603: ['RC0603FR-07120RL'],
  DECOUPLING_100NF_0603: ['CL10B104KB8NNNC'],
  CAN_TVS: ['NUP2105LT1G'],
  RP2040_MCU: ['SC0914(13)'],
  QSPI_FLASH: ['W25Q128JVSIQ'],
  USB_ESD: ['USBLC6-2SC6'],
  USB_PD_SINK_CONTROLLER: ['STUSB4500QTR'],
  USB_PD_POWER_SWITCH: ['SI7465DP-T1-GE3'],
  USB_PD_5V_BUCK: ['TPS54202DDCR'],
  USB_PD_TVS: ['SMAJ24A'],
  USB_PD_INPUT_FUSE: ['3413.0218.22'],
  USB_PD_BUCK_INDUCTOR: ['SRN6045TA-4R7M'],
  USB_PD_FB_TOP: ['RC0603FR-0773K2L'],
  USB_PD_FB_BOTTOM: ['RC0603FR-0710KL'],
  USB_PD_SOURCE_CONTROLLER: ['TPS25750DRJKR'],
  USB_PD_CONFIG_EEPROM: ['M24C64-WMN6TP'],
  USB_PD_5V_TVS: ['SMAJ5.0A'],
  USB_PD_PP5V_BULK: ['UWT1A151MCL1GS'],
})

export function createProductionPartResolver({ providers = [], cache = new Map(), ttlMs = DEFAULT_TTL_MS, retries = 2, retryDelayMs = 50, sleep = delay, minimumLiveProviders = 1, now = () => Date.now() } = {}) {
  return async function resolve({ requirement, family }) {
    const candidates = [...new Set([requirement?.mpn, ...(preferredPartFamilies[family] || [])].filter(Boolean))]
    if (!candidates.length) return blocked('NO_APPROVED_CANDIDATE_FAMILY', family)
    const observations = []
    for (const mpn of candidates) {
      for (const provider of providers) {
        const key = `${provider.id}:${mpn}`.toLowerCase()
        let result = cache.get(key)
        if (!result || result.live !== true || result.exact !== true || now() - result.cachedAt > ttlMs) {
          result = await boundedLookup(provider, mpn, { retries, retryDelayMs, sleep })
          // Never retain unavailable/partial evidence as a cache hit. A later
          // resolution must perform a fresh bounded live lookup.
          if (result.live === true && result.exact === true) cache.set(key, { ...result, cachedAt: now() })
          else cache.delete(key)
        }
        observations.push({ mpn, provider: provider.id, ...result })
      }
    }
    const liveCounts=new Map(candidates.map(mpn=>[mpn,new Set(observations.filter(row=>row.mpn===mpn&&row.live===true&&row.exact===true).map(row=>row.provider)).size]))
    const eligible = observations.filter((row) => row.live === true && row.exact === true && row.lifecycle !== 'Obsolete' && row.lifecycle !== 'Discontinued' && (liveCounts.get(row.mpn)||0)>=minimumLiveProviders)
    eligible.sort((a,b) => score(b,candidates)-score(a,candidates) || candidates.indexOf(a.mpn)-candidates.indexOf(b.mpn) || a.provider.localeCompare(b.provider))
    if (!eligible.length) return { ...blocked('NO_LIVE_EXACT_PRODUCTION_CANDIDATE', family), observations: redactObservations(observations) }
    const selected = eligible[0]
    return { status:'SELECTED', mpn:selected.mpn, provider:selected.provider, liveProviders:[...new Set(eligible.filter(row=>row.mpn===selected.mpn).map(row=>row.provider))].sort(), stockStatus:selected.stockStatus, quantityAvailable:selected.quantityAvailable, lifecycle:selected.lifecycle, checkedAt:selected.checkedAt, candidateRank:candidates.indexOf(selected.mpn), observations:redactObservations(observations) }
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

async function boundedLookup(provider,mpn,{retries,retryDelayMs,sleep}){let last;for(let attempt=0;attempt<=retries;attempt+=1){try{const result=await provider.lookupExact(mpn);last=result;if(result?.live===true&&result?.exact===true)return result}catch(error){last={live:false,exact:false,errorCode:error?.code||'PROVIDER_LOOKUP_FAILED'}}if(attempt<retries)await sleep(retryDelayMs*Math.pow(2,attempt))}return {...(last&&typeof last==='object'?last:{}),live:false,exact:false,errorCode:last?.errorCode||(last?.live!==true?'PROVIDER_NON_LIVE_AFTER_RETRIES':'PROVIDER_NON_EXACT_AFTER_RETRIES')}}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function score(row,candidates){return (row.quantityAvailable>0?100:0)+(row.stockStatus==='IN_STOCK'?50:0)+(row.lifecycle==='Active'?20:0)-candidates.indexOf(row.mpn)}
function redactObservations(rows){return rows.map(({mpn,provider,live,exact,stockStatus,quantityAvailable,lifecycle,checkedAt,requestId,errorCode})=>({mpn,provider,live,exact,stockStatus,quantityAvailable,lifecycle,checkedAt,requestId,errorCode}))}
function blocked(code,family){return {status:'BLOCKED',blocker:{code,family}}}
function same(a,b){return Boolean(a&&b&&String(a).toLowerCase()===String(b).toLowerCase())}
