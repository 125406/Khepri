import type {
  CharacterAbility,
  CharacterAndroidEquipment,
  CharacterBasic,
  CharacterBeautyEquipment,
  CharacterCashItemEquipment,
  CharacterHexaMatrix,
  CharacterHexaMatrixStat,
  CharacterHyperStat,
  CharacterItemEquipment,
  CharacterPetEquipment,
  CharacterPopularity,
  CharacterStat,
  CharacterSymbolEquipment,
  ExpHistoryEntry,
  FullCharacterProfile,
  GameRegion,
  OcidResponse,
  UserUnion,
  UserUnionChampion,
  UserUnionRaider,
} from '../types/nexon'

const BASE_URL = 'https://open.api.nexon.com'

const ERROR_CODE_MAP: Record<string, string> = {
  OPENAPI00001: '伺服器內部錯誤 (OPENAPI00001)',
  OPENAPI00002: '無存取權限，請確認您的 API Key 是否正確且已啟用對應遊戲權限 (OPENAPI00002)',
  OPENAPI00003: '無效的識別碼 (OCID) 或找不到該角色 (OPENAPI00003)',
  OPENAPI00004: '缺少必要參數或參數格式錯誤，例如找不到該角色名稱或日期超出查詢範圍 (OPENAPI00004)',
  OPENAPI00005: '無效的 API Key，請檢查 x-nxopen-api-key 是否輸入正確 (OPENAPI00005)',
  OPENAPI00006: '無效的遊戲或 API 路徑 (OPENAPI00006)',
  OPENAPI00007: 'API 呼叫次數已達上限 (Rate Limit Exceeded) (OPENAPI00007)',
  OPENAPI00009: '資料準備中，若查詢今日或昨日資料，請嘗試將日期往前調整一天或留空查詢最新資料 (OPENAPI00009)',
  OPENAPI00010: '遊戲伺服器維護中 (OPENAPI00010)',
}

export class NexonApiError extends Error {
  code?: string
  status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'NexonApiError'
    this.code = code
    this.status = status
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchNexonEndpoint<T>(
  path: string,
  params: Record<string, string | undefined>,
  apiKey: string,
  maxRetries = 6
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      url.searchParams.set(key, value.trim())
    }
  })

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': apiKey.trim(),
      },
    })

    if (response.ok) {
      return (await response.json()) as T
    }

    let errCode = ''
    let rawMsg = `HTTP ${response.status}`
    try {
      const errJson = await response.json()
      errCode = errJson?.error?.name || ''
      rawMsg = errJson?.error?.message || rawMsg
    } catch {
      // ignore json parse failure
    }

    // 針對 test_ 金鑰每秒 5 次的 Rate Limit (HTTP 429 / OPENAPI00007) 自動退避重試
    if ((response.status === 429 || errCode === 'OPENAPI00007') && attempt < maxRetries) {
      await sleep(750 * (attempt + 1))
      continue
    }

    const friendlyMsg =
      (errCode && ERROR_CODE_MAP[errCode]) ||
      `API 請求失敗：${rawMsg}${errCode ? ` (${errCode})` : ''}`
    throw new NexonApiError(friendlyMsg, errCode, response.status)
  }

  throw new NexonApiError('API 請求逾時或超過重試次數')
}

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

/**
 * 依照 Nexon Open API 標準兩階段流程查詢完整角色資料：
 * 1. GET /{region}/v1/id?character_name={name} 取得 ocid
 * 2. 分批呼叫 basic, stat, hyper-stat, ability, item-equipment, symbol-equipment, cashitem-equipment, popularity, user/union
 *    (避免 test_ 金鑰觸發每秒 5 次的 Rate Limit 導致潛能或極限屬性被丟棄)
 */
export async function fetchFullCharacterProfile(options: {
  region: GameRegion
  characterName: string
  apiKey: string
  date?: string
}): Promise<FullCharacterProfile> {
  const { region, characterName, apiKey, date } = options
  const prefix = `/${region}/v1`
  const isTestKey = apiKey.trim().startsWith('test_')

  // Step 1: 取得 OCID
  const idRes = await fetchNexonEndpoint<OcidResponse>(
    `${prefix}/id`,
    { character_name: characterName },
    apiKey
  )

  const ocid = idRes.ocid
  if (!ocid) {
    throw new NexonApiError('找不到此角色的 OCID，請確認角色名稱與遊戲地區是否正確。')
  }

  const queryParams = { ocid, date: date || undefined }

  // 若為 test_ 金鑰 (限制 5 req/sec)，分三批查詢以確保 100% 成功取得所有端點資料
  if (isTestKey) {
    const [basic, stat, hyperStat, petEquipment, hexaMatrix] = await Promise.all([
      fetchNexonEndpoint<CharacterBasic>(`${prefix}/character/basic`, queryParams, apiKey),
      safeFetch(() =>
        fetchNexonEndpoint<CharacterStat>(`${prefix}/character/stat`, queryParams, apiKey)
      ),
      safeFetch(() =>
        fetchNexonEndpoint<CharacterHyperStat>(`${prefix}/character/hyper-stat`, queryParams, apiKey)
      ),
      safeFetch(() =>
        fetchNexonEndpoint<CharacterPetEquipment>(
          `${prefix}/character/pet-equipment`,
          queryParams,
          apiKey
        )
      ),
      safeFetch(() =>
        fetchNexonEndpoint<CharacterHexaMatrix>(
          `${prefix}/character/hexamatrix`,
          queryParams,
          apiKey
        )
      ),
    ])

    await sleep(950)

    const [ability, itemEquipment, androidEquipment, symbolEquipment, hexaMatrixStat] =
      await Promise.all([
        safeFetch(() =>
          fetchNexonEndpoint<CharacterAbility>(`${prefix}/character/ability`, queryParams, apiKey)
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterItemEquipment>(
            `${prefix}/character/item-equipment`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterAndroidEquipment>(
            `${prefix}/character/android-equipment`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterSymbolEquipment>(
            `${prefix}/character/symbol-equipment`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterHexaMatrixStat>(
            `${prefix}/character/hexamatrix-stat`,
            queryParams,
            apiKey
          )
        ),
      ])

    await sleep(950)

    const [cashEquipment, beautyEquipment, popularity, union, unionChampion, unionRaider] =
      await Promise.all([
        safeFetch(() =>
          fetchNexonEndpoint<CharacterCashItemEquipment>(
            `${prefix}/character/cashitem-equipment`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterBeautyEquipment>(
            `${prefix}/character/beauty-equipment`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<CharacterPopularity>(
            `${prefix}/character/popularity`,
            queryParams,
            apiKey
          )
        ),
        safeFetch(() =>
          fetchNexonEndpoint<UserUnion>(`${prefix}/user/union`, queryParams, apiKey)
        ),
        safeFetch(() =>
          fetchNexonEndpoint<UserUnionChampion>(`${prefix}/user/union-champion`, queryParams, apiKey)
        ),
        safeFetch(() =>
          fetchNexonEndpoint<UserUnionRaider>(`${prefix}/user/union-raider`, queryParams, apiKey)
        ),
      ])

    return {
      ocid,
      region,
      basic,
      popularity,
      stat,
      hyperStat,
      ability,
      itemEquipment,
      androidEquipment,
      petEquipment,
      cashEquipment,
      beautyEquipment,
      symbolEquipment,
      hexaMatrix,
      hexaMatrixStat,
      union,
      unionChampion,
      unionRaider,
    }
  }

  // Step 2: live_ 金鑰並行查詢
  const [
    basic,
    popularity,
    stat,
    hyperStat,
    ability,
    itemEquipment,
    androidEquipment,
    petEquipment,
    cashEquipment,
    beautyEquipment,
    symbolEquipment,
    hexaMatrix,
    hexaMatrixStat,
    union,
    unionChampion,
    unionRaider,
  ] = await Promise.all([
    fetchNexonEndpoint<CharacterBasic>(`${prefix}/character/basic`, queryParams, apiKey),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterPopularity>(`${prefix}/character/popularity`, queryParams, apiKey)
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterStat>(`${prefix}/character/stat`, queryParams, apiKey)
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterHyperStat>(`${prefix}/character/hyper-stat`, queryParams, apiKey)
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterAbility>(`${prefix}/character/ability`, queryParams, apiKey)
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterItemEquipment>(
        `${prefix}/character/item-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterAndroidEquipment>(
        `${prefix}/character/android-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterPetEquipment>(
        `${prefix}/character/pet-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterCashItemEquipment>(
        `${prefix}/character/cashitem-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterBeautyEquipment>(
        `${prefix}/character/beauty-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterSymbolEquipment>(
        `${prefix}/character/symbol-equipment`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterHexaMatrix>(
        `${prefix}/character/hexamatrix`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() =>
      fetchNexonEndpoint<CharacterHexaMatrixStat>(
        `${prefix}/character/hexamatrix-stat`,
        queryParams,
        apiKey
      )
    ),
    safeFetch(() => fetchNexonEndpoint<UserUnion>(`${prefix}/user/union`, queryParams, apiKey)),
    safeFetch(() =>
      fetchNexonEndpoint<UserUnionChampion>(`${prefix}/user/union-champion`, queryParams, apiKey)
    ),
    safeFetch(() =>
      fetchNexonEndpoint<UserUnionRaider>(`${prefix}/user/union-raider`, queryParams, apiKey)
    ),
  ])

  return {
    ocid,
    region,
    basic,
    popularity,
    stat,
    hyperStat,
    ability,
    itemEquipment,
    androidEquipment,
    petEquipment,
    cashEquipment,
    beautyEquipment,
    symbolEquipment,
    hexaMatrix,
    hexaMatrixStat,
    union,
    unionChampion,
    unionRaider,
  }
}

/**
 * 補全戰地冠軍 (Union Champion) 角色的外觀與等級資訊
 */
export async function enrichUnionChampions(options: {
  region: GameRegion
  apiKey: string
  champions: import('../types/nexon').UnionChampionItem[]
  currentBasic?: CharacterBasic
}): Promise<import('../types/nexon').UnionChampionItem[]> {
  const { region, apiKey, champions, currentBasic } = options
  if (!champions || champions.length === 0) return []

  const prefix = `/${region}/v1`
  const enriched: import('../types/nexon').UnionChampionItem[] = []

  for (const champ of champions) {
    if (!champ.champion_name) continue

    // 若剛好是當前已查詢的角色，直接沿用 currentBasic 免重複請求
    if (currentBasic && champ.champion_name.trim().toLowerCase() === currentBasic.character_name.trim().toLowerCase()) {
      enriched.push({
        ...champ,
        character_level: currentBasic.character_level,
        character_image: currentBasic.character_image,
        world_name: currentBasic.world_name,
        character_gender: currentBasic.character_gender,
      })
      continue
    }

    try {
      const idRes = await fetchNexonEndpoint<OcidResponse>(
        `${prefix}/id`,
        { character_name: champ.champion_name },
        apiKey
      )
      if (idRes.ocid) {
        const basic = await fetchNexonEndpoint<CharacterBasic>(
          `${prefix}/character/basic`,
          { ocid: idRes.ocid },
          apiKey
        )
        enriched.push({
          ...champ,
          character_level: basic.character_level,
          character_image: basic.character_image,
          world_name: basic.world_name,
          character_gender: basic.character_gender,
        })
      } else {
        enriched.push(champ)
      }
    } catch {
      enriched.push(champ)
    }

    // Rate-limit buffer (特別是 test_ key)
    await sleep(250)
  }

  return enriched
}

/**
 * 查詢該角色近期 (近 7 日) 的經驗值與等級變動紀錄
 */
export async function fetchRecentExpHistory(options: {
  region: GameRegion
  ocid: string
  apiKey: string
  currentBasic: CharacterBasic
}): Promise<ExpHistoryEntry[]> {
  const { region, ocid, apiKey, currentBasic } = options
  const prefix = `/${region}/v1`
  const isTestKey = apiKey.trim().startsWith('test_')

  // 產生台灣時間 (UTC+8) 過去 6 天的 YYYY-MM-DD (由舊到新: Day-6 ~ Day-1)
  const nowTw = new Date(Date.now() + 8 * 3600 * 1000)
  const pastDates: string[] = []
  for (let d = 6; d >= 1; d--) {
    const dt = new Date(nowTw.getTime() - d * 86400 * 1000)
    pastDates.push(dt.toISOString().slice(0, 10))
  }

  let snapshots: Array<{ rawDate: string; basic: CharacterBasic | null }> = []

  if (isTestKey) {
    // 稍微等待避免與主查詢第三批請求重疊
    await sleep(950)
    const batch1Dates = pastDates.slice(0, 3)
    const batch2Dates = pastDates.slice(3, 6)

    const res1 = await Promise.all(
      batch1Dates.map(async (rawDate) => ({
        rawDate,
        basic: await safeFetch(() =>
          fetchNexonEndpoint<CharacterBasic>(
            `${prefix}/character/basic`,
            { ocid, date: rawDate },
            apiKey
          )
        ),
      }))
    )

    await sleep(950)

    const res2 = await Promise.all(
      batch2Dates.map(async (rawDate) => ({
        rawDate,
        basic: await safeFetch(() =>
          fetchNexonEndpoint<CharacterBasic>(
            `${prefix}/character/basic`,
            { ocid, date: rawDate },
            apiKey
          )
        ),
      }))
    )

    snapshots = [...res1, ...res2]
  } else {
    snapshots = await Promise.all(
      pastDates.map(async (rawDate) => ({
        rawDate,
        basic: await safeFetch(() =>
          fetchNexonEndpoint<CharacterBasic>(
            `${prefix}/character/basic`,
            { ocid, date: rawDate },
            apiKey
          )
        ),
      }))
    )
  }

  const rawPoints: Array<{
    dateLabel: string
    rawDate: string
    level: number
    exp: number
    expRate: number
  }> = []

  for (const snap of snapshots) {
    if (snap.basic && typeof snap.basic.character_level === 'number') {
      const [, mm, dd] = snap.rawDate.split('-')
      rawPoints.push({
        dateLabel: `${mm}/${dd}`,
        rawDate: snap.rawDate,
        level: snap.basic.character_level,
        exp: Number(snap.basic.character_exp) || 0,
        expRate: parseFloat(snap.basic.character_exp_rate) || 0,
      })
    }
  }

  // 加入最新即時狀態
  const todayRaw = nowTw.toISOString().slice(0, 10)
  rawPoints.push({
    dateLabel: '最新',
    rawDate: todayRaw,
    level: currentBasic.character_level,
    exp: Number(currentBasic.character_exp) || 0,
    expRate: parseFloat(currentBasic.character_exp_rate) || 0,
  })

  return rawPoints.map((pt, idx) => {
    if (idx === 0) {
      return {
        ...pt,
        expDiff: 0,
        rateDiff: 0,
        levelDiff: 0,
      }
    }
    const prev = rawPoints[idx - 1]
    const levelDiff = pt.level - prev.level
    const rawRateDiff =
      levelDiff > 0
        ? levelDiff * 100 + (pt.expRate - prev.expRate)
        : Math.max(0, pt.expRate - prev.expRate)
    const rateDiff = Math.round(rawRateDiff * 1000) / 1000
    const expDiff = pt.exp >= prev.exp ? pt.exp - prev.exp : pt.exp

    return {
      ...pt,
      expDiff,
      rateDiff,
      levelDiff,
    }
  })
}

/**
 * 範例角色資料 (Demo 模式使用，結構 100% 符合 Nexon Open API 回傳格式)
 */
export function getDemoCharacterProfile(region: GameRegion = 'maplestorytw'): FullCharacterProfile {
  const svgAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="90" cy="90" r="80" fill="url(#glow)"/>
      <ellipse cx="90" cy="150" rx="42" ry="10" fill="#1e293b"/>
      <!-- Maple Leaf Crest -->
      <path d="M90 20 L98 42 L118 35 L108 55 L125 65 L100 72 L90 92 L80 72 L55 65 L72 55 L62 35 L82 42 Z" fill="#f97316" opacity="0.25"/>
      <!-- Character Silhouette / Chibi Hero -->
      <rect x="68" y="92" width="44" height="48" rx="14" fill="#4f46e5"/>
      <circle cx="90" cy="68" r="28" fill="#fde68a"/>
      <path d="M58 64 Q90 28 122 64 Q115 44 90 42 Q65 44 58 64 Z" fill="#312e81"/>
      <circle cx="80" cy="70" r="4" fill="#1e1b4b"/>
      <circle cx="100" cy="70" r="4" fill="#1e1b4b"/>
      <path d="M84 80 Q90 85 96 80" stroke="#1e1b4b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Glowing Sword -->
      <path d="M126 52 L148 30 L152 34 L130 56 Z" fill="#38bdf8"/>
      <circle cx="126" cy="56" r="5" fill="#fbbf24"/>
    </svg>
  `)}`

  const makeIcon = (bg: string, label: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="12" fill="${bg}"/>
        <rect x="3" y="3" width="58" height="58" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="16">${label}</text>
      </svg>
    `)}`

  return {
    ocid: 'demo_ocid_9f8e7d6c5b4a3210fedcba9876543210',
    region,
    basic: {
      date: '2026-11-03T00:00+08:00',
      character_name: 'Khepri楓之使者',
      world_name: region === 'maplestorytw' ? '艾麗亞' : 'Scania',
      character_gender: '女',
      character_class: '阿戴爾 (Adele)',
      character_class_level: '6',
      character_level: 285,
      character_exp: 4829103847120,
      character_exp_rate: '68.42',
      character_guild_name: '星光聖殿',
      character_image: svgAvatar,
      character_date_create: '2021-01-20T00:00+08:00',
      access_flag: 'true',
      liberation_quest_clear_flag: 'true',
      liberation_quest_clear: '1',
    },
    popularity: {
      date: '2026-11-03T00:00+08:00',
      popularity: 1842,
    },
    union: {
      date: '2026-11-03T00:00+08:00',
      union_level: 9520,
      union_grade: '傳說聯盟 I',
      union_artifact_level: 48,
      union_artifact_exp: 8450,
      union_artifact_point: 12500,
    },
    unionChampion: {
      date: '2026-11-03T00:00+08:00',
      union_champion: [
        {
          champion_name: '夜羽颯心',
          champion_slot: 1,
          champion_grade: 'SSS',
          champion_class: '阿戴爾',
          character_level: 288,
          world_name: '艾麗亞',
          character_image: svgAvatar,
          champion_badge_info: [{ stat: '攻擊Boss怪物時傷害增加5%' }, { stat: '爆擊傷害增加3.00%' }],
        },
        {
          champion_name: '影舞之風',
          champion_slot: 2,
          champion_grade: 'SSS',
          champion_class: '影武者',
          character_level: 285,
          world_name: '艾麗亞',
          character_image: svgAvatar,
          champion_badge_info: [{ stat: '攻擊力/魔力增加 10' }, { stat: '爆擊傷害增加3.00%' }],
        },
        {
          champion_name: '蒼穹星痕',
          champion_slot: 3,
          champion_grade: 'SSS',
          champion_class: '破風使者',
          character_level: 280,
          world_name: '艾麗亞',
          character_image: svgAvatar,
          champion_badge_info: [{ stat: '攻擊Boss怪物時傷害增加5%' }, { stat: '無視防禦率增加 5%' }],
        },
        {
          champion_name: '神雷天降',
          champion_slot: 4,
          champion_grade: 'SS',
          champion_class: '拳霸',
          character_level: 275,
          world_name: '艾麗亞',
          character_image: svgAvatar,
          champion_badge_info: [{ stat: '增加全屬性 20、最大HP/MP 1000' }],
        },
      ],
      champion_badge_total_info: [
        { stat: '攻擊Boss怪物時傷害增加10%' },
        { stat: '爆擊傷害增加6.00%' },
        { stat: '無視防禦率增加 5%' },
        { stat: '攻擊力/魔力增加 10' },
      ],
    },
    unionRaider: {
      date: '2026-11-03T00:00+08:00',
      union_block: [
        {
          block_type: '劍士',
          block_class: '阿戴爾',
          block_level: '288',
          block_control_point: { x: 0, y: 0 },
          block_position: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ],
        },
        {
          block_type: '盜賊',
          block_class: '影武者',
          block_level: '285',
          block_control_point: { x: -1, y: 0 },
          block_position: [
            { x: -1, y: 0 },
            { x: -2, y: 0 },
            { x: -3, y: 0 },
            { x: -1, y: 1 },
            { x: -2, y: 1 },
          ],
        },
        {
          block_type: '弓箭手',
          block_class: '破風使者',
          block_level: '280',
          block_control_point: { x: 0, y: 1 },
          block_position: [
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 2 },
          ],
        },
        {
          block_type: '海盜',
          block_class: '拳霸',
          block_level: '275',
          block_control_point: { x: -1, y: 1 },
          block_position: [
            { x: -1, y: 2 },
            { x: -2, y: 2 },
            { x: -3, y: 2 },
            { x: -4, y: 2 },
            { x: -5, y: 2 },
          ],
        },
        {
          block_type: '法師',
          block_class: '主教',
          block_level: '270',
          block_control_point: { x: 0, y: -1 },
          block_position: [
            { x: 0, y: -1 },
            { x: 1, y: -1 },
            { x: 0, y: -2 },
            { x: 1, y: -2 },
            { x: 2, y: -2 },
          ],
        },
        {
          block_type: '盜賊',
          block_class: '卡蒂娜',
          block_level: '265',
          block_control_point: { x: -1, y: -1 },
          block_position: [
            { x: -1, y: -1 },
            { x: -2, y: -1 },
            { x: -1, y: -2 },
            { x: -2, y: -2 },
            { x: -3, y: -2 },
          ],
        },
        {
          block_type: '海盜',
          block_class: '亞克',
          block_level: '260',
          block_control_point: { x: 2, y: 3 },
          block_position: [
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 4, y: 3 },
            { x: 3, y: 4 },
            { x: 4, y: 4 },
          ],
        },
        {
          block_type: '劍士',
          block_class: '黑騎士',
          block_level: '260',
          block_control_point: { x: -2, y: 3 },
          block_position: [
            { x: -2, y: 3 },
            { x: -3, y: 3 },
            { x: -4, y: 3 },
            { x: -3, y: 4 },
            { x: -4, y: 4 },
          ],
        },
        {
          block_type: '弓箭手',
          block_class: '神射手',
          block_level: '260',
          block_control_point: { x: 2, y: -3 },
          block_position: [
            { x: 2, y: -3 },
            { x: 3, y: -3 },
            { x: 4, y: -3 },
            { x: 3, y: -4 },
            { x: 4, y: -4 },
          ],
        },
        {
          block_type: '法師',
          block_class: '大魔導士(冰、雷)',
          block_level: '260',
          block_control_point: { x: -2, y: -3 },
          block_position: [
            { x: -2, y: -3 },
            { x: -3, y: -3 },
            { x: -4, y: -3 },
            { x: -3, y: -4 },
            { x: -4, y: -4 },
          ],
        },
      ],
    },
    stat: {
      date: '2026-11-03T00:00+08:00',
      character_class: '阿戴爾',
      remain_ap: 0,
      final_stat: [
        { stat_name: '戰鬥力', stat_value: '348529100' },
        { stat_name: '最高屬性攻擊力', stat_value: '98452310' },
        { stat_name: '最低屬性攻擊力', stat_value: '83684460' },
        { stat_name: '傷害', stat_value: '142.00' },
        { stat_name: 'BOSS怪物傷害', stat_value: '485.00' },
        { stat_name: '最終傷害', stat_value: '118.50' },
        { stat_name: '無視防禦率', stat_value: '97.42' },
        { stat_name: '爆擊機率', stat_value: '100' },
        { stat_name: '爆擊傷害', stat_value: '115.50' },
        { stat_name: 'STR', stat_value: '84250' },
        { stat_name: 'DEX', stat_value: '12480' },
        { stat_name: 'INT', stat_value: '4120' },
        { stat_name: 'LUK', stat_value: '4350' },
        { stat_name: 'HP', stat_value: '98540' },
        { stat_name: 'MP', stat_value: '42100' },
        { stat_name: '攻擊力', stat_value: '9420' },
        { stat_name: '魔力', stat_value: '1850' },
        { stat_name: '星力', stat_value: '395' },
        { stat_name: '祕法之力 (ARC)', stat_value: '1350' },
        { stat_name: '真實之力 (AUT)', stat_value: '660' },
        { stat_name: '冷卻時間減少(秒)', stat_value: '4' },
        { stat_name: '道具掉落率', stat_value: '120' },
        { stat_name: '楓幣獲得量', stat_value: '100' },
        { stat_name: '加持持續時間', stat_value: '68' },
      ],
    },
    ability: {
      date: '2026-11-03T00:00+08:00',
      ability_grade: '傳說',
      remain_fame: 2458000,
      preset_no: 1,
      ability_info: [
        {
          ability_no: '1',
          ability_grade: '傳說',
          ability_value: '使用技能時有 20% 機率無冷卻時間',
        },
        {
          ability_no: '2',
          ability_grade: '罕見',
          ability_value: '攻擊 BOSS 怪物時傷害 +10%',
        },
        {
          ability_no: '3',
          ability_grade: '罕見',
          ability_value: '陷入異常狀態的對象攻擊時傷害 +8%',
        },
      ],
    },
    hyperStat: {
      date: '2026-11-03T00:00+08:00',
      character_class: '阿戴爾',
      use_preset_no: '1',
      use_available_hyper_stat: 1235,
      hyper_stat_preset_1: [
        { stat_type: '傷害', stat_point: 390, stat_level: 15, stat_increase: '傷害 +45%' },
        {
          stat_type: 'BOSS怪物傷害',
          stat_point: 390,
          stat_level: 15,
          stat_increase: 'BOSS怪物傷害 +55%',
        },
        {
          stat_type: '爆擊傷害',
          stat_point: 265,
          stat_level: 13,
          stat_increase: '爆擊傷害 +13%',
        },
        {
          stat_type: '無視防禦率',
          stat_point: 150,
          stat_level: 10,
          stat_increase: '無視防禦率 +30%',
        },
        {
          stat_type: '攻擊力/魔力',
          stat_point: 40,
          stat_level: 5,
          stat_increase: '攻擊力/魔力 +15',
        },
      ],
      hyper_stat_preset_2: [],
      hyper_stat_preset_3: [],
    },
    itemEquipment: {
      date: '2026-11-03T00:00+08:00',
      character_gender: '女',
      character_class: '阿戴爾',
      preset_no: 1,
      item_equipment: [
        {
          item_equipment_part: '武器',
          item_equipment_slot: '武器',
          item_name: '創世之調諧器',
          item_icon: makeIcon('#7c2d12', '創世'),
          item_description: '完全解放黑魔法師力量的創世武器。',
          item_shape_name: '創世之調諧器',
          item_shape_icon: makeIcon('#7c2d12', '創世'),
          item_gender: null,
          starforce: '22',
          starforce_scroll_flag: '不使用',
          potential_option_grade: '傳說',
          potential_option_1: 'BOSS怪物傷害 +40%',
          potential_option_2: 'BOSS怪物傷害 +40%',
          potential_option_3: '攻擊力 +13%',
          additional_potential_option_grade: '傳說',
          additional_potential_option_1: '攻擊力 +13%',
          additional_potential_option_2: '攻擊力 +10%',
          additional_potential_option_3: 'STR +9%',
          scroll_upgrade: '8',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '已套用',
          soul_name: '偉大的真希拉的靈魂',
          soul_option: '攻擊力 +3%',
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 0,
          date_expire: null,
          item_total_option: {
            str: '355',
            dex: '280',
            attack_power: '1125',
            boss_damage: '50',
            ignore_monster_armor: '20',
            damage: '12',
            all_stat: '10',
          },
          item_base_option: {
            str: '150',
            dex: '150',
            attack_power: '340',
            boss_damage: '30',
            ignore_monster_armor: '20',
          },
          item_add_option: {
            str: '75',
            attack_power: '175',
            boss_damage: '20',
            damage: '12',
            all_stat: '10',
          },
          item_etc_option: { str: '72', attack_power: '112' },
          item_starforce_option: { str: '58', dex: '130', attack_power: '498' },
          item_exceptional_option: {},
        },
        {
          item_equipment_part: '帽子',
          item_equipment_slot: '帽子',
          item_name: '永恆騎士頭盔',
          item_icon: makeIcon('#312e81', '頭盔'),
          item_description: null,
          item_shape_name: '永恆騎士頭盔',
          item_shape_icon: makeIcon('#312e81', '頭盔'),
          item_gender: null,
          starforce: '22',
          starforce_scroll_flag: '不使用',
          potential_option_grade: '傳說',
          potential_option_1: '所有技能冷卻時間 -2秒',
          potential_option_2: '所有技能冷卻時間 -2秒',
          potential_option_3: 'STR +13%',
          additional_potential_option_grade: '傳說',
          additional_potential_option_1: 'STR +10%',
          additional_potential_option_2: 'STR +7%',
          additional_potential_option_3: '攻擊力 +14',
          scroll_upgrade: '12',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '已套用',
          soul_name: null,
          soul_option: null,
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 0,
          date_expire: null,
          item_total_option: {
            str: '380',
            dex: '240',
            attack_power: '185',
            ignore_monster_armor: '15',
            all_stat: '7',
          },
          item_base_option: { str: '80', dex: '80', attack_power: '10', ignore_monster_armor: '15' },
          item_add_option: { str: '120', all_stat: '7' },
          item_etc_option: { str: '60', attack_power: '65' },
          item_starforce_option: { str: '120', dex: '160', attack_power: '110' },
          item_exceptional_option: {},
        },
        {
          item_equipment_part: '上衣',
          item_equipment_slot: '上衣',
          item_name: '永恆騎士鎧甲',
          item_icon: makeIcon('#1e3a8a', '上衣'),
          item_description: null,
          item_shape_name: '永恆騎士鎧甲',
          item_shape_icon: makeIcon('#1e3a81', '上衣'),
          item_gender: null,
          starforce: '22',
          starforce_scroll_flag: '不使用',
          potential_option_grade: '傳說',
          potential_option_1: 'STR +13%',
          potential_option_2: 'STR +10%',
          potential_option_3: 'STR +10%',
          additional_potential_option_grade: '傳說',
          additional_potential_option_1: 'STR +9%',
          additional_potential_option_2: 'STR +7%',
          additional_potential_option_3: '全屬性 +5%',
          scroll_upgrade: '8',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '已套用',
          soul_name: null,
          soul_option: null,
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 0,
          date_expire: null,
          item_total_option: {
            str: '365',
            dex: '220',
            attack_power: '172',
            ignore_monster_armor: '5',
            all_stat: '6',
          },
          item_base_option: { str: '65', dex: '65', attack_power: '8', ignore_monster_armor: '5' },
          item_add_option: { str: '130', all_stat: '6' },
          item_etc_option: { str: '50', attack_power: '54' },
          item_starforce_option: { str: '120', dex: '155', attack_power: '110' },
          item_exceptional_option: {},
        },
        {
          item_equipment_part: '手套',
          item_equipment_slot: '手套',
          item_name: '神秘冥界幽靈騎士手套',
          item_icon: makeIcon('#4c1d95', '手套'),
          item_description: null,
          item_shape_name: '神秘冥界幽靈騎士手套',
          item_shape_icon: makeIcon('#4c1d95', '手套'),
          item_gender: null,
          starforce: '22',
          starforce_scroll_flag: '不使用',
          potential_option_grade: '傳說',
          potential_option_1: '爆擊傷害 +8%',
          potential_option_2: '爆擊傷害 +8%',
          potential_option_3: 'STR +12%',
          additional_potential_option_grade: '傳說',
          additional_potential_option_1: '爆擊傷害 +3%',
          additional_potential_option_2: 'STR +7%',
          additional_potential_option_3: '攻擊力 +12',
          scroll_upgrade: '9',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '已套用',
          soul_name: null,
          soul_option: null,
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 0,
          date_expire: null,
          item_total_option: {
            str: '330',
            dex: '210',
            attack_power: '195',
          },
          item_base_option: { str: '40', dex: '40', attack_power: '9' },
          item_add_option: { str: '115' },
          item_etc_option: { str: '55', attack_power: '76' },
          item_starforce_option: { str: '120', dex: '170', attack_power: '110' },
          item_exceptional_option: {},
        },
        {
          item_equipment_part: '戒指1',
          item_equipment_slot: '戒指1',
          item_name: '永續戒指 Lv.4',
          item_icon: makeIcon('#065f46', '永續4'),
          item_description: '攻擊時定期發動強大的永續領域。',
          item_shape_name: '永續戒指',
          item_shape_icon: makeIcon('#065f46', '永續4'),
          item_gender: null,
          starforce: '0',
          starforce_scroll_flag: '不使用',
          potential_option_grade: null,
          potential_option_1: null,
          potential_option_2: null,
          potential_option_3: null,
          additional_potential_option_grade: null,
          additional_potential_option_1: null,
          additional_potential_option_2: null,
          additional_potential_option_3: null,
          scroll_upgrade: '0',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '不使用',
          soul_name: null,
          soul_option: null,
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 4,
          date_expire: null,
          item_total_option: { str: '4', dex: '4', int: '4', luk: '4', attack_power: '4', magic_power: '4' },
          item_base_option: { str: '4', dex: '4', int: '4', luk: '4', attack_power: '4', magic_power: '4' },
          item_add_option: {},
          item_etc_option: {},
          item_starforce_option: {},
          item_exceptional_option: {},
        },
        {
          item_equipment_part: '墜飾',
          item_equipment_slot: '墜飾',
          item_name: '苦痛的根源',
          item_icon: makeIcon('#831843', '根源'),
          item_description: '漆黑的BOSS飾品套裝。',
          item_shape_name: '苦痛的根源',
          item_shape_icon: makeIcon('#831843', '根源'),
          item_gender: null,
          starforce: '22',
          starforce_scroll_flag: '不使用',
          potential_option_grade: '傳說',
          potential_option_1: 'STR +12%',
          potential_option_2: 'STR +12%',
          potential_option_3: '全屬性 +9%',
          additional_potential_option_grade: '罕見',
          additional_potential_option_1: 'STR +7%',
          additional_potential_option_2: 'STR +5%',
          additional_potential_option_3: 'STR +18',
          scroll_upgrade: '6',
          scroll_upgradeable_count: '0',
          scroll_resilience_count: '0',
          cuttable_count: '255',
          golden_hammer_flag: '已套用',
          soul_name: null,
          soul_option: null,
          equipment_level_increase: 0,
          growth_exp: 0,
          growth_level: 0,
          special_ring_level: 0,
          date_expire: null,
          item_total_option: {
            str: '295',
            dex: '190',
            attack_power: '148',
            all_stat: '5',
          },
          item_base_option: { str: '10', dex: '10', attack_power: '3' },
          item_add_option: { str: '95', all_stat: '5' },
          item_etc_option: { str: '70', attack_power: '45' },
          item_starforce_option: { str: '120', dex: '180', attack_power: '100' },
          item_exceptional_option: {},
        },
      ],
    },
    symbolEquipment: {
      date: '2026-11-03T00:00+08:00',
      character_class: '阿戴爾',
      symbol: [
        {
          symbol_name: '祕法符文：消逝的旅途',
          symbol_icon: makeIcon('#0284c7', 'ARC1'),
          symbol_description: '消逝的旅途祕法符文',
          symbol_force: '220',
          symbol_level: 20,
          symbol_str: '2200',
          symbol_dex: '0',
          symbol_int: '0',
          symbol_luk: '0',
          symbol_hp: '0',
          symbol_growth_count: 0,
          symbol_require_growth_count: 0,
        },
        {
          symbol_name: '祕法符文：啾啾艾爾蘭',
          symbol_icon: makeIcon('#0284c7', 'ARC2'),
          symbol_description: '啾啾艾爾蘭祕法符文',
          symbol_force: '220',
          symbol_level: 20,
          symbol_str: '2200',
          symbol_dex: '0',
          symbol_int: '0',
          symbol_luk: '0',
          symbol_hp: '0',
          symbol_growth_count: 0,
          symbol_require_growth_count: 0,
        },
        {
          symbol_name: '真實符文：賽爾尼溫',
          symbol_icon: makeIcon('#d97706', 'AUT1'),
          symbol_description: '賽爾尼溫真實符文',
          symbol_force: '110',
          symbol_level: 11,
          symbol_str: '2500',
          symbol_dex: '0',
          symbol_int: '0',
          symbol_luk: '0',
          symbol_hp: '0',
          symbol_growth_count: 0,
          symbol_require_growth_count: 0,
        },
        {
          symbol_name: '真實符文：阿爾克斯',
          symbol_icon: makeIcon('#d97706', 'AUT2'),
          symbol_description: '阿爾克斯真實符文',
          symbol_force: '110',
          symbol_level: 11,
          symbol_str: '2500',
          symbol_dex: '0',
          symbol_int: '0',
          symbol_luk: '0',
          symbol_hp: '0',
          symbol_growth_count: 0,
          symbol_require_growth_count: 0,
        },
      ],
    },
    cashEquipment: {
      date: '2026-11-03T00:00+08:00',
      character_gender: '女',
      character_class: '阿戴爾',
      preset_no: 1,
      cash_item_equipment_base: [
        {
          cash_item_equipment_part: '帽子',
          cash_item_equipment_slot: '帽子',
          cash_item_name: '星光璀璨皇冠',
          cash_item_icon: makeIcon('#ec4899', '皇冠'),
          cash_item_description: null,
          cash_item_gender: null,
          date_expire: null,
          date_option_expire: null,
        },
        {
          cash_item_equipment_part: '套服',
          cash_item_equipment_slot: '套服',
          cash_item_name: '月光交響曲禮服',
          cash_item_icon: makeIcon('#8b5cf6', '禮服'),
          cash_item_description: null,
          cash_item_gender: null,
          date_expire: null,
          date_option_expire: null,
        },
        {
          cash_item_equipment_part: '武器',
          cash_item_equipment_slot: '武器',
          cash_item_name: '銀河星塵之劍',
          cash_item_icon: makeIcon('#06b6d4', '星劍'),
          cash_item_description: null,
          cash_item_gender: null,
          date_expire: null,
          date_option_expire: null,
        },
      ],
    },
    hexaMatrix: {
      date: '2026-11-03T00:00+08:00',
      character_hexa_core_equipment: [
        {
          hexa_core_name: '瑪에斯特羅',
          hexa_core_level: 30,
          hexa_core_type: '技能核心',
          linked_skill: [{ hexa_skill_id: '瑪에斯特羅' }],
        },
        {
          hexa_core_name: '穿刺 VI',
          hexa_core_level: 30,
          hexa_core_type: '精通核心',
          linked_skill: [{ hexa_skill_id: '穿刺 VI' }],
        },
        {
          hexa_core_name: '追蹤 VI / 綻放 VI',
          hexa_core_level: 29,
          hexa_core_type: '精通核心',
          linked_skill: [{ hexa_skill_id: '追蹤 VI' }, { hexa_skill_id: '綻放 VI' }],
        },
        {
          hexa_core_name: '無盡強化',
          hexa_core_level: 30,
          hexa_core_type: '強化核心',
          linked_skill: [{ hexa_skill_id: '無盡' }],
        },
        {
          hexa_core_name: '復原強化',
          hexa_core_level: 24,
          hexa_core_type: '強化核心',
          linked_skill: [{ hexa_skill_id: '復原' }],
        },
        {
          hexa_core_name: '毀滅強化',
          hexa_core_level: 22,
          hexa_core_type: '強化核心',
          linked_skill: [{ hexa_skill_id: '毀滅' }],
        },
        {
          hexa_core_name: '風暴強化',
          hexa_core_level: 19,
          hexa_core_type: '強化核心',
          linked_skill: [{ hexa_skill_id: '風暴' }],
        },
      ],
    },
    hexaMatrixStat: {
      date: '2026-11-03T00:00+08:00',
      character_class: '阿戴爾',
      character_hexa_stat_core: [
        {
          slot_id: '0',
          main_stat_name: '暴擊傷害增加',
          sub_stat_name_1: '攻擊力增加',
          sub_stat_name_2: '主屬性增加',
          main_stat_level: 8,
          sub_stat_level_1: 7,
          sub_stat_level_2: 5,
          stat_grade: 20,
        },
      ],
      character_hexa_stat_core_2: [
        {
          slot_id: '0',
          main_stat_name: '攻擊力增加',
          sub_stat_name_1: '暴擊傷害增加',
          sub_stat_name_2: 'BOSS怪物傷害增加',
          main_stat_level: 9,
          sub_stat_level_1: 6,
          sub_stat_level_2: 5,
          stat_grade: 20,
        },
      ],
      character_hexa_stat_core_3: [
        {
          slot_id: '0',
          main_stat_name: '主屬性增加',
          sub_stat_name_1: '攻擊力增加',
          sub_stat_name_2: '暴擊傷害增加',
          main_stat_level: 7,
          sub_stat_level_1: 8,
          sub_stat_level_2: 5,
          stat_grade: 20,
        },
      ],
      preset_hexa_stat_core: [],
      preset_hexa_stat_core_2: [],
      preset_hexa_stat_core_3: [],
    },
  }
}
