<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import CharacterCardStudio from './components/CharacterCardStudio.vue'
import CharacterDollStudio from './components/CharacterDollStudio.vue'
import GachaSimulator from './components/GachaSimulator.vue'
import BossTierViewer from './components/BossTierViewer.vue'
import RankingStudio from './components/RankingStudio.vue'
import UnionBoardViewer from './components/UnionBoardViewer.vue'
import { fetchFullCharacterProfile, fetchRecentExpHistory, enrichUnionChampions } from './services/nexonApi'
import { recordSearchedCharacter } from './services/communityRankService'
import { getFamiliarIconUrl, generateFamiliarCardSvg } from './utils/familiarAssets'
import type {
  ExpHistoryEntry,
  FullCharacterProfile,
  GameRegion,
  HexaStatCore,
  ItemEquipmentInfo,
  UnionChampionItem,
} from './types/nexon'

const STORAGE_HISTORY = 'nexon_search_history'
const API_KEY =
  import.meta.env.VITE_NEXON_API_KEY ||
  'test_86ea08b094b980ba7753075bc199c973c594f53ecde6e537e07b9abd6af2c830efe8d04e6d233bd35cf2fabdeb93fb0d'
const DEFAULT_REGION: GameRegion = 'maplestorytw'

const appMode = ref<'search' | 'royal' | 'apple' | 'boss' | 'ranking'>('search')
const characterName = ref<string>('')
const loading = ref<boolean>(false)
const errorMessage = ref<string>('')

const profile = ref<FullCharacterProfile | null>(null)
const expHistory = ref<ExpHistoryEntry[]>([])
const expHistoryLoading = ref<boolean>(false)
const hoveredItem = ref<ItemEquipmentInfo | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const activeTab = ref<'stats' | 'equipment' | 'hexa' | 'card' | 'doll' | 'union'>('stats')
const hexaCalcScope = ref<'current10' | 'full11' | 'unlocked'>('current10')
const hexaStatViewMode = ref<'equipped' | 'preset'>('equipped')
const customHexaLevelOverrides = ref<Record<string, number>>({})
const equipMainTab = ref<'equip' | 'pet' | 'familiar'>('equip')
const equipViewMode = ref<'equipment' | 'coordination'>('equipment')
const activeSymbolTab = ref<'arcane' | 'authentic'>('arcane')
const isGrandAuthentic = ref<boolean>(false)
const activeHyperPreset = ref<1 | 2 | 3>(1)
const activeAbilityPreset = ref<1 | 2 | 3>(1)
const activeEquipPreset = ref<1 | 2 | 3>(1)
const activeCashPreset = ref<1 | 2 | 3>(1)
const searchHistory = ref<Array<{ name: string; region: GameRegion }>>([])
const copiedOcid = ref<boolean>(false)
const championsLoading = ref<boolean>(false)
const enrichedChampions = ref<UnionChampionItem[]>([])
const selectedRaiderTypeFilter = ref<string>('all')

const sortedUnionBlocks = computed(() => {
  const blocks = profile.value?.unionRaider?.union_block || []
  const valid = blocks.filter((b) => b.block_class && b.block_level)
  return [...valid].sort((a, b) => (Number(b.block_level) || 0) - (Number(a.block_level) || 0))
})

const filteredUnionBlocks = computed(() => {
  if (selectedRaiderTypeFilter.value === 'all') {
    return sortedUnionBlocks.value
  }
  return sortedUnionBlocks.value.filter((b) => b.block_type === selectedRaiderTypeFilter.value)
})

const unionBlockTypes = computed(() => {
  const set = new Set<string>()
  for (const b of sortedUnionBlocks.value) {
    if (b.block_type) set.add(b.block_type)
  }
  return Array.from(set)
})

function syncPresetsFromProfile(p: FullCharacterProfile) {
  customHexaLevelOverrides.value = {}
  const abPreset = Number(p.ability?.preset_no)
  activeAbilityPreset.value = abPreset === 1 || abPreset === 2 || abPreset === 3 ? abPreset : 1

  const eqPreset = Number(p.itemEquipment?.preset_no)
  activeEquipPreset.value = eqPreset === 1 || eqPreset === 2 || eqPreset === 3 ? eqPreset : 1

  const cashPreset = Number(p.cashEquipment?.preset_no)
  activeCashPreset.value =
    cashPreset === 1 || cashPreset === 2 || cashPreset === 3 ? cashPreset : 1

  const hs = p.hyperStat
  if (!hs) {
    activeHyperPreset.value = 1
    return
  }
  const preferred = Number(hs.use_preset_no) as 1 | 2 | 3
  const getList = (n: 1 | 2 | 3) =>
    (n === 1
      ? hs.hyper_stat_preset_1
      : n === 2
        ? hs.hyper_stat_preset_2
        : hs.hyper_stat_preset_3) || []

  if (
    (preferred === 1 || preferred === 2 || preferred === 3) &&
    getList(preferred).some((x) => x.stat_level > 0)
  ) {
    activeHyperPreset.value = preferred
  } else if (getList(1).some((x) => x.stat_level > 0)) {
    activeHyperPreset.value = 1
  } else if (getList(2).some((x) => x.stat_level > 0)) {
    activeHyperPreset.value = 2
  } else if (getList(3).some((x) => x.stat_level > 0)) {
    activeHyperPreset.value = 3
  } else {
    activeHyperPreset.value = preferred === 2 || preferred === 3 ? preferred : 1
  }
}

const currentAbilityDisplay = computed(() => {
  const ab = profile.value?.ability
  if (!ab) return null
  const presetKey = `ability_preset_${activeAbilityPreset.value}` as
    | 'ability_preset_1'
    | 'ability_preset_2'
    | 'ability_preset_3'
  const presetObj = ab[presetKey]
  if (presetObj && presetObj.ability_info?.length) {
    return {
      grade: presetObj.ability_preset_grade || ab.ability_grade,
      list: presetObj.ability_info,
    }
  }
  return {
    grade: ab.ability_grade,
    list: ab.ability_info || [],
  }
})

const currentHyperStatList = computed(() => {
  const hs = profile.value?.hyperStat
  if (!hs) return []
  const raw =
    activeHyperPreset.value === 1
      ? hs.hyper_stat_preset_1
      : activeHyperPreset.value === 2
        ? hs.hyper_stat_preset_2
        : hs.hyper_stat_preset_3
  return (raw || []).filter((x) => x.stat_level > 0)
})

onMounted(() => {
  const savedHistory = localStorage.getItem(STORAGE_HISTORY)
  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory)
      searchHistory.value = Array.isArray(parsed) ? parsed : []
    } catch {
      searchHistory.value = []
    }
  }
})

function addSearchHistory(name: string) {
  const filtered = searchHistory.value.filter((item) => item.name !== name)
  searchHistory.value = [{ name, region: DEFAULT_REGION }, ...filtered].slice(0, 8)
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(searchHistory.value))
}

async function loadExpHistoryForProfile(p: FullCharacterProfile) {
  expHistoryLoading.value = true
  try {
    const history = await fetchRecentExpHistory({
      region: p.region,
      ocid: p.ocid,
      apiKey: API_KEY,
      currentBasic: p.basic,
    })
    if (profile.value?.ocid === p.ocid) {
      expHistory.value = history
    }
  } catch {
    if (profile.value?.ocid === p.ocid) {
      expHistory.value = []
    }
  } finally {
    if (profile.value?.ocid === p.ocid) {
      expHistoryLoading.value = false
    }
  }
}

async function loadEnrichedChampionsForProfile(p: FullCharacterProfile) {
  const champions = p.unionChampion?.union_champion || []
  if (champions.length === 0) {
    enrichedChampions.value = []
    return
  }

  // 先將已有的 champion 基礎資訊顯示（不讓畫面空白）
  enrichedChampions.value = champions.map((c) => {
    if (c.champion_name.trim().toLowerCase() === p.basic.character_name.trim().toLowerCase()) {
      return {
        ...c,
        character_level: p.basic.character_level,
        character_image: p.basic.character_image,
        world_name: p.basic.world_name,
        character_gender: p.basic.character_gender,
      }
    }
    return { ...c }
  })

  championsLoading.value = true
  try {
    const enriched = await enrichUnionChampions({
      region: p.region,
      apiKey: API_KEY,
      champions,
      currentBasic: p.basic,
    })
    if (profile.value?.ocid === p.ocid) {
      enrichedChampions.value = enriched
    }
  } catch {
    // 保持既有清單
  } finally {
    if (profile.value?.ocid === p.ocid) {
      championsLoading.value = false
    }
  }
}

function formatExpAmount(num: number): string {
  if (!num || num <= 0) return '0'
  const zhao = Math.floor(num / 1_000_000_000_000)
  const yi = Math.floor((num % 1_000_000_000_000) / 100_000_000)
  const wan = Math.floor((num % 100_000_000) / 10_000)
  if (zhao > 0) return `${zhao}兆${yi > 0 ? ` ${yi}億` : ''}`
  if (yi > 0) return `${yi}億${wan > 0 ? ` ${wan}萬` : ''}`
  if (wan > 0) return `${wan}萬`
  return num.toLocaleString()
}

const expHistorySummary = computed(() => {
  if (expHistory.value.length < 2) return null
  const first = expHistory.value[0]
  const last = expHistory.value[expHistory.value.length - 1]
  const totalExpDiff = expHistory.value.reduce((acc, x) => acc + (x.expDiff || 0), 0)
  const totalRateDiff = expHistory.value.reduce((acc, x) => acc + (x.rateDiff || 0), 0)
  const daysCount = Math.max(1, expHistory.value.length - 1)
  const maxDailyRate = Math.max(1, ...expHistory.value.map((x) => x.rateDiff || 0))
  return {
    daysCount,
    startLv: first.level,
    startRate: first.expRate,
    endLv: last.level,
    endRate: last.expRate,
    totalExpDiff,
    totalRateDiff: Math.round(totalRateDiff * 1000) / 1000,
    avgExpPerDay: Math.round(totalExpDiff / daysCount),
    avgRatePerDay: Math.round((totalRateDiff / daysCount) * 1000) / 1000,
    maxDailyRate,
  }
})

async function handleSearch(targetName?: string) {
  if (targetName) characterName.value = targetName

  const trimmedName = characterName.value.trim()
  if (!trimmedName) {
    errorMessage.value = '請輸入要查詢的角色名稱！'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await fetchFullCharacterProfile({
      region: DEFAULT_REGION,
      characterName: trimmedName,
      apiKey: API_KEY,
    })
    profile.value = result
    hoveredItem.value = null
    expHistory.value = []
    syncPresetsFromProfile(result)
    addSearchHistory(trimmedName)
    void loadExpHistoryForProfile(result)
    void loadEnrichedChampionsForProfile(result)

    // 自動記錄至社群排行榜資料庫
    try {
      const cpVal = parseInt(getStatValue(['戰鬥力', '전투력', 'Combat Power']).replace(/,/g, ''), 10) || 0
      recordSearchedCharacter({
        ocid: result.ocid,
        name: result.basic.character_name,
        world: result.basic.world_name,
        job: result.basic.character_class,
        level: result.basic.character_level,
        expRate: parseFloat(result.basic.character_exp_rate) || 0,
        image: result.basic.character_image,
        combatPower: cpVal,
        combatPowerFormatted: combatPowerText.value,
        unionLevel: result.union?.union_level || undefined,
        popularity: result.popularity?.popularity,
        updatedAt: Date.now(),
      })
    } catch {
      // Ignore background recording errors
    }
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : '查詢失敗，請檢查網路連線或角色名稱。'
  } finally {
    loading.value = false
  }
}

function copyOcid() {
  if (!profile.value?.ocid) return
  navigator.clipboard.writeText(profile.value.ocid)
  copiedOcid.value = true
  setTimeout(() => {
    copiedOcid.value = false
  }, 2000)
}

function getStatValue(names: string[]): string {
  const list = profile.value?.stat?.final_stat || []
  for (const name of names) {
    const found = list.find((s) => s.stat_name === name)
    if (found && found.stat_value !== null && found.stat_value !== undefined) {
      return found.stat_value
    }
  }
  return '-'
}

function formatKoreanOrChineseUnit(valStr: string): string {
  if (!valStr || valStr === '-') return '-'
  const num = Number(valStr)
  if (Number.isNaN(num)) return valStr
  if (num >= 100_000_000) {
    const yi = Math.floor(num / 100_000_000)
    const wan = Math.floor((num % 100_000_000) / 10_000)
    return `${yi}億 ${wan > 0 ? `${wan}萬` : ''}`.trim()
  }
  if (num >= 10_000) {
    const wan = Math.floor(num / 10_000)
    const rest = num % 10_000
    return `${wan}萬 ${rest > 0 ? rest.toLocaleString() : ''}`.trim()
  }
  return num.toLocaleString()
}

const combatPowerText = computed(() => {
  const raw = getStatValue(['戰鬥力', '전투력', 'Combat Power'])
  return formatKoreanOrChineseUnit(raw)
})

const statAttackRangeText = computed(() => {
  const min = getStatValue(['最低屬性攻擊力', '최소 스탯공격력'])
  const max = getStatValue(['最高屬性攻擊力', '최대 스탯공격력'])
  if (min === '-' && max === '-') return '-'
  return `${formatKoreanOrChineseUnit(min)} ~ ${formatKoreanOrChineseUnit(max)}`
})

const keyCombatStats = computed(() => [
  { label: 'BOSS 怪物傷害', value: getStatValue(['BOSS怪物傷害', '보스 몬스터 데미지']), suffix: '%' },
  { label: '無視防禦率', value: getStatValue(['無視防禦率', '방어율 무시']), suffix: '%' },
  { label: '傷害', value: getStatValue(['傷害', '데미지']), suffix: '%' },
  { label: '最終傷害', value: getStatValue(['最終傷害', '최종 데미지']), suffix: '%' },
  { label: '爆擊機率', value: getStatValue(['爆擊機率', '크리티컬 확률']), suffix: '%' },
  { label: '爆擊傷害', value: getStatValue(['爆擊傷害', '크리티컬 데미지']), suffix: '%' },
  { label: 'STR (力量)', value: formatKoreanOrChineseUnit(getStatValue(['STR'])), suffix: '' },
  { label: 'DEX (敏捷)', value: formatKoreanOrChineseUnit(getStatValue(['DEX'])), suffix: '' },
  { label: 'INT (智力)', value: formatKoreanOrChineseUnit(getStatValue(['INT'])), suffix: '' },
  { label: 'LUK (幸運)', value: formatKoreanOrChineseUnit(getStatValue(['LUK'])), suffix: '' },
  { label: '星力 (StarForce)', value: getStatValue(['星力', '스타포스']), suffix: '' },
  {
    label: 'ARC / AUT',
    value: `${getStatValue(['神祕力量', '神秘力量', '祕法之力 (ARC)', '祕法之力', '아케인포스'])} / ${getStatValue(['真實之力 (AUT)', '真實之力', '어센틱포스'])}`,
    suffix: '',
  },
])

// 依照新楓之谷遊戲內裝備欄 6x6 格位配置 (中央角色佔 Col 3~4, Row 1~4)
interface GridSlotDef {
  slot: string
  col: number
  row: number
}

const MAPLE_6X6_SLOTS: GridSlotDef[] = [
  // 左側兩欄 (Rows 1~5)
  { slot: '戒指1', col: 1, row: 1 },
  { slot: '臉飾', col: 2, row: 1 },
  { slot: '戒指2', col: 1, row: 2 },
  { slot: '眼飾', col: 2, row: 2 },
  { slot: '戒指3', col: 1, row: 3 },
  { slot: '耳環', col: 2, row: 3 },
  { slot: '戒指4', col: 1, row: 4 },
  { slot: '墜飾', col: 2, row: 4 },

  // 右側兩欄 (Rows 1~4)
  { slot: '帽子', col: 5, row: 1 },
  { slot: '徽章', col: 6, row: 1 },
  { slot: '上衣', col: 5, row: 2 },
  { slot: '肩膀裝飾', col: 6, row: 2 },
  { slot: '褲/裙', col: 5, row: 3 },
  { slot: '胸章', col: 6, row: 3 },
  { slot: '鞋子', col: 5, row: 4 },
  { slot: '勳章', col: 6, row: 4 },

  // 第 5 列 (角色正下方：口袋、墜飾2、武器、輔助武器、手套、披風)
  { slot: '口袋道具', col: 1, row: 5 },
  { slot: '墜飾2', col: 2, row: 5 },
  { slot: '武器', col: 3, row: 5 },
  { slot: '輔助武器', col: 4, row: 5 },
  { slot: '手套', col: 5, row: 5 },
  { slot: '披風', col: 6, row: 5 },

  // 第 6 列 (腰帶、機器人、機器心臟)
  { slot: '腰帶', col: 2, row: 6 },
  { slot: '機器人', col: 5, row: 6 },
  { slot: '機器心臟', col: 6, row: 6 },
]

const TOTEM_SLOTS = ['圖騰1', '圖騰2', '圖騰3']

const activeEquipmentList = computed<ItemEquipmentInfo[]>(() => {
  const eq = profile.value?.itemEquipment
  if (!eq) return []
  const baseList = eq.item_equipment || []
  const presetKey = `item_equipment_preset_${activeEquipPreset.value}` as
    | 'item_equipment_preset_1'
    | 'item_equipment_preset_2'
    | 'item_equipment_preset_3'
  const presetList = eq[presetKey]

  const map = new Map<string, ItemEquipmentInfo>()
  for (const item of baseList) {
    const k = item.item_equipment_slot || item.item_equipment_part
    map.set(k, item)
  }
  if (presetList && presetList.length > 0) {
    for (const item of presetList) {
      const k = item.item_equipment_slot || item.item_equipment_part
      map.set(k, item)
    }
  }

  // 整合 /character/android-equipment 的機器人資料至「機器人」欄位
  const android = profile.value?.androidEquipment
  if (android && !map.has('機器人')) {
    const androidPresetKey = `android_preset_${activeEquipPreset.value}` as
      | 'android_preset_1'
      | 'android_preset_2'
      | 'android_preset_3'
    const chosenAndroid = android[androidPresetKey]?.android_name
      ? android[androidPresetKey]!
      : android

    if (chosenAndroid.android_name && chosenAndroid.android_icon) {
      map.set('機器人', {
        item_equipment_part: `機器人 (等級 ${chosenAndroid.android_grade || '-'})`,
        item_equipment_slot: '機器人',
        item_name: chosenAndroid.android_nickname
          ? `${chosenAndroid.android_name} (${chosenAndroid.android_nickname})`
          : chosenAndroid.android_name,
        item_icon: chosenAndroid.android_icon,
        item_description: chosenAndroid.android_description,
        item_shape_name: chosenAndroid.android_name,
        item_shape_icon: chosenAndroid.android_icon,
        item_gender: chosenAndroid.android_gender,
        item_total_option: {},
        item_base_option: {},
        potential_option_grade: null,
        additional_potential_option_grade: null,
        potential_option_1: null,
        potential_option_2: null,
        potential_option_3: null,
        additional_potential_option_1: null,
        additional_potential_option_2: null,
        additional_potential_option_3: null,
        equipment_level_increase: 0,
        item_exceptional_option: {},
        item_add_option: {},
        growth_exp: 0,
        growth_level: 0,
        scroll_upgrade: '0',
        cuttable_count: '0',
        golden_hammer_flag: '0',
        scroll_resilience_count: '0',
        scroll_upgradeable_count: '0',
        soul_name: null,
        soul_option: null,
        item_etc_option: {},
        starforce: '0',
        starforce_scroll_flag: '0',
        item_starforce_option: {},
        special_ring_level: 0,
        date_expire: null,
      })
    }
  }

  return Array.from(map.values())
})

const STAT_KEYS_TO_SUM = [
  'str',
  'dex',
  'int',
  'luk',
  'max_hp',
  'max_mp',
  'attack_power',
  'magic_power',
  'armor',
  'speed',
  'jump',
  'boss_damage',
  'ignore_monster_armor',
  'all_stat',
  'damage',
] as const

const mapleEquipmentLayout = computed(() => {
  const list = activeEquipmentList.value
  const slotMap = new Map<string, ItemEquipmentInfo>()
  const puzzleMap = new Map<number, ItemEquipmentInfo>()
  const usedKeys = new Set<string>()

  for (const item of list) {
    const slot = (item.item_equipment_slot || item.item_equipment_part || '').trim()
    if (slot.includes('拼圖')) {
      const m = slot.match(/(\d+)/) || item.item_name.match(/(\d+)$/)
      const idx = m ? Number(m[1]) : puzzleMap.size + 1
      puzzleMap.set(idx, item)
    } else {
      slotMap.set(slot, item)
    }
  }

  // 依照 1~12 順序組合 4x3 拼圖格與合算總屬性
  const puzzleGrid: Array<ItemEquipmentInfo | null> = Array.from({ length: 12 }, (_, i) => {
    return puzzleMap.get(i + 1) || null
  })
  const equippedPuzzles = puzzleGrid.filter((x): x is ItemEquipmentInfo => x !== null)

  let mergedPuzzleItem: ItemEquipmentInfo | null = null
  if (equippedPuzzles.length > 0) {
    const first = equippedPuzzles[0]!
    const sumOpt = (field: 'item_total_option' | 'item_base_option') => {
      const res: Record<string, string> = {}
      for (const k of STAT_KEYS_TO_SUM) {
        let total = 0
        for (const p of equippedPuzzles) {
          const val = Number((p[field] as Record<string, unknown> | undefined)?.[k] || 0)
          if (!Number.isNaN(val)) total += val
        }
        res[k] = String(total)
      }
      return res
    }

    const baseName = first.item_name.replace(/\d+$/, '').trim()
    mergedPuzzleItem = {
      ...first,
      item_equipment_part: `拼圖組合 (${equippedPuzzles.length}/12)`,
      item_equipment_slot: '拼圖',
      item_name: `${baseName} (合算)`,
      item_total_option: sumOpt('item_total_option'),
      item_base_option: sumOpt('item_base_option'),
      item_add_option: {},
      item_etc_option: {},
      item_starforce_option: {},
      starforce: '0',
      scroll_upgrade: '0',
      potential_option_grade: null,
      additional_potential_option_grade: null,
    }
  }

  const gridCells = MAPLE_6X6_SLOTS.map((def) => {
    usedKeys.add(def.slot)
    return {
      slotLabel: def.slot,
      col: def.col,
      row: def.row,
      item: slotMap.get(def.slot) || null,
    }
  })

  // 寶石與圖騰 (圖騰放在寶石下方)
  usedKeys.add('寶石')
  const gemCell = {
    slotLabel: '寶石',
    item: slotMap.get('寶石') || null,
  }

  const totemCells = TOTEM_SLOTS.map((slot) => {
    usedKeys.add(slot)
    return {
      slotLabel: slot,
      item: slotMap.get(slot) || null,
    }
  })

  // 其他未列入的特殊裝備
  const extraItems: ItemEquipmentInfo[] = []
  for (const [slot, item] of slotMap.entries()) {
    if (!usedKeys.has(slot)) {
      extraItems.push(item)
    }
  }

  return {
    gridCells,
    gemCell,
    totemCells,
    extraItems,
    puzzleGrid,
    equippedPuzzles,
    mergedPuzzleItem,
  }
})

// 裝飾 / 點裝視窗 (COORDINATION) 6x4 格位配置 + 角色下方 3 格美容欄位
interface CoordSlotDef {
  slot: string
  emptyLabel: string
  col: number
  row: number
  isPants?: boolean
}

const COORDINATION_SLOTS: CoordSlotDef[] = [
  // 左側兩欄 (Rows 1~4)
  { slot: '戒指1', emptyLabel: 'RING', col: 1, row: 1 },
  { slot: '臉飾', emptyLabel: 'FACE', col: 2, row: 1 },
  { slot: '戒指2', emptyLabel: 'RING', col: 1, row: 2 },
  { slot: '眼飾', emptyLabel: 'EYE', col: 2, row: 2 },
  { slot: '戒指3', emptyLabel: 'RING', col: 1, row: 3 },
  { slot: '耳環', emptyLabel: 'EAR', col: 2, row: 3 },
  { slot: '戒指4', emptyLabel: 'RING', col: 1, row: 4 },

  // 右側兩欄 (Rows 1~4)
  { slot: '帽子', emptyLabel: 'CAP', col: 5, row: 1 },
  { slot: '披風', emptyLabel: 'CAPE', col: 6, row: 1 },
  { slot: '上衣', emptyLabel: 'CLOTHES', col: 5, row: 2 },
  { slot: '手套', emptyLabel: 'GLOVES', col: 6, row: 2 },
  { slot: '褲/裙', emptyLabel: 'PANTS', col: 5, row: 3, isPants: true },
  { slot: '鞋子', emptyLabel: 'SHOES', col: 6, row: 3 },
  { slot: '武器', emptyLabel: 'WEAPON', col: 5, row: 4 },
  { slot: '輔助武器', emptyLabel: 'SUB WEAPON', col: 6, row: 4 },
]

function makeBeautyMannequinSvg(type: 'hair' | 'face' | 'skin'): string {
  const hairOverlay =
    type === 'hair'
      ? '<path d="M16 26c0-11 8-18 16-18s16 7 16 18c0 4-1 9-3 12-1-6-3-10-13-10s-12 4-13 10c-2-3-3-8-3-12z" fill="#334155"/><circle cx="38" cy="18" r="2.5" fill="#fff"/>'
      : ''
  const faceOverlay =
    type === 'face'
      ? '<ellipse cx="26" cy="29" rx="2.4" ry="2.8" fill="#1e293b"/><ellipse cx="38" cy="29" rx="2.4" ry="2.8" fill="#1e293b"/><path d="M29 36q3 2 6 0" stroke="#e11d48" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      : ''
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="30" r="14" fill="#fde68a" stroke="#475569" stroke-width="2"/>
      ${hairOverlay}
      ${faceOverlay}
      <path d="M22 48c2-5 6-7 10-7s8 2 10 7" fill="#fff" stroke="#475569" stroke-width="2"/>
      <circle cx="29" cy="48" r="2.5" fill="#38bdf8"/>
      <circle cx="35" cy="48" r="2.5" fill="#38bdf8"/>
    </svg>`
  )}`
}

function makeEmptyEquipmentItem(partial: Partial<ItemEquipmentInfo> & {
  item_name: string
  item_icon: string
  item_equipment_part: string
  item_equipment_slot: string
}): ItemEquipmentInfo {
  return {
    item_equipment_part: partial.item_equipment_part,
    item_equipment_slot: partial.item_equipment_slot,
    item_name: partial.item_name,
    item_icon: partial.item_icon,
    item_description: partial.item_description ?? null,
    item_shape_name: partial.item_name,
    item_shape_icon: partial.item_icon,
    item_gender: partial.item_gender ?? null,
    item_total_option: partial.item_total_option ?? {},
    item_base_option: partial.item_base_option ?? {},
    potential_option_grade: null,
    additional_potential_option_grade: null,
    potential_option_1: null,
    potential_option_2: null,
    potential_option_3: null,
    additional_potential_option_1: null,
    additional_potential_option_2: null,
    additional_potential_option_3: null,
    equipment_level_increase: 0,
    item_exceptional_option: {},
    item_add_option: {},
    growth_exp: 0,
    growth_level: 0,
    scroll_upgrade: '0',
    cuttable_count: '0',
    golden_hammer_flag: '0',
    scroll_resilience_count: '0',
    scroll_upgradeable_count: '0',
    soul_name: null,
    soul_option: null,
    item_etc_option: {},
    starforce: '0',
    starforce_scroll_flag: '0',
    item_starforce_option: {},
    special_ring_level: 0,
    date_expire: partial.date_expire ?? null,
  }
}

const coordinationLayout = computed(() => {
  const cash = profile.value?.cashEquipment
  const baseList = cash?.cash_item_equipment_base || []
  const presetKey = `cash_item_equipment_preset_${activeCashPreset.value}` as
    | 'cash_item_equipment_preset_1'
    | 'cash_item_equipment_preset_2'
    | 'cash_item_equipment_preset_3'
  const presetList = cash?.[presetKey] || []

  const slotMap = new Map<string, ItemEquipmentInfo>()

  const toItemInfo = (c: (typeof baseList)[number]): ItemEquipmentInfo => {
    const descLines: string[] = []
    if (c.cash_item_label) descLines.push(`標籤：${c.cash_item_label}`)
    if (c.cash_item_option?.length) {
      for (const opt of c.cash_item_option) {
        descLines.push(`${opt.option_type} : +${opt.option_value}`)
      }
    }
    if (c.cash_item_coloring_prism) {
      descLines.push(
        `稜鏡染色：${c.cash_item_coloring_prism.color_range} (色相 ${c.cash_item_coloring_prism.hue} / 飽和度 ${c.cash_item_coloring_prism.saturation} / 明度 ${c.cash_item_coloring_prism.value})`
      )
    }
    if (c.cash_item_description) descLines.push(c.cash_item_description)

    return makeEmptyEquipmentItem({
      item_equipment_part: `${c.cash_item_equipment_part} (點裝)`,
      item_equipment_slot: c.cash_item_equipment_slot || c.cash_item_equipment_part,
      item_name: c.cash_item_name,
      item_icon: c.cash_item_icon,
      item_description: descLines.length > 0 ? descLines.join('\n') : null,
      item_gender: c.item_gender || c.cash_item_gender || null,
      date_expire: c.date_expire,
    })
  }

  for (const c of baseList) {
    const slot = (c.cash_item_equipment_slot || c.cash_item_equipment_part || '').trim()
    slotMap.set(slot, toItemInfo(c))
  }
  if (presetList.length > 0) {
    for (const c of presetList) {
      const slot = (c.cash_item_equipment_slot || c.cash_item_equipment_part || '').trim()
      slotMap.set(slot, toItemInfo(c))
      // 若預設套用「套服」，則覆蓋下衣顯示
      if (slot === '上衣' && c.cash_item_equipment_part === '套服') {
        slotMap.delete('褲/裙')
      }
    }
  }

  const gridCells = COORDINATION_SLOTS.map((def) => ({
    slotLabel: def.slot,
    emptyLabel: def.emptyLabel,
    col: def.col,
    row: def.row,
    isPants: Boolean(def.isPants),
    item: slotMap.get(def.slot) || null,
  }))

  // 角色下方 3 格美容資訊 (髮型、臉型、膚色)
  const beauty = profile.value?.beautyEquipment
  const hair = beauty?.character_hair
  const face = beauty?.character_face
  const skin = beauty?.character_skin

  const beautyCells: Array<{ key: string; label: string; item: ItemEquipmentInfo }> = [
    {
      key: 'hair',
      label: '髮型',
      item: makeEmptyEquipmentItem({
        item_equipment_part: '角色髮型 (Hair)',
        item_equipment_slot: '髮型',
        item_name: hair?.hair_name || '角色髮型',
        item_icon: makeBeautyMannequinSvg('hair'),
        item_description: hair
          ? `主色：${hair.base_color}${hair.mix_color ? `\n混染：${hair.mix_color} (${hair.mix_rate}%)` : ''}`
          : null,
      }),
    },
    {
      key: 'face',
      label: '臉型',
      item: makeEmptyEquipmentItem({
        item_equipment_part: '角色臉型 (Face)',
        item_equipment_slot: '臉型',
        item_name: face?.face_name || '角色臉型',
        item_icon: makeBeautyMannequinSvg('face'),
        item_description: face
          ? `瞳色：${face.base_color}${face.mix_color ? `\n混染：${face.mix_color} (${face.mix_rate}%)` : ''}`
          : null,
      }),
    },
    {
      key: 'skin',
      label: '膚色',
      item: makeEmptyEquipmentItem({
        item_equipment_part: '角色膚色 (Skin)',
        item_equipment_slot: '膚色',
        item_name: skin?.skin_name || '角色膚色',
        item_icon: makeBeautyMannequinSvg('skin'),
        item_description: skin?.color_style ? `風格：${skin.color_style}` : null,
      }),
    },
  ]

  return {
    gridCells,
    beautyCells,
  }
})

// 寵物與寵物裝備 (PET 1 ~ 3) 轉換為縮圖與懸停檢視資料
const petDisplayList = computed(() => {
  const petEq = profile.value?.petEquipment
  if (!petEq) return []

  const indices = [1, 2, 3] as const
  return indices.map((idx) => {
    const name = petEq[`pet_${idx}_name` as const]
    const nickname = petEq[`pet_${idx}_nickname` as const]
    const icon = petEq[`pet_${idx}_icon` as const] || petEq[`pet_${idx}_appearance_icon` as const]
    const desc = petEq[`pet_${idx}_description` as const]
    const equip = petEq[`pet_${idx}_equipment` as const]
    const autoSkill = petEq[`pet_${idx}_auto_skill` as const]
    const skills = petEq[`pet_${idx}_skill` as const] || []
    const potentials = petEq[`pet_${idx}_potential` as const] || []

    let petItem: ItemEquipmentInfo | null = null
    if (name && icon) {
      const potLines = potentials
        .filter((p) => p.potential_type && p.potential_increase1)
        .map((p) => `${p.potential_type} +${p.potential_increase1}%`)
      const descParts: string[] = []
      if (nickname && nickname !== name) descParts.push(`暱稱：${nickname}`)
      if (skills.length > 0) descParts.push(`寵物技能：${skills.join('、')}`)
      if (desc) descParts.push(desc)

      petItem = makeEmptyEquipmentItem({
        item_equipment_part: `寵物 ${idx}`,
        item_equipment_slot: `寵物${idx}`,
        item_name: nickname && nickname !== name ? `${name} (${nickname})` : name,
        item_icon: icon,
        item_description: descParts.join('\n') || null,
      })
      if (potLines.length > 0) {
        petItem.potential_option_grade = '傳說'
        petItem.potential_option_1 = potLines[0] || null
        petItem.potential_option_2 = potLines[1] || null
        petItem.potential_option_3 = potLines[2] || null
      }
    }

    let equipItem: ItemEquipmentInfo | null = null
    if (equip?.item_name && equip?.item_icon) {
      const totalOpt: Record<string, string> = {}
      const extraOptLines: string[] = []
      for (const opt of equip.item_option || []) {
        if (opt.option_type.includes('攻擊力') && !opt.option_type.includes('魔法')) {
          totalOpt.attack_power = opt.option_value
        } else if (opt.option_type.includes('魔法攻擊力') || opt.option_type.includes('魔力')) {
          totalOpt.magic_power = opt.option_value
        } else if (opt.option_type === 'STR') {
          totalOpt.str = opt.option_value
        } else if (opt.option_type === 'DEX') {
          totalOpt.dex = opt.option_value
        } else if (opt.option_type === 'INT') {
          totalOpt.int = opt.option_value
        } else if (opt.option_type === 'LUK') {
          totalOpt.luk = opt.option_value
        } else {
          extraOptLines.push(`${opt.option_type} : +${opt.option_value}`)
        }
      }
      if (equip.item_description) extraOptLines.push(equip.item_description)

      equipItem = makeEmptyEquipmentItem({
        item_equipment_part: `寵物裝備 (寵物 ${idx})`,
        item_equipment_slot: `寵物裝備${idx}`,
        item_name: equip.item_name,
        item_icon: equip.item_icon,
        item_total_option: totalOpt,
        item_base_option: totalOpt,
        item_description: extraOptLines.join('\n') || null,
      })
      equipItem.scroll_upgrade = String(equip.scroll_upgrade || 0)
    }

    const skill1Item =
      autoSkill?.skill_1 && autoSkill?.skill_1_icon
        ? makeEmptyEquipmentItem({
            item_equipment_part: `寵物自動加持技能 1 (寵物 ${idx})`,
            item_equipment_slot: '自動技能1',
            item_name: autoSkill.skill_1,
            item_icon: autoSkill.skill_1_icon,
            item_description: '寵物自動施放之加持技能',
          })
        : null

    const skill2Item =
      autoSkill?.skill_2 && autoSkill?.skill_2_icon
        ? makeEmptyEquipmentItem({
            item_equipment_part: `寵物自動加持技能 2 (寵物 ${idx})`,
            item_equipment_slot: '自動技能2',
            item_name: autoSkill.skill_2,
            item_icon: autoSkill.skill_2_icon,
            item_description: '寵物自動施放之加持技能',
          })
        : null

    return {
      idx,
      displayName: nickname || name || '',
      petItem,
      equipItem,
      skill1Item,
      skill2Item,
    }
  })
})

// 萌獸 (Familiar) 資料轉換：支援 GAS / TMS (召喚中萌獸 + 4格羈絆欄位 1, 2, 3, VIP + 其餘未羈絆已登錄萌獸)
const familiarDisplayData = computed(() => {
  const famData = profile.value?.familiar
  if (!famData) {
    return {
      focus: null,
      bondSlots: [],
      restList: [],
      allCount: 0,
      activeSlotCount: 0,
    }
  }

  const infoList = famData.familiar_info || []
  const linkSlots = famData.familiar_link_slot || []
  const legacyList = famData.familiar || []

  // 輔助函式：標準化 slot_id
  const slotKey = (id: string | null | undefined): string => {
    let s = String(id || '').trim().toLowerCase()
    s = s.replace(/^slot\s*/i, '').replace(/^槽位\s*/i, '').trim()
    if (s === 'vip' || s === 'v.i.p') return 'vip'
    if (s === '1' || s === '01') return '1'
    if (s === '2' || s === '02') return '2'
    if (s === '3' || s === '03') return '3'
    return s
  }

  const slotOrder = ['1', '2', '3', 'vip'] as const

  // 1. 若有 TMS 專屬結構 (familiar_link_slot 或 familiar_info)
  if (infoList.length > 0 || linkSlots.length > 0) {
    const rawSlotByKey = new Map<string, (typeof linkSlots)[number]>()
    for (const slot of linkSlots) {
      const k = slotKey(slot.slot_id)
      if (k && !rawSlotByKey.has(k)) {
        rawSlotByKey.set(k, slot)
      }
    }

    // 依 slot_id 建立 info 對應表
    const infoBySlot = new Map<string, (typeof infoList)[number]>()
    for (const it of infoList) {
      const k = slotKey(it.slot_id)
      if (slotOrder.includes(k as any) && !infoBySlot.has(k)) {
        infoBySlot.set(k, it)
      }
    }

    // 若 familiar_info 裡 slot_id 沒有對上，以 familiar_link_slot 的名稱比對回填
    for (const sid of slotOrder) {
      if (infoBySlot.has(sid)) continue
      const rawSlot = rawSlotByKey.get(sid)
      if (rawSlot?.familiar_name) {
        const targetName = rawSlot.familiar_name.trim().toLowerCase()
        const matched = infoList.find((it) => {
          const n1 = (it.familiar_name || '').trim().toLowerCase()
          const n2 = (it.familiar_nickname || '').trim().toLowerCase()
          return (n1 === targetName || n2 === targetName) && (it.familiar_state === 'linked' || it.slot_id === 'not link')
        })
        if (matched) {
          infoBySlot.set(sid, matched)
        }
      }
    }

    // 解析萌獸項目為標準顯示物件
    const formatFamiliarEntry = (
      fam: (typeof infoList)[number] | null,
      slotLabel: string,
      slotRaw?: (typeof linkSlots)[number] | null
    ) => {
      if (!fam && !slotRaw?.familiar_name) return null

      const name = fam?.familiar_nickname || fam?.familiar_name || slotRaw?.familiar_name || '萌獸'
      const originalName = fam?.familiar_name || slotRaw?.familiar_name || ''
      const lv = fam?.familiar_level || 1

      const opts: string[] = []
      if (fam?.option && Array.isArray(fam.option)) {
        for (const o of fam.option) {
          if (o.option_name) {
            const valStr = o.option_value ? ` ${o.option_value.startsWith('+') ? '' : '+'}${o.option_value}` : ''
            opts.push(`${o.option_name}${valStr}`)
          }
        }
      } else if (fam) {
        const legacyOpts = [
          fam.familiar_option_1 || fam.option_1,
          fam.familiar_option_2 || fam.option_2,
          fam.familiar_option_3 || fam.option_3,
        ].filter(Boolean) as string[]
        opts.push(...legacyOpts)
      }

      // 判斷萌獸稀有度 (普通、特殊、稀有、罕見、傳說)
      const evaluateRarity = (): '普通' | '特殊' | '稀有' | '罕見' | '傳說' => {
        const optStr = opts.join(' ')
        if (
          fam?.familiar_special_flag === 'true' ||
          optStr.includes('40%') ||
          optStr.includes('35%') ||
          optStr.includes('14%') ||
          optStr.includes('20%') ||
          optStr.includes('45%') ||
          optStr.includes('9%')
        ) {
          return '傳說'
        }
        if (
          optStr.includes('30%') ||
          optStr.includes('7%') ||
          optStr.includes('8%') ||
          optStr.includes('15%')
        ) {
          return '罕見'
        }
        if (
          optStr.includes('4%') ||
          optStr.includes('5%') ||
          optStr.includes('6%') ||
          optStr.includes('被動技能') ||
          optStr.includes('最終傷害 (%) +2%') ||
          optStr.includes('最終傷害 +2%')
        ) {
          return '特殊'
        }
        return '普通'
      }

      const rarity = evaluateRarity()
      const icon = fam?.familiar_icon || getFamiliarIconUrl(originalName) || getFamiliarIconUrl(name) || generateFamiliarCardSvg(originalName || name, rarity)

      const descLines: string[] = []
      descLines.push(`稀有度：${rarity}`)
      descLines.push(`等級：Lv.${lv}`)
      if (fam?.skill_name || fam?.familiar_skill) {
        descLines.push(`萌獸技能：${fam.skill_name || fam.familiar_skill}`)
      }
      if (fam?.look_name) {
        descLines.push(`外觀造型：${fam.look_name}`)
      }
      if (fam?.familiar_description) {
        descLines.push(fam.familiar_description)
      }

      const equipItem = makeEmptyEquipmentItem({
        item_equipment_part: `萌獸 (${slotLabel})`,
        item_equipment_slot: `萌獸${slotLabel}`,
        item_name: originalName && name !== originalName ? `${name} (${originalName})` : name,
        item_icon: icon,
        item_description: descLines.join('\n'),
      })
      equipItem.potential_option_grade = rarity
      equipItem.potential_option_1 = opts[0] || null
      equipItem.potential_option_2 = opts[1] || null
      equipItem.potential_option_3 = opts[2] || null

      const isActive =
        slotRaw?.active_flag === 'true' ||
        slotRaw?.active_flag === '1' ||
        fam?.summoned_flag === 'true'

      return {
        slot: slotLabel,
        name,
        originalName,
        displayName: originalName && name !== originalName ? `${name} (${originalName})` : name,
        grade: rarity,
        rarity,
        level: lv,
        optionLevel: fam?.option_level || null,
        icon,
        options: opts,
        description: fam?.familiar_description || null,
        skill: fam?.skill_name || fam?.familiar_skill || null,
        lookName: fam?.look_name || null,
        state: fam?.familiar_state || (slotRaw ? 'linked' : 'registered'),
        isActive,
        expireDate: slotRaw?.expire_date || null,
        itemInfo: equipItem,
        raw: fam,
      }
    }

    // 2. 建立 4 格羈絆欄位 (槽位 1、槽位 2、槽位 3、VIP)
    const bondSlots = slotOrder.map((sid) => {
      const slotRaw = rawSlotByKey.get(sid) || { slot_id: sid, familiar_name: null, active_flag: 'false', expire_date: null }
      const matchedInfo = infoBySlot.get(sid) || null
      const slotLabel = sid === 'vip' ? 'VIP' : `槽位 ${sid}`
      const entry = formatFamiliarEntry(matchedInfo, slotLabel, slotRaw)

      return {
        sid,
        slotLabel,
        isVip: sid === 'vip',
        isActive: slotRaw.active_flag === 'true' || matchedInfo?.summoned_flag === 'true',
        expireDate: slotRaw.expire_date || null,
        entry,
      }
    })

    // 3. 找出「召喚中 / 當前焦點」萌獸
    // 優先順序：summoned_flag === 'true' > 4 格中啟用中 (active) 的第一隻 > 槽位 1
    let focusEntry: ReturnType<typeof formatFamiliarEntry> | null = null
    const summonedItem = infoList.find((f) => f.summoned_flag === 'true')
    if (summonedItem) {
      focusEntry = formatFamiliarEntry(summonedItem, '召喚中')
    } else {
      const activeBond = bondSlots.find((b) => b.isActive && b.entry)
      if (activeBond?.entry) {
        focusEntry = activeBond.entry
      } else {
        const firstBond = bondSlots.find((b) => b.entry)
        if (firstBond?.entry) {
          focusEntry = firstBond.entry
        } else if (infoList[0]) {
          focusEntry = formatFamiliarEntry(infoList[0], '未羈絆')
        }
      }
    }

    // 4. 其餘已登錄且未進入羈絆欄位的萌獸 (避免重複呈現)
    const bondedItemSet = new Set(
      bondSlots.map((b) => b.entry?.raw).filter(Boolean)
    )
    const bondedNames = new Set(
      bondSlots
        .map((b) => b.entry?.originalName || b.entry?.name)
        .filter(Boolean)
        .map((s) => s!.trim().toLowerCase())
    )

    const restList: Array<NonNullable<ReturnType<typeof formatFamiliarEntry>>> = []
    for (const it of infoList) {
      if (bondedItemSet.has(it)) continue
      const n = (it.familiar_name || it.familiar_nickname || '').trim().toLowerCase()
      if (it.familiar_state === 'linked' || (bondedNames.has(n) && it.slot_id !== 'not link')) {
        continue
      }
      const entry = formatFamiliarEntry(it, '已登錄')
      if (entry) {
        restList.push(entry)
      }
    }

    const activeSlotCount = bondSlots.filter((b) => b.isActive && b.entry).length

    return {
      focus: focusEntry,
      bondSlots,
      restList,
      allCount: infoList.length,
      activeSlotCount,
    }
  }

  // 舊版或相容 fallback
  if (legacyList.length > 0) {
    const list = legacyList.map((fam, idx) => {
      const name = fam.familiar_name
      const opts = [
        fam.familiar_option_1 || fam.option_1,
        fam.familiar_option_2 || fam.option_2,
        fam.familiar_option_3 || fam.option_3,
      ].filter(Boolean) as string[]

      const optStr = opts.join(' ')
      let rarity: '普通' | '特殊' | '稀有' | '罕見' | '傳說' = '普通'
      if (optStr.includes('40%') || optStr.includes('35%') || optStr.includes('14%') || optStr.includes('20%') || optStr.includes('45%') || optStr.includes('9%')) {
        rarity = '傳說'
      } else if (optStr.includes('30%') || optStr.includes('7%') || optStr.includes('8%') || optStr.includes('15%')) {
        rarity = '罕見'
      } else if (optStr.includes('4%') || optStr.includes('5%') || optStr.includes('6%') || optStr.includes('被動技能')) {
        rarity = '特殊'
      }

      const icon = fam.familiar_icon || getFamiliarIconUrl(name) || generateFamiliarCardSvg(name, rarity)

      const equipItem = makeEmptyEquipmentItem({
        item_equipment_part: `萌獸 (Slot ${idx + 1})`,
        item_equipment_slot: `萌獸${idx + 1}`,
        item_name: name,
        item_icon: icon,
        item_description: `稀有度：${rarity}\n等級：Lv.${fam.familiar_level || 1}`,
      })
      equipItem.potential_option_grade = rarity
      equipItem.potential_option_1 = opts[0] || null
      equipItem.potential_option_2 = opts[1] || null
      equipItem.potential_option_3 = opts[2] || null

      return {
        slot: `槽位 ${idx + 1}`,
        name,
        originalName: name,
        displayName: name,
        grade: rarity,
        rarity,
        level: fam.familiar_level || 1,
        optionLevel: null,
        icon,
        options: opts,
        description: fam.familiar_description || null,
        skill: fam.familiar_skill || null,
        lookName: null,
        state: 'linked',
        isActive: idx === 0,
        expireDate: null,
        itemInfo: equipItem,
        raw: fam,
      }
    })

    const bondSlots = list.slice(0, 4).map((entry, idx) => ({
      sid: String(idx + 1),
      slotLabel: `槽位 ${idx + 1}`,
      isVip: idx === 3,
      isActive: idx === 0,
      expireDate: null,
      entry,
    }))

    return {
      focus: list[0] || null,
      bondSlots,
      restList: list.slice(4),
      allCount: list.length,
      activeSlotCount: 1,
    }
  }

  return {
    focus: null,
    bondSlots: [],
    restList: [],
    allCount: 0,
    activeSlotCount: 0,
  }
})

// 相容舊有 familiarDisplayList 參考
const familiarDisplayList = computed(() => {
  const d = familiarDisplayData.value
  const fromBonds = d.bondSlots.map((b) => b.entry).filter(Boolean) as Array<NonNullable<(typeof d)['bondSlots'][number]['entry']>>
  if (fromBonds.length > 0) return fromBonds
  return d.restList.slice(0, 3)
})

// 符文裝備 (ARCANE / AUTHENTIC) 仿遊戲內 3x2 視窗資料
const symbolBoardData = computed(() => {
  const symbols = profile.value?.symbolEquipment?.symbol || []

  const toEntry = (sym: (typeof symbols)[number], isAuthentic: boolean) => {
    const maxLv = isAuthentic ? 11 : 20
    const isMax = sym.symbol_level >= maxLv
    const descLines: string[] = [
      `符文等級：Lv.${sym.symbol_level}${isMax ? ' (MAX)' : ''}`,
      `${isAuthentic ? 'AUT' : 'ARC'} : +${sym.symbol_force}`,
    ]
    if (!isMax && sym.symbol_require_growth_count > 0) {
      descLines.push(`成長值：${sym.symbol_growth_count} / ${sym.symbol_require_growth_count}`)
    }
    if (sym.symbol_drop_rate && sym.symbol_drop_rate !== '0' && sym.symbol_drop_rate !== '0%') {
      descLines.push(`道具掉落率：+${sym.symbol_drop_rate}`)
    }
    if (sym.symbol_meso_rate && sym.symbol_meso_rate !== '0' && sym.symbol_meso_rate !== '0%') {
      descLines.push(`楓幣獲得量：+${sym.symbol_meso_rate}`)
    }
    if (sym.symbol_exp_rate && sym.symbol_exp_rate !== '0' && sym.symbol_exp_rate !== '0%') {
      descLines.push(`經驗值獲得量：+${sym.symbol_exp_rate}`)
    }
    if (sym.symbol_description) {
      descLines.push(sym.symbol_description)
    }

    return {
      key: sym.symbol_name,
      level: sym.symbol_level,
      force: Number(sym.symbol_force || 0),
      isMax,
      growthText: isMax ? 'MAX' : `${sym.symbol_growth_count}/${sym.symbol_require_growth_count}`,
      raw: sym,
      item: makeEmptyEquipmentItem({
        item_equipment_part: `${isAuthentic ? '真實符文 (AUT)' : '祕法符文 (ARC)'}`,
        item_equipment_slot: '符文',
        item_name: sym.symbol_name,
        item_icon: sym.symbol_icon,
        item_total_option: {
          str: sym.symbol_str,
          dex: sym.symbol_dex,
          int: sym.symbol_int,
          luk: sym.symbol_luk,
          max_hp: sym.symbol_hp,
        },
        item_base_option: {
          str: sym.symbol_str,
          dex: sym.symbol_dex,
          int: sym.symbol_int,
          luk: sym.symbol_luk,
          max_hp: sym.symbol_hp,
        },
        item_description: descLines.join('\n'),
      }),
    }
  }

  const isAutSymbol = (name: string) =>
    name.includes('真實') || name.includes('어센틱') || name.toLowerCase().includes('authentic')
  const isGrandAutSymbol = (name: string) =>
    name.includes('豪華') || name.includes('그랜드') || name.toLowerCase().includes('grand')

  const arcaneItems = symbols
    .filter((s) => !isAutSymbol(s.symbol_name))
    .map((s) => toEntry(s, false))
  const normalAutItems = symbols
    .filter((s) => isAutSymbol(s.symbol_name) && !isGrandAutSymbol(s.symbol_name))
    .map((s) => toEntry(s, true))
  const grandAutItems = symbols
    .filter((s) => isGrandAutSymbol(s.symbol_name))
    .map((s) => toEntry(s, true))

  const allAutForce = [...normalAutItems, ...grandAutItems].reduce((acc, x) => acc + x.force, 0)

  const buildStandardPanel = (
    list: ReturnType<typeof toEntry>[],
    forceLabel: 'ARC' | 'AUT',
    overrideForce?: number
  ) => {
    const totalForce =
      overrideForce !== undefined ? overrideForce : list.reduce((acc, x) => acc + x.force, 0)
    const statTotals: Array<{ label: string; value: string }> = [
      { label: 'STR', num: list.reduce((a, x) => a + Number(x.raw.symbol_str || 0), 0) },
      { label: 'DEX', num: list.reduce((a, x) => a + Number(x.raw.symbol_dex || 0), 0) },
      { label: 'INT', num: list.reduce((a, x) => a + Number(x.raw.symbol_int || 0), 0) },
      { label: 'LUK', num: list.reduce((a, x) => a + Number(x.raw.symbol_luk || 0), 0) },
      { label: 'HP', num: list.reduce((a, x) => a + Number(x.raw.symbol_hp || 0), 0) },
    ]
      .filter((s) => s.num > 0)
      .map((s) => ({ label: s.label, value: `+ ${s.num}` }))

    const slots = Array.from({ length: 6 }, (_, i) => list[i] || null)
    return {
      isGrand: false,
      forceLabel,
      totalForce,
      statTotals,
      slots,
    }
  }

  const parseRate = (val: string | undefined) => {
    if (!val) return 0
    const n = Number(String(val).replace(/[^0-9.]/g, ''))
    return Number.isNaN(n) ? 0 : n
  }

  const totalExpRate = grandAutItems.reduce((a, x) => a + parseRate(x.raw.symbol_exp_rate), 0)
  const totalMesoRate = grandAutItems.reduce((a, x) => a + parseRate(x.raw.symbol_meso_rate), 0)
  const totalDropRate = grandAutItems.reduce((a, x) => a + parseRate(x.raw.symbol_drop_rate), 0)

  const grandPanel = {
    isGrand: true,
    forceLabel: 'AUT' as const,
    totalForce: allAutForce,
    statTotals: [
      { label: 'EXP', value: `+ ${totalExpRate}%` },
      { label: 'MESO', value: `+ ${totalMesoRate}%` },
      { label: 'DROP', value: `+ ${totalDropRate}%` },
    ],
    slots: Array.from({ length: 3 }, (_, i) => grandAutItems[i] || null),
  }

  return {
    arcane: buildStandardPanel(arcaneItems, 'ARC'),
    authentic: buildStandardPanel(normalAutItems, 'AUT', allAutForce),
    grandAuthentic: grandPanel,
  }
})

const currentSymbolPanel = computed(() => {
  if (activeSymbolTab.value === 'arcane') return symbolBoardData.value.arcane
  return isGrandAuthentic.value
    ? symbolBoardData.value.grandAuthentic
    : symbolBoardData.value.authentic
})

function updateTooltipPosition(e: MouseEvent) {
  const el = tooltipRef.value
  const tooltipWidth = el?.offsetWidth || 350
  const tooltipHeight = el?.offsetHeight || 580
  const offset = 16
  let x = e.clientX + offset
  let y = e.clientY + offset

  if (x + tooltipWidth > window.innerWidth - 12) {
    x = Math.max(12, e.clientX - tooltipWidth - offset)
  }
  if (y + tooltipHeight > window.innerHeight - 12) {
    y = Math.max(12, window.innerHeight - tooltipHeight - 12)
  }

  tooltipPos.value = { x, y }
}

function onEquipEnter(item: ItemEquipmentInfo, e: MouseEvent) {
  hoveredItem.value = item
  updateTooltipPosition(e)
  nextTick(() => {
    updateTooltipPosition(e)
  })
}

function onEquipMove(e: MouseEvent) {
  if (!hoveredItem.value) return
  updateTooltipPosition(e)
}

function onEquipLeave() {
  hoveredItem.value = null
}

function getGradeBadgeClass(grade: string | null | undefined): string {
  if (!grade) return 'grade-none'
  if (grade.includes('傳說') || grade.includes('레전드리') || grade.toLowerCase().includes('legend'))
    return 'grade-legendary'
  if (grade.includes('罕見') || grade.includes('유니크') || grade.toLowerCase().includes('unique'))
    return 'grade-unique'
  if (grade.includes('稀有') || grade.includes('에픽') || grade.toLowerCase().includes('epic'))
    return 'grade-epic'
  if (grade.includes('特殊') || grade.includes('레어') || grade.toLowerCase().includes('rare'))
    return 'grade-rare'
  return 'grade-none'
}

/**
 * 產生楓之谷官方雙行 30 星星芒陣列 (最高 30 星，每行 15 顆，5 顆一組間隔)
 */
function getStarforceStarRows(
  item: ItemEquipmentInfo | null | undefined,
  maxStars = 30
): Array<Array<{ active: boolean; isFifth: boolean }>> {
  if (!item) return []
  const current = Number(item.starforce) || 0
  const max = Math.max(30, current, maxStars)
  const starsPerRow = 15
  const rowCount = Math.ceil(max / starsPerRow)
  const rows: Array<Array<{ active: boolean; isFifth: boolean }>> = []

  let starIndex = 1
  for (let r = 0; r < rowCount; r++) {
    const rowStars: Array<{ active: boolean; isFifth: boolean }> = []
    const starsInThisRow = Math.min(starsPerRow, max - r * starsPerRow)
    for (let c = 1; c <= starsInThisRow; c++) {
      rowStars.push({
        active: starIndex <= current,
        isFifth: c % 5 === 0 && c !== starsInThisRow,
      })
      starIndex++
    }
    rows.push(rowStars)
  }
  return rows
}

// ============================================================================
// 6 轉 HEXA 矩陣 ＆ HEXA 屬性：完成度與靈魂艾爾達碎片計算機
// ============================================================================
// Lv.1 -> Lv.30 共 29 階升級所需靈魂艾爾達碎片表 (index 0 為 Lv.1->Lv.2)
const HEXA_FRAGMENT_STEPS: Record<'skill' | 'mastery' | 'enhance' | 'common', number[]> = {
  // 技能核心 (Lv.1->30 升級共 4,400 碎片；第一顆起源免費解鎖 Lv.1，第二顆技能核心解鎖 Lv.1 需 100 碎片)
  skill: [
    30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180,
    190, 200, 210, 220, 230, 240, 250, 500,
  ],
  // 精通核心 (解鎖 Lv.1 需 50 碎片，Lv.1->30 升級共 2,202 碎片，單顆滿等共 2,252 碎片)
  mastery: [
    15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75, 80, 175, 85, 90, 95, 100,
    105, 110, 115, 120, 125, 250,
  ],
  // 強化核心 (解鎖 Lv.1 需 75 碎片，Lv.1->30 升級共 3,308 碎片，單顆滿等共 3,383 碎片)
  enhance: [
    23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113, 120, 263, 128, 135, 143,
    150, 158, 165, 173, 180, 188, 375,
  ],
  // 通用核心 - 索爾雅努斯 (解鎖 Lv.1 需 125 碎片，Lv.1->30 升級共 6,143 碎片，單顆滿等共 6,268 碎片)
  common: [
    38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525, 234, 248,
    262, 275, 289, 303, 317, 330, 344, 750,
  ],
}

type HexaCategoryKey = 'skill' | 'mastery' | 'enhance' | 'common'

function classifyHexaCoreType(rawType: string): HexaCategoryKey {
  if (rawType.includes('技能')) return 'skill'
  if (rawType.includes('精通')) return 'mastery'
  if (rawType.includes('強化')) return 'enhance'
  if (rawType.includes('通用')) return 'common'
  return 'enhance'
}

function getUnlockCost(cat: HexaCategoryKey, isFirstSkillCore = false): number {
  if (cat === 'skill') return isFirstSkillCore ? 0 : 100
  if (cat === 'mastery') return 50
  if (cat === 'enhance') return 75
  return 125
}

function calcCoreFragments(
  cat: HexaCategoryKey,
  level: number,
  isFirstSkillCore = false
): { invested: number; totalMax: number; remaining: number; percent: number } {
  const steps = HEXA_FRAGMENT_STEPS[cat]
  const unlockCost = getUnlockCost(cat, isFirstSkillCore)
  const upgradeSumMax = steps.reduce((a, b) => a + b, 0)
  const totalMax = unlockCost + upgradeSumMax

  const clampedLv = Math.max(0, Math.min(30, Math.floor(level)))
  if (clampedLv === 0) {
    return { invested: 0, totalMax, remaining: totalMax, percent: 0 }
  }

  let invested = unlockCost
  for (let i = 0; i < clampedLv - 1; i++) {
    invested += steps[i] || 0
  }
  const remaining = Math.max(0, totalMax - invested)
  const percent = totalMax > 0 ? Math.round((invested / totalMax) * 10000) / 100 : 0
  return { invested, totalMax, remaining, percent }
}

interface HexaComputedCoreItem {
  key: string
  name: string
  category: HexaCategoryKey
  typeLabel: string
  apiLevel: number
  currentLevel: number
  linkedSkills: string[]
  isPlaceholder: boolean
  isFirstSkillCore: boolean
  invested: number
  totalMax: number
  remaining: number
  percent: number
}

const hexaAnalysis = computed(() => {
  const rawCores = profile.value?.hexaMatrix?.character_hexa_core_equipment || []

  // 分組整理 API 回傳的核心
  const byCat: Record<HexaCategoryKey, typeof rawCores> = {
    skill: [],
    mastery: [],
    enhance: [],
    common: [],
  }

  for (const c of rawCores) {
    const cat = classifyHexaCoreType(c.hexa_core_type || '')
    byCat[cat].push(c)
  }

  // 標準全核心配置槽位上限：
  // current10（當前版本 TMS 標準 10 顆：技能x2、精通x4、強化x4）
  // full11（含未來通用核心 索爾雅努斯 共 11 顆）
  const includeCommon = hexaCalcScope.value === 'full11' || byCat.common.length > 0
  const targetSlots: Array<{
    cat: HexaCategoryKey
    label: string
    maxSlots: number
  }> = [
    { cat: 'skill', label: '技能核心', maxSlots: 2 },
    { cat: 'mastery', label: '精通核心', maxSlots: 4 },
    { cat: 'enhance', label: '強化核心', maxSlots: 4 },
    ...(includeCommon ? [{ cat: 'common' as HexaCategoryKey, label: '通用核心 (索爾雅努斯)', maxSlots: 1 }] : []),
  ]

  const allCores: HexaComputedCoreItem[] = []

  for (const group of targetSlots) {
    const unlockedList = byCat[group.cat]
    const slotCount =
      hexaCalcScope.value === 'unlocked'
        ? unlockedList.length
        : Math.max(group.maxSlots, unlockedList.length)

    for (let idx = 0; idx < slotCount; idx++) {
      const apiCore = unlockedList[idx]
      const key = `${group.cat}-${idx}-${apiCore?.hexa_core_name || 'unopened'}`
      const apiLevel = apiCore ? Number(apiCore.hexa_core_level) || 0 : 0
      const overrideLv = customHexaLevelOverrides.value[key]
      const currentLevel =
        overrideLv !== undefined ? Math.max(0, Math.min(30, overrideLv)) : apiLevel
      const isFirstSkillCore = group.cat === 'skill' && idx === 0

      const frag = calcCoreFragments(group.cat, currentLevel, isFirstSkillCore)

      allCores.push({
        key,
        name:
          apiCore?.hexa_core_name ||
          (group.cat === 'common'
            ? '索爾雅努斯 (尚未解鎖)'
            : `${group.label} #${idx + 1} (尚未解鎖)`),
        category: group.cat,
        typeLabel: group.label,
        apiLevel,
        currentLevel,
        linkedSkills: (apiCore?.linked_skill || []).map((s) => s.hexa_skill_id).filter(Boolean),
        isPlaceholder: !apiCore,
        isFirstSkillCore,
        ...frag,
      })
    }
  }

  const totalInvested = allCores.reduce((acc, c) => acc + c.invested, 0)
  const totalMax = allCores.reduce((acc, c) => acc + c.totalMax, 0)
  const totalRemaining = Math.max(0, totalMax - totalInvested)
  const overallPercent =
    totalMax > 0 ? Math.round((totalInvested / totalMax) * 10000) / 100 : 0
  const maxedCount = allCores.filter((c) => c.currentLevel >= 30).length

  const categorySummaries = targetSlots.map((group) => {
    const items = allCores.filter((c) => c.category === group.cat)
    const inv = items.reduce((a, b) => a + b.invested, 0)
    const max = items.reduce((a, b) => a + b.totalMax, 0)
    const rem = Math.max(0, max - inv)
    const pct = max > 0 ? Math.round((inv / max) * 10000) / 100 : 0
    return {
      cat: group.cat,
      label: group.label,
      count: items.length,
      invested: inv,
      totalMax: max,
      remaining: rem,
      percent: pct,
    }
  })

  return {
    allCores,
    totalInvested,
    totalMax,
    totalRemaining,
    overallPercent,
    maxedCount,
    totalCoresCount: allCores.length,
    categorySummaries,
    hasCustomOverrides: Object.keys(customHexaLevelOverrides.value).length > 0,
  }
})

function setHexaCoreSimulatedLevel(key: string, val: number) {
  customHexaLevelOverrides.value = {
    ...customHexaLevelOverrides.value,
    [key]: Math.max(0, Math.min(30, Math.floor(val) || 0)),
  }
}

function resetHexaSimulatedLevels() {
  customHexaLevelOverrides.value = {}
}

const hexaStatSlotsDisplay = computed(() => {
  const hs = profile.value?.hexaMatrixStat
  const isPreset = hexaStatViewMode.value === 'preset'

  const slot1 = (isPreset ? hs?.preset_hexa_stat_core : hs?.character_hexa_stat_core)?.[0] || null
  const slot2 =
    (isPreset ? hs?.preset_hexa_stat_core_2 : hs?.character_hexa_stat_core_2)?.[0] || null
  const slot3 =
    (isPreset ? hs?.preset_hexa_stat_core_3 : hs?.character_hexa_stat_core_3)?.[0] || null

  const formatSlot = (core: HexaStatCore | null, index: number, unlockFrag: number) => {
    const mainLv = core ? Number(core.main_stat_level) || 0 : 0
    const sub1Lv = core ? Number(core.sub_stat_level_1) || 0 : 0
    const sub2Lv = core ? Number(core.sub_stat_level_2) || 0 : 0
    const totalLv = mainLv + sub1Lv + sub2Lv
    // 強化 20 次平均約耗費 400 碎片 + 解鎖費用
    const estFragments = core ? unlockFrag + totalLv * 20 : 0
    return {
      index,
      title: `HEXA 屬性核心 ${index === 1 ? 'I' : index === 2 ? 'II' : 'III'}`,
      unlocked: Boolean(core && core.main_stat_name),
      core,
      mainLv,
      sub1Lv,
      sub2Lv,
      totalLv,
      estFragments,
      unlockFrag,
    }
  }

  return [formatSlot(slot1, 1, 10), formatSlot(slot2, 2, 200), formatSlot(slot3, 3, 350)]
})
</script>

<template>
  <div class="app-shell">
    <!-- 頂部功能導覽列：角色查詢 vs 皇家美容模擬器 vs 黃金蘋果模擬器 -->
    <header class="top-feature-nav">
      <button
        type="button"
        class="feature-nav-btn"
        :class="{ active: appMode === 'search' }"
        @click="appMode = 'search'"
      >
        <span>🔍 角色資訊查詢</span>
      </button>
      <button
        type="button"
        class="feature-nav-btn"
        :class="{ active: appMode === 'royal' }"
        @click="appMode = 'royal'"
      >
        <img
          src="https://maplestory.io/api/TWMS/245/item/5150040/icon"
          alt="皇家美容"
          class="nav-mini-icon"
        />
        <span>皇家美容模擬器 (抽頭／臉)</span>
      </button>
      <button
        type="button"
        class="feature-nav-btn"
        :class="{ active: appMode === 'apple' }"
        @click="appMode = 'apple'"
      >
        <img
          src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
          alt="黃金蘋果"
          class="nav-mini-icon"
        />
        <span>黃金蘋果模擬器 (抽蘋果)</span>
      </button>
      <button
        type="button"
        class="feature-nav-btn"
        :class="{ active: appMode === 'boss' }"
        @click="appMode = 'boss'"
      >
        <span class="nav-mini-icon text-base leading-none">⚔️</span>
        <span>BOSS 戰力需求層級 (巴哈精華)</span>
      </button>
      <button
        type="button"
        class="feature-nav-btn"
        :class="{ active: appMode === 'ranking' }"
        @click="appMode = 'ranking'"
      >
        <span class="nav-mini-icon text-base leading-none">🏆</span>
        <span>實力排行榜 (戰力／官方榜)</span>
      </button>
    </header>

    <!-- 實力排行榜 -->
    <RankingStudio
      v-if="appMode === 'ranking'"
      @select-character="(name) => { appMode = 'search'; handleSearch(name) }"
    />

    <!-- BOSS 裝備需求層級系統 -->
    <BossTierViewer v-else-if="appMode === 'boss'" />

    <!-- 抽獎模擬器區 (皇家美容院 / 黃金蘋果) -->
    <GachaSimulator v-else-if="appMode === 'royal' || appMode === 'apple'" :initial-mode="appMode" />

    <!-- 搜尋列 -->
    <template v-else>
      <section class="search-section">
      <form class="search-bar" @submit.prevent="handleSearch()">
        <div class="search-field-group">
          <label class="field-label">角色名稱</label>
          <input
            v-model="characterName"
            type="text"
            placeholder="輸入精確角色名稱 (例如：Khepri絢蝶)..."
            class="input-control search-input"
          />
        </div>

        <button type="submit" class="btn-primary search-submit" :disabled="loading">
          <span v-if="loading">⏳ 查詢中...</span>
          <span v-else>🔍 查詢角色</span>
        </button>
      </form>

      <!-- 近期搜尋紀錄 -->
      <div v-if="searchHistory?.length" class="history-bar">
        <span class="history-label">最近查詢：</span>
        <button
          v-for="item in searchHistory"
          :key="item.name"
          class="history-chip"
          @click="handleSearch(item.name)"
        >
          {{ item.name }}
        </button>
      </div>
    </section>

    <!-- 錯誤提示 -->
    <div v-if="errorMessage" class="alert-error">
      <span>⚠️ {{ errorMessage }}</span>
    </div>

    <!-- 角色主要內容區 -->
    <main v-if="profile" class="profile-container">
      <!-- 角色概覽橫幅 -->
      <section class="hero-card">
        <div class="avatar-column">
          <div class="avatar-frame">
            <img
              :src="profile.basic.character_image"
              :alt="profile.basic.character_name"
              class="character-avatar"
            />
            <span class="level-pill">Lv. {{ profile.basic.character_level }}</span>
          </div>
          <div class="exp-bar-wrapper">
            <div class="exp-bar-fill" :style="{ width: `${profile.basic.character_exp_rate || 0}%` }"></div>
            <span class="exp-text">EXP {{ profile.basic.character_exp_rate }}%</span>
          </div>
        </div>

        <div class="identity-column">
          <div class="badges-row">
            <span class="badge badge-world">🌍 {{ profile.basic.world_name }}</span>
            <span class="badge badge-class">⚔️ {{ profile.basic.character_class }}</span>
            <span v-if="profile.basic.character_guild_name" class="badge badge-guild">
              🏰 公會：{{ profile.basic.character_guild_name }}
            </span>
            <span v-if="profile.popularity" class="badge badge-pop">
              👍 人氣：{{ profile.popularity.popularity.toLocaleString() }}
            </span>
          </div>

          <h2 class="character-name">{{ profile.basic.character_name }}</h2>

          <div class="union-row">
            <div v-if="profile.union?.union_level" class="mini-stat">
              <span class="mini-label">戰地聯盟</span>
              <span class="mini-value">
                Lv.{{ profile.union.union_level }} ({{ profile.union.union_grade }})
              </span>
            </div>
            <div v-if="profile.union?.union_artifact_level" class="mini-stat">
              <span class="mini-label">聯盟神器</span>
              <span class="mini-value">Lv.{{ profile.union.union_artifact_level }}</span>
            </div>
            <div
              v-if="familiarDisplayList.length > 0"
              class="mini-stat mini-stat-clickable"
              title="點擊切換至萌獸裝備頁籤"
              @click="activeTab = 'equipment'; equipMainTab = 'familiar'"
            >
              <span class="mini-label">🐾 出戰萌獸</span>
              <span class="mini-value">{{ familiarDisplayList.length }} 隻 (點擊查看)</span>
            </div>

          </div>

          <div class="ocid-box">
            <span class="ocid-label">OCID:</span>
            <code class="ocid-code">{{ profile.ocid }}</code>
            <button class="btn-copy" @click="copyOcid">
              {{ copiedOcid ? '✅ 已複製' : '複製' }}
            </button>
            <button class="btn-copy btn-make-card" @click="activeTab = 'card'">
              🎨 製作角色名片 (小畫家)
            </button>
            <button class="btn-copy btn-make-doll" @click="activeTab = 'doll'">
              👗 紙娃娃系統
            </button>
          </div>
        </div>

        <div class="combat-power-column">
          <div class="cp-card">
            <span class="cp-label">🔥 戰鬥力 (Combat Power)</span>
            <div class="cp-value">{{ combatPowerText }}</div>
            <div class="cp-sub">屬性攻擊力：{{ statAttackRangeText }}</div>
          </div>
        </div>
      </section>

      <!-- 同帳號戰地主力分身 / 戰地聯盟角色速覽 -->
      <section v-if="enrichedChampions.length > 0 || sortedUnionBlocks.length > 0" class="panel-card union-roster-card">
        <div class="union-roster-header">
          <div class="roster-title-box">
            <span class="roster-badge-pill">ACCOUNT & UNION</span>
            <h3 class="roster-main-title">👥 同帳號戰地角色 / 聯盟戰隊全覽</h3>
            <span v-if="profile.union?.union_level" class="roster-union-tag">
              戰地等級 Lv.{{ profile.union.union_level }} · 共 {{ sortedUnionBlocks.length }} 隻聯盟角色
            </span>
          </div>

          <div class="roster-header-actions">
            <button
              class="btn-switch-tab"
              :class="{ active: activeTab === 'union' }"
              @click="activeTab = 'union'"
            >
              📊 查看完整聯盟戰隊棋盤與加成
            </button>
          </div>
        </div>

        <!-- 區塊 A: 戰地四大主力 / 帳號旗艦角色 (點擊即直接切換查詢) -->
        <div v-if="enrichedChampions.length > 0" class="champions-preview-section">
          <div class="sub-section-title">
            <span class="sub-title-text">👑 帳號最強主力旗艦角色 (點擊一鍵無縫切換查詢)</span>
            <span v-if="championsLoading" class="champions-loading-hint">⚡ 正在同步分身外觀與等級...</span>
          </div>

          <div class="champions-grid">
            <div
              v-for="champ in enrichedChampions"
              :key="champ.champion_name + champ.champion_slot"
              class="champion-card"
              :class="{ 'is-current': champ.champion_name.trim().toLowerCase() === profile.basic.character_name.trim().toLowerCase() }"
              @click="handleSearch(champ.champion_name)"
            >
              <div class="champion-avatar-box">
                <img
                  v-if="champ.character_image"
                  :src="champ.character_image"
                  :alt="champ.champion_name"
                  class="champion-avatar-img"
                  loading="lazy"
                />
                <div v-else class="champion-avatar-placeholder">
                  👤
                </div>
                <span class="champion-slot-pill">Slot {{ champ.champion_slot }}</span>
                <span class="champion-grade-pill">{{ champ.champion_grade }}</span>
              </div>

              <div class="champion-meta">
                <div class="champion-name-row">
                  <span class="champion-name">{{ champ.champion_name }}</span>
                  <span v-if="champ.champion_name.trim().toLowerCase() === profile.basic.character_name.trim().toLowerCase()" class="current-tag">
                    當前角色
                  </span>
                </div>
                <div class="champion-details-row">
                  <span class="champion-class">{{ champ.champion_class }}</span>
                  <span v-if="champ.character_level" class="champion-level">Lv.{{ champ.character_level }}</span>
                </div>
                <div v-if="champ.champion_badge_info?.length" class="champion-buffs-brief">
                  <span
                    v-for="(b, bIdx) in champ.champion_badge_info.slice(0, 2)"
                    :key="bIdx"
                    class="badge-buff-chip"
                  >
                    {{ b.stat }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 區塊 B: 快捷滑動戰地棋盤角色列 -->
        <div v-if="sortedUnionBlocks.length > 0" class="raiders-quick-strip">
          <div class="quick-strip-header">
            <span class="strip-label">⚔️ 聯盟戰地參戰角色 ({{ sortedUnionBlocks.length }} 隻，依等級排序)：</span>
            <div class="strip-filter-tags">
              <button
                class="filter-chip"
                :class="{ active: selectedRaiderTypeFilter === 'all' }"
                @click="selectedRaiderTypeFilter = 'all'"
              >
                全部 ({{ sortedUnionBlocks.length }})
              </button>
              <button
                v-for="t in unionBlockTypes"
                :key="t"
                class="filter-chip"
                :class="{ active: selectedRaiderTypeFilter === t }"
                @click="selectedRaiderTypeFilter = t"
              >
                {{ t }}
              </button>
            </div>
          </div>

          <div class="raiders-scroller">
            <div
              v-for="(block, bIdx) in filteredUnionBlocks"
              :key="bIdx + (block.block_class || '')"
              class="raider-mini-pill"
              :class="{
                'highlight-high': Number(block.block_level) >= 280,
                'highlight-mid': Number(block.block_level) >= 260 && Number(block.block_level) < 280,
              }"
              @click="block.block_class && handleSearch(block.block_class)"
              :title="block.block_class ? `點擊可嘗試查詢 ${block.block_class}` : ''"
            >
              <span class="pill-type-tag">{{ block.block_type }}</span>
              <span class="pill-class-name">{{ block.block_class || '戰地角色' }}</span>
              <strong class="pill-lv">Lv.{{ block.block_level }}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- 近期經驗與等級變動 (近 7 日追蹤) -->
      <section class="panel-card exp-history-card">
        <div class="exp-history-header">
          <div class="exp-title-group">
            <h3>📈 近期經驗與等級變動 (近 7 日追蹤)</h3>
            <span v-if="expHistoryLoading" class="exp-loading-pill">
              ⏳ 正在同步近期歷史經驗數據...
            </span>
          </div>

          <div v-if="expHistorySummary" class="exp-summary-pills">
            <div class="exp-sum-chip">
              <span class="sum-chip-label">區間等級變動</span>
              <strong>
                Lv.{{ expHistorySummary.startLv }} ({{ expHistorySummary.startRate }}%) ➔ Lv.{{
                  expHistorySummary.endLv
                }}
                ({{ expHistorySummary.endRate }}%)
              </strong>
            </div>
            <div class="exp-sum-chip highlight">
              <span class="sum-chip-label">近 {{ expHistorySummary.daysCount }} 日總獲得經驗</span>
              <strong>
                +{{ formatExpAmount(expHistorySummary.totalExpDiff) }} (+{{
                  expHistorySummary.totalRateDiff
                }}%)
              </strong>
            </div>
            <div class="exp-sum-chip">
              <span class="sum-chip-label">日均練功進度</span>
              <strong>
                +{{ formatExpAmount(expHistorySummary.avgExpPerDay) }} / 日 (+{{
                  expHistorySummary.avgRatePerDay
                }}%)
              </strong>
            </div>
          </div>
        </div>

        <div v-if="expHistory.length > 0" class="exp-timeline-grid">
          <div
            v-for="(pt, idx) in expHistory"
            :key="pt.rawDate + idx"
            class="exp-day-card"
            :class="{
              'is-latest': pt.dateLabel === '最新',
              'has-gain': pt.rateDiff > 0 || pt.expDiff > 0,
            }"
          >
            <div class="exp-day-top">
              <span class="exp-day-date">{{ pt.dateLabel }}</span>
              <span v-if="pt.levelDiff > 0" class="exp-lvup-badge">🎉 +{{ pt.levelDiff }} Lv</span>
            </div>

            <div class="exp-day-lv">Lv.{{ pt.level }}</div>

            <!-- 當日總 EXP % 進度條 -->
            <div class="exp-day-bar-wrap">
              <div
                class="exp-day-bar-fill"
                :style="{ width: `${Math.min(100, Math.max(2, pt.expRate))}%` }"
              ></div>
              <span class="exp-day-rate-text">{{ pt.expRate.toFixed(3) }}%</span>
            </div>

            <!-- 單日增長量 -->
            <div class="exp-day-diff">
              <template v-if="idx === 0">
                <span class="diff-base">基準日</span>
              </template>
              <template v-else-if="pt.expDiff > 0 || pt.rateDiff > 0">
                <span class="diff-pos">+{{ pt.rateDiff }}%</span>
                <small class="diff-exp-amt">+{{ formatExpAmount(pt.expDiff) }}</small>
              </template>
              <template v-else>
                <span class="diff-zero">無變動 (0%)</span>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- 分頁切換 -->
      <nav class="tabs-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'stats' }"
          @click="activeTab = 'stats'"
        >
          📊 綜合能力值 / 內潛 / 極限屬性
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'equipment' }"
          @click="activeTab = 'equipment'"
        >
          🛡️ 裝備配戴 ({{ profile.itemEquipment?.item_equipment?.length || 0 }})
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'hexa' }"
          @click="activeTab = 'hexa'"
        >
          🔮 HEXA 屬性 ＆ 碎片計算 ({{ hexaAnalysis.overallPercent }}%)
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'card' }"
          @click="activeTab = 'card'"
        >
          🎨 角色名片製作 (小畫家)
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'doll' }"
          @click="activeTab = 'doll'"
        >
          👗 紙娃娃系統
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'union' }"
          @click="activeTab = 'union'"
        >
          👥 聯盟戰地 ({{ sortedUnionBlocks.length }})
        </button>
      </nav>

      <!-- Tab 1: 綜合能力值 -->
      <section v-if="activeTab === 'stats'" class="tab-content">
        <!-- 核心戰鬥指標 -->
        <h3 class="section-heading">⚡ 核心戰鬥能力指標</h3>
        <div class="stats-highlight-grid">
          <div v-for="item in keyCombatStats" :key="item.label" class="stat-metric-card">
            <span class="stat-metric-label">{{ item.label }}</span>
            <span class="stat-metric-value">
              {{ item.value }}{{ item.value !== '-' ? item.suffix : '' }}
            </span>
          </div>
        </div>

        <div class="two-col-layout">
          <!-- 內潛能 (Ability) -->
          <div class="panel-card">
            <div class="panel-header">
              <h3>✨ 內潛能 (Inner Ability)</h3>
              <div class="preset-controls">
                <template
                  v-if="
                    profile.ability?.ability_preset_1 ||
                    profile.ability?.ability_preset_2 ||
                    profile.ability?.ability_preset_3
                  "
                >
                  <button
                    v-for="pNo in ([1, 2, 3] as const)"
                    :key="pNo"
                    type="button"
                    class="preset-btn"
                    :class="{ active: activeAbilityPreset === pNo }"
                    @click="activeAbilityPreset = pNo"
                  >
                    預設 {{ pNo }}
                  </button>
                </template>
                <span
                  v-if="currentAbilityDisplay?.grade"
                  class="grade-badge"
                  :class="getGradeBadgeClass(currentAbilityDisplay.grade)"
                >
                  {{ currentAbilityDisplay.grade }}
                </span>
              </div>
            </div>
            <div v-if="currentAbilityDisplay?.list?.length" class="ability-list">
              <div
                v-for="ab in currentAbilityDisplay.list"
                :key="ab.ability_no"
                class="ability-row"
              >
                <span class="grade-badge" :class="getGradeBadgeClass(ab.ability_grade)">
                  {{ ab.ability_grade }}
                </span>
                <span class="ability-text">{{ ab.ability_value }}</span>
              </div>
              <div class="fame-note">
                剩餘名聲值：{{ (profile.ability?.remain_fame || 0).toLocaleString() }}
              </div>
            </div>
            <p v-else class="empty-hint">無內潛能資料</p>
          </div>

          <!-- 極限屬性 (Hyper Stat) -->
          <div class="panel-card">
            <div class="panel-header">
              <h3>🚀 極限屬性 (Hyper Stat)</h3>
              <div v-if="profile.hyperStat" class="preset-controls">
                <button
                  v-for="pNo in ([1, 2, 3] as const)"
                  :key="pNo"
                  type="button"
                  class="preset-btn"
                  :class="{ active: activeHyperPreset === pNo }"
                  @click="activeHyperPreset = pNo"
                >
                  預設 {{ pNo }}
                  <small v-if="String(profile.hyperStat.use_preset_no) === String(pNo)">
                    (使用中)
                  </small>
                </button>
              </div>
            </div>
            <div v-if="currentHyperStatList?.length" class="hyper-stat-list">
              <div
                v-for="hs in currentHyperStatList"
                :key="hs.stat_type"
                class="hyper-row"
              >
                <span class="hyper-type">{{ hs.stat_type }}</span>
                <span class="hyper-lv">Lv.{{ hs.stat_level }}</span>
                <span class="hyper-inc">{{ hs.stat_increase }}</span>
              </div>
            </div>
            <p v-else class="empty-hint">此預設頁無已配點的極限屬性資料</p>
          </div>
        </div>

        <!-- 完整 final_stat 列表 -->
        <div class="panel-card full-stat-panel">
          <h3>📋 完整能力值明細 (<code>/character/stat</code>)</h3>
          <div v-if="profile.stat?.final_stat?.length" class="all-stats-grid">
            <div
              v-for="st in profile.stat.final_stat"
              :key="st.stat_name"
              class="raw-stat-item"
            >
              <span class="raw-stat-name">{{ st.stat_name }}</span>
              <span class="raw-stat-val">{{ st.stat_value }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Tab 2: 裝備配戴 (依照遊戲內 6x6 角色置中裝備視窗配置 + 滑鼠懸停顯示詳細屬性) -->
      <section v-if="activeTab === 'equipment'" class="tab-content">
        <div class="equip-inventory-shell">
          <!-- 遊戲內風格裝備 / 裝飾 / 寵物切換視窗 -->
          <div class="maple-equip-window">
            <div class="maple-window-titlebar">EQUIPMENT INVENTORY</div>

            <!-- 頂部「裝備 / 寵物」雙頁籤切換 (仿遊戲內 EQUIPMENT INVENTORY 頂部頁籤) -->
            <div class="maple-top-subtabs">
              <button
                type="button"
                class="maple-subtab-btn"
                :class="{ active: equipMainTab === 'equip' }"
                @click="equipMainTab = 'equip'"
              >
                裝備
              </button>
              <button
                type="button"
                class="maple-subtab-btn"
                :class="{ active: equipMainTab === 'pet' }"
                @click="equipMainTab = 'pet'"
              >
                寵物
              </button>
              <button
                type="button"
                class="maple-subtab-btn"
                :class="{ active: equipMainTab === 'familiar' }"
                @click="equipMainTab = 'familiar'"
              >
                萌獸
              </button>
            </div>

            <div class="maple-window-body">
              <template v-if="equipMainTab === 'equip'">
                <!-- 頂部 EQUIPMENT / COORDINATION 標題與「裝飾 > / 裝備 >」切換按鈕 -->
                <div class="maple-mode-header">
                  <span class="maple-mode-title">
                    {{ equipViewMode === 'equipment' ? 'EQUIPMENT' : 'COORDINATION' }}
                  </span>
                  <button
                    type="button"
                    class="maple-mode-switch-btn"
                    @click="
                      equipViewMode = equipViewMode === 'equipment' ? 'coordination' : 'equipment'
                    "
                  >
                    <span>{{ equipViewMode === 'equipment' ? '裝飾' : '裝備' }}</span>
                    <span class="mode-arrow">❯</span>
                  </button>
                </div>

                <!-- 模式 A：一般戰鬥裝備 (EQUIPMENT) -->
                <template v-if="equipViewMode === 'equipment'">
                  <div class="maple-6x6-grid">
                    <!-- 中央角色立繪框 (Col 3~4, Row 1~4，與左右第一列齊平) -->
                    <div class="maple-portrait-box">
                      <img
                        :src="profile.basic.character_image"
                        :alt="profile.basic.character_name"
                        class="maple-portrait-img"
                      />
                      <div class="maple-portrait-footer">
                        <span class="maple-portrait-lv">Lv.{{ profile.basic.character_level }}</span>
                        <span class="maple-portrait-name">{{ profile.basic.character_name }}</span>
                      </div>
                    </div>

                    <!-- 21 個固定裝備格位 -->
                    <div
                      v-for="cell in mapleEquipmentLayout.gridCells"
                      :key="`${cell.row}-${cell.col}-${cell.slotLabel}`"
                      class="equip-thumb-slot"
                      :class="[
                        cell.item
                          ? getGradeBadgeClass(cell.item.potential_option_grade)
                          : 'slot-empty',
                      ]"
                      :style="{ gridColumn: cell.col, gridRow: cell.row }"
                      @mouseenter="cell.item && onEquipEnter(cell.item, $event)"
                      @mousemove="cell.item && onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <template v-if="cell.item">
                        <span
                          v-if="Number(cell.item.starforce) > 0"
                          class="thumb-star"
                          :class="{
                            'sf-high': Number(cell.item.starforce) >= 22,
                            'sf-mid': Number(cell.item.starforce) >= 17 && Number(cell.item.starforce) < 22
                          }"
                        >
                          ★{{ cell.item.starforce }}
                        </span>
                        <img
                          :src="cell.item.item_icon"
                          :alt="cell.item.item_name"
                          class="thumb-icon"
                        />
                      </template>
                      <span class="thumb-part">{{ cell.slotLabel }}</span>
                    </div>
                  </div>

                  <!-- 底部裝備 PRESETS 1 / 2 / 3 切換列 -->
                  <div class="maple-presets-bar">
                    <span class="presets-label">PRESETS</span>
                    <div class="presets-num-group">
                      <button
                        v-for="pNo in ([1, 2, 3] as const)"
                        :key="pNo"
                        type="button"
                        class="preset-num-btn"
                        :class="{ active: activeEquipPreset === pNo }"
                        @click="activeEquipPreset = pNo"
                      >
                        {{ pNo }}
                      </button>
                    </div>
                  </div>
                </template>

                <!-- 模式 B：裝飾 / 點裝視窗 (COORDINATION) -->
                <template v-else>
                  <div class="maple-coord-grid">
                    <!-- 中央角色立繪框 (Col 3~4, Row 1~4) -->
                    <div class="maple-portrait-box">
                      <img
                        :src="profile.basic.character_image"
                        :alt="profile.basic.character_name"
                        class="maple-portrait-img"
                      />
                      <div class="maple-portrait-footer">
                        <span class="maple-portrait-lv">Lv.{{ profile.basic.character_level }}</span>
                        <span class="maple-portrait-name">{{ profile.basic.character_name }}</span>
                      </div>
                    </div>

                    <!-- 點裝格位 (左右兩側 Rows 1~4) -->
                    <div
                      v-for="cell in coordinationLayout.gridCells"
                      :key="`coord-${cell.row}-${cell.col}-${cell.slotLabel}`"
                      class="equip-thumb-slot coord-slot"
                      :class="[
                        cell.item ? 'slot-cash-equipped' : 'slot-empty',
                        cell.isPants && !cell.item ? 'slot-pants-tint' : '',
                      ]"
                      :style="{ gridColumn: cell.col, gridRow: cell.row }"
                      @mouseenter="cell.item && onEquipEnter(cell.item, $event)"
                      @mousemove="cell.item && onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <template v-if="cell.item">
                        <img
                          :src="cell.item.item_icon"
                          :alt="cell.item.item_name"
                          class="thumb-icon"
                        />
                        <span class="cash-c-badge">C</span>
                        <span class="thumb-part">{{ cell.slotLabel }}</span>
                      </template>
                      <template v-else>
                        <span class="coord-empty-label">{{ cell.emptyLabel }}</span>
                      </template>
                    </div>
                  </div>

                  <!-- 角色正下方 3 格美容欄位 (髮型、臉型、膚色) -->
                  <div class="coord-beauty-row">
                    <div
                      v-for="bCell in coordinationLayout.beautyCells"
                      :key="bCell.key"
                      class="equip-thumb-slot coord-beauty-slot"
                      @mouseenter="onEquipEnter(bCell.item, $event)"
                      @mousemove="onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <img
                        :src="bCell.item.item_icon"
                        :alt="bCell.item.item_name"
                        class="thumb-icon"
                      />
                      <span class="thumb-part">{{ bCell.label }}</span>
                    </div>
                  </div>

                  <!-- 底部點裝 PRESETS 1 / 2 / 3 切換列 -->
                  <div class="maple-presets-bar">
                    <span class="presets-label">PRESETS</span>
                    <div class="presets-num-group">
                      <button
                        v-for="pNo in ([1, 2, 3] as const)"
                        :key="pNo"
                        type="button"
                        class="preset-num-btn"
                        :class="{ active: activeCashPreset === pNo }"
                        @click="activeCashPreset = pNo"
                      >
                        {{ pNo }}
                      </button>
                    </div>
                  </div>
                </template>
              </template>

              <!-- 寵物分頁 (PET 1 ~ 3 直立三欄式卡片，仿遊戲內截圖) -->
              <template v-else-if="equipMainTab === 'pet'">
                <div class="maple-mode-header">
                  <span class="maple-mode-title">PET</span>
                </div>

                <div class="pet-3col-grid">
                  <div v-for="pet in petDisplayList" :key="pet.idx" class="pet-col-card">
                    <!-- 上半部：左「寵物縮圖 + P徽章」、右「粉底寵物裝備縮圖 + C徽章」 -->
                    <div class="pet-top-pair">
                      <div
                        class="equip-thumb-slot pet-box-slot"
                        :class="{ 'slot-empty': !pet.petItem }"
                        @mouseenter="pet.petItem && onEquipEnter(pet.petItem, $event)"
                        @mousemove="pet.petItem && onEquipMove($event)"
                        @mouseleave="onEquipLeave"
                      >
                        <template v-if="pet.petItem">
                          <img
                            :src="pet.petItem.item_icon"
                            :alt="pet.petItem.item_name"
                            class="thumb-icon"
                          />
                          <span class="pet-p-badge">P</span>
                        </template>
                        <span v-else class="coord-empty-label">PET</span>
                      </div>

                      <div
                        class="equip-thumb-slot pet-box-slot pet-equip-tint"
                        :class="{ 'slot-empty': !pet.equipItem }"
                        @mouseenter="pet.equipItem && onEquipEnter(pet.equipItem, $event)"
                        @mousemove="pet.equipItem && onEquipMove($event)"
                        @mouseleave="onEquipLeave"
                      >
                        <template v-if="pet.equipItem">
                          <img
                            :src="pet.equipItem.item_icon"
                            :alt="pet.equipItem.item_name"
                            class="thumb-icon"
                          />
                          <span class="cash-c-badge">C</span>
                        </template>
                        <span v-else class="coord-empty-label">EQUIP</span>
                      </div>
                    </div>

                    <!-- 中間膠囊名稱列 -->
                    <div class="pet-name-pill">
                      {{ pet.displayName || '-' }}
                    </div>

                    <div class="pet-col-divider"></div>

                    <!-- 下半部：自動加持技能 1 & 2 -->
                    <div class="pet-bottom-pair">
                      <div
                        class="equip-thumb-slot pet-box-slot"
                        :class="{ 'slot-empty': !pet.skill1Item }"
                        @mouseenter="pet.skill1Item && onEquipEnter(pet.skill1Item, $event)"
                        @mousemove="pet.skill1Item && onEquipMove($event)"
                        @mouseleave="onEquipLeave"
                      >
                        <template v-if="pet.skill1Item">
                          <img
                            :src="pet.skill1Item.item_icon"
                            :alt="pet.skill1Item.item_name"
                            class="thumb-icon pet-skill-icon"
                          />
                        </template>
                        <span v-else class="coord-empty-label">PET<br />SKILL</span>
                      </div>

                      <div
                        class="equip-thumb-slot pet-box-slot"
                        :class="{ 'slot-empty': !pet.skill2Item }"
                        @mouseenter="pet.skill2Item && onEquipEnter(pet.skill2Item, $event)"
                        @mousemove="pet.skill2Item && onEquipMove($event)"
                        @mouseleave="onEquipLeave"
                      >
                        <template v-if="pet.skill2Item">
                          <img
                            :src="pet.skill2Item.item_icon"
                            :alt="pet.skill2Item.item_name"
                            class="thumb-icon pet-skill-icon"
                          />
                        </template>
                        <span v-else class="coord-empty-label">PET<br />SKILL</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 萌獸分頁 (依照 Google Apps Script 儀表板架構：左側「召喚萌獸主卡」+ 右側「4格羈絆欄位(1,2,3,VIP)」+ 下方「其餘未羈絆已登錄萌獸」) -->
              <template v-else-if="equipMainTab === 'familiar'">
                <div class="maple-mode-header">
                  <div class="fam-header-left">
                    <span class="maple-mode-title">FAMILIAR 萌獸系統</span>
                    <span class="familiar-count-badge" v-if="familiarDisplayData.allCount">
                      共登錄 {{ familiarDisplayData.allCount }} 隻
                    </span>
                    <span class="familiar-active-badge" v-if="familiarDisplayData.activeSlotCount">
                      羈絆啟用 {{ familiarDisplayData.activeSlotCount }} 格
                    </span>
                  </div>
                </div>

                <div v-if="!familiarDisplayData.focus && !familiarDisplayData.bondSlots.some(b => b.entry)" class="familiar-empty-state">
                  <span class="familiar-empty-icon">🐾</span>
                  <p class="familiar-empty-title">目前尚未召喚或裝備萌獸</p>
                  <p class="familiar-empty-sub">若角色已於遊戲內召喚萌獸，請確認 API 同步時間或重新查詢。</p>
                </div>

                <div v-else class="familiar-gas-dashboard">
                  <!-- 上半部：雙欄佈局 (左：召喚/主力萌獸焦點卡，右：4 格羈絆欄位) -->
                  <div class="familiar-summon-layout">
                    <!-- 左欄：召喚萌獸 (Focus Card) -->
                    <section class="familiar-focus-card">
                      <div class="fam-panel-eyebrow">FAMILIAR</div>
                      <div class="fam-panel-title-row">
                        <h4 class="fam-panel-title">🐾 召喚萌獸</h4>
                        <span class="fam-panel-meta">
                          {{ familiarDisplayData.focus?.state === 'linked' ? (familiarDisplayData.focus.slot || '已羈絆') : '未羈絆' }}
                        </span>
                      </div>

                      <div v-if="familiarDisplayData.focus" class="fam-focus-hero">
                        <div class="fam-focus-avatar-wrap">
                          <img
                            :src="familiarDisplayData.focus.icon"
                            :alt="familiarDisplayData.focus.displayName"
                            class="fam-focus-avatar-img"
                            loading="lazy"
                          />
                        </div>
                        <div class="fam-focus-body">
                          <h4 class="fam-focus-title">{{ familiarDisplayData.focus.displayName }}</h4>
                          <div class="fam-focus-sub">
                            <span>Lv.{{ familiarDisplayData.focus.level }}</span>
                          </div>

                          <div class="fam-focus-badges">
                            <span v-if="familiarDisplayData.focus.isActive" class="fam-badge good">召喚中</span>
                            <span class="fam-badge" :class="[`badge-grade-${familiarDisplayData.focus.rarity}`]">
                              {{ familiarDisplayData.focus.rarity }}
                            </span>
                            <span v-if="familiarDisplayData.focus.skill" class="fam-badge">
                              技能：{{ familiarDisplayData.focus.skill }}
                            </span>
                            <span v-if="familiarDisplayData.focus.lookName" class="fam-badge">
                              外觀：{{ familiarDisplayData.focus.lookName }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- 召喚萌獸潛能清單 -->
                      <div v-if="familiarDisplayData.focus?.options?.length" class="fam-focus-options">
                        <div
                          v-for="(opt, oIdx) in familiarDisplayData.focus.options"
                          :key="oIdx"
                          class="fam-focus-option-row"
                        >
                          <span class="fam-opt-bullet">⚡</span>
                          <span class="fam-opt-text">{{ opt }}</span>
                        </div>
                      </div>
                      <div v-else class="fam-focus-empty-opts">
                        此萌獸尚無額外潛能資料
                      </div>
                    </section>

                    <!-- 右欄：萌獸羈絆 4 格 (槽位 1、槽位 2、槽位 3、VIP) -->
                    <aside class="familiar-link-panel">
                      <div class="fam-panel-title-row">
                        <h4 class="fam-panel-title">🔗 萌獸羈絆 (Link Slots)</h4>
                        <span class="fam-panel-meta">固定 4 格官方欄位</span>
                      </div>

                      <div class="familiar-link-grid">
                        <div
                          v-for="slotItem in familiarDisplayData.bondSlots"
                          :key="slotItem.sid"
                          class="fam-link-slot-card"
                          :class="{
                            'active': slotItem.isActive,
                            'vip': slotItem.isVip,
                            'empty': !slotItem.entry
                          }"
                          @mouseenter="slotItem.entry?.itemInfo && onEquipEnter(slotItem.entry.itemInfo, $event)"
                          @mousemove="slotItem.entry?.itemInfo && onEquipMove($event)"
                          @mouseleave="onEquipLeave"
                        >
                          <div class="fam-slot-top-row">
                            <span class="fam-slot-id-label">{{ slotItem.slotLabel }}</span>
                            <span class="fam-slot-state-tag" :class="{ active: slotItem.isActive }">
                              {{ slotItem.isActive ? '啟用中' : '未啟用' }}
                            </span>
                          </div>

                          <template v-if="slotItem.entry">
                            <div class="fam-slot-card-body">
                              <div class="fam-slot-icon-box">
                                <img
                                  :src="slotItem.entry.icon"
                                  :alt="slotItem.entry.displayName"
                                  class="fam-slot-icon-img"
                                  loading="lazy"
                                />
                              </div>
                              <div class="fam-slot-info-box">
                                <div class="fam-slot-name" :title="slotItem.entry.displayName">
                                  {{ slotItem.entry.displayName }}
                                </div>
                                <div class="fam-slot-sub">
                                  <span>Lv.{{ slotItem.entry.level }}</span>
                                  <span>｜{{ slotItem.entry.rarity }}</span>
                                </div>
                              </div>
                            </div>

                            <div v-if="slotItem.entry.options.length" class="fam-slot-opts-list">
                              <div
                                v-for="(opt, oIdx) in slotItem.entry.options"
                                :key="oIdx"
                                class="fam-slot-opt-item"
                              >
                                {{ opt }}
                              </div>
                            </div>
                            <div v-else class="fam-slot-empty-opts">
                              無潛能資料
                            </div>
                          </template>

                          <template v-else>
                            <div class="fam-slot-empty-body">
                              <span class="fam-empty-slot-icon">🐾</span>
                              <span class="fam-empty-slot-text">可放置羈絆萌獸</span>
                            </div>
                          </template>
                        </div>
                      </div>

                      <div class="fam-link-footer">
                        <span>目前啟用羈絆：</span>
                        <b>
                          {{
                            familiarDisplayData.bondSlots
                              .filter((b) => b.isActive && b.entry)
                              .map((b) => b.entry?.name)
                              .join('、') || '無'
                          }}
                        </b>
                      </div>
                    </aside>
                  </div>

                  <!-- 下半部：其餘未羈絆已登錄萌獸列表 (Roster Grid) -->
                  <div v-if="familiarDisplayData.restList.length > 0" class="familiar-roster-section">
                    <div class="fam-roster-header">
                      <div class="fam-roster-title-box">
                        <span class="fam-roster-title">📦 其餘未羈絆已登錄萌獸</span>
                        <span class="fam-roster-count">共 {{ familiarDisplayData.restList.length }} 隻</span>
                      </div>
                    </div>

                    <div class="familiar-roster-grid">
                      <div
                        v-for="(fam, rIdx) in familiarDisplayData.restList"
                        :key="fam.originalName + rIdx"
                        class="fam-roster-card"
                        @mouseenter="onEquipEnter(fam.itemInfo, $event)"
                        @mousemove="onEquipMove($event)"
                        @mouseleave="onEquipLeave"
                      >
                        <div class="fam-roster-head">
                          <div class="fam-roster-avatar-box">
                            <img
                              :src="fam.icon"
                              :alt="fam.displayName"
                              class="fam-roster-avatar-img"
                              loading="lazy"
                            />
                          </div>
                          <div class="fam-roster-meta">
                            <div class="fam-roster-name">{{ fam.displayName }}</div>
                            <div class="fam-roster-sub">
                              <span>Lv.{{ fam.level }}</span>
                              <span> · {{ fam.rarity }}</span>
                              <span> · {{ fam.state === 'linked' ? '已羈絆' : '已登錄' }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="fam-roster-badges">
                          <span class="fam-badge" :class="[`badge-grade-${fam.rarity}`]">
                            {{ fam.rarity }}
                          </span>
                          <span v-if="fam.skill" class="fam-badge">
                            技能：{{ fam.skill }}
                          </span>
                        </div>

                        <div v-if="fam.options.length" class="fam-roster-options">
                          <div
                            v-for="(opt, oIdx) in fam.options"
                            :key="oIdx"
                            class="fam-roster-opt-line"
                          >
                            ▪ {{ opt }}
                          </div>
                        </div>
                        <div v-else class="fam-roster-empty-opt">
                          沒有潛能資料
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 右側堆疊：上方「特殊裝備 / 拼圖欄位」，下方「符文裝備 (ARC / AUT Symbols) 縮圖」 -->
          <div class="equip-side-stack">
            <!-- 特殊裝備 (寶石上方 + 圖騰1~3下方) 與 3x4 合併拼圖盤 -->
            <div class="panel-card equip-extra-card">
              <h4 class="extra-title">
                🧩 特殊裝備 / 拼圖欄位
                <span v-if="mapleEquipmentLayout.equippedPuzzles?.length">
                  ({{ mapleEquipmentLayout.equippedPuzzles.length }}/12)
                </span>
              </h4>
              <div class="extra-items-row">
                <!-- 左側：寶石在上方，圖騰 1~3 在寶石下方 -->
                <div class="gem-totem-stack">
                  <div class="gem-top-row">
                    <div
                      class="equip-thumb-slot"
                      :class="[
                        mapleEquipmentLayout.gemCell.item
                          ? getGradeBadgeClass(
                              mapleEquipmentLayout.gemCell.item.potential_option_grade
                            )
                          : 'slot-empty',
                      ]"
                      @mouseenter="
                        mapleEquipmentLayout.gemCell.item &&
                          onEquipEnter(mapleEquipmentLayout.gemCell.item, $event)
                      "
                      @mousemove="mapleEquipmentLayout.gemCell.item && onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <template v-if="mapleEquipmentLayout.gemCell.item">
                        <span
                          v-if="Number(mapleEquipmentLayout.gemCell.item.starforce) > 0"
                          class="thumb-star"
                          :class="{
                            'sf-high': Number(mapleEquipmentLayout.gemCell.item.starforce) >= 22,
                            'sf-mid': Number(mapleEquipmentLayout.gemCell.item.starforce) >= 17 && Number(mapleEquipmentLayout.gemCell.item.starforce) < 22
                          }"
                        >
                          ★{{ mapleEquipmentLayout.gemCell.item.starforce }}
                        </span>
                        <img
                          :src="mapleEquipmentLayout.gemCell.item.item_icon"
                          :alt="mapleEquipmentLayout.gemCell.item.item_name"
                          class="thumb-icon"
                        />
                      </template>
                      <span class="thumb-part">{{ mapleEquipmentLayout.gemCell.slotLabel }}</span>
                    </div>

                    <!-- 若有其他額外特殊裝備 -->
                    <div
                      v-for="item in mapleEquipmentLayout.extraItems"
                      :key="`extra-${item.item_equipment_slot || item.item_equipment_part}-${item.item_name}`"
                      class="equip-thumb-slot"
                      :class="getGradeBadgeClass(item.potential_option_grade)"
                      @mouseenter="onEquipEnter(item, $event)"
                      @mousemove="onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <span
                        v-if="Number(item.starforce) > 0"
                        class="thumb-star"
                        :class="{
                          'sf-high': Number(item.starforce) >= 22,
                          'sf-mid': Number(item.starforce) >= 17 && Number(item.starforce) < 22
                        }"
                      >
                        ★{{ item.starforce }}
                      </span>
                      <img :src="item.item_icon" :alt="item.item_name" class="thumb-icon" />
                      <span class="thumb-part">
                        {{ item.item_equipment_slot || item.item_equipment_part }}
                      </span>
                    </div>
                  </div>

                  <!-- 圖騰 1 ~ 3 (位於寶石正下方) -->
                  <div class="totem-bottom-row">
                    <div
                      v-for="tCell in mapleEquipmentLayout.totemCells"
                      :key="tCell.slotLabel"
                      class="equip-thumb-slot"
                      :class="[
                        tCell.item
                          ? getGradeBadgeClass(tCell.item.potential_option_grade)
                          : 'slot-empty',
                      ]"
                      @mouseenter="tCell.item && onEquipEnter(tCell.item, $event)"
                      @mousemove="tCell.item && onEquipMove($event)"
                      @mouseleave="onEquipLeave"
                    >
                      <template v-if="tCell.item">
                        <span
                          v-if="Number(tCell.item.starforce) > 0"
                          class="thumb-star"
                          :class="{
                            'sf-high': Number(tCell.item.starforce) >= 22,
                            'sf-mid': Number(tCell.item.starforce) >= 17 && Number(tCell.item.starforce) < 22
                          }"
                        >
                          ★{{ tCell.item.starforce }}
                        </span>
                        <img
                          :src="tCell.item.item_icon"
                          :alt="tCell.item.item_name"
                          class="thumb-icon"
                        />
                      </template>
                      <span class="thumb-part">{{ tCell.slotLabel }}</span>
                    </div>
                  </div>
                </div>

                <!-- 右側：橫 3 × 直 4 合併拼圖盤 -->
                <div
                  v-if="mapleEquipmentLayout.mergedPuzzleItem"
                  class="puzzle-jigsaw-board"
                  @mouseenter="onEquipEnter(mapleEquipmentLayout.mergedPuzzleItem, $event)"
                  @mousemove="onEquipMove($event)"
                  @mouseleave="onEquipLeave"
                >
                  <div
                    v-for="(piece, pIdx) in mapleEquipmentLayout.puzzleGrid"
                    :key="`puzzle-tile-${pIdx}`"
                    class="puzzle-tile"
                  >
                    <img
                      v-if="piece"
                      :src="piece.item_icon"
                      :alt="piece.item_name"
                      class="puzzle-tile-img"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 符文裝備 (ARCANE / AUTHENTIC) 仿遊戲內視窗 (位於特殊裝備 / 拼圖欄位正下方) -->
            <div class="maple-symbol-window">
              <div class="maple-symbol-tabs">
                <button
                  type="button"
                  class="maple-symbol-tab"
                  :class="{ active: activeSymbolTab === 'arcane' }"
                  @click="activeSymbolTab = 'arcane'"
                >
                  ARCANE
                </button>
                <button
                  type="button"
                  class="maple-symbol-tab"
                  :class="{ active: activeSymbolTab === 'authentic' }"
                  @click="activeSymbolTab = 'authentic'"
                >
                  AUTHENTIC
                </button>
              </div>

              <div
                class="maple-symbol-board"
                :class="[activeSymbolTab, { 'grand-mode': currentSymbolPanel.isGrand }]"
              >
                <div class="maple-symbol-board-header">
                  <div class="maple-symbol-board-title">
                    {{ activeSymbolTab === 'arcane' ? 'ARCANE EQUIPMENT' : 'AUTHENTIC EQUIPMENT' }}
                  </div>
                  <!-- AUTHENTIC 右上角切換按鈕 (切換一般真實符文 6 格 ↔ 豪華真實符文 3 格) -->
                  <button
                    v-if="activeSymbolTab === 'authentic'"
                    type="button"
                    class="aut-mode-switch"
                    :class="{ active: isGrandAuthentic }"
                    :title="isGrandAuthentic ? '切換至一般真實符文' : '切換至豪華真實符文'"
                    @click="isGrandAuthentic = !isGrandAuthentic"
                  >
                    <span class="aut-switch-knob"></span>
                  </button>
                </div>

                <div class="maple-symbol-summary">
                  <div class="symbol-sum-line">
                    <span class="sum-key">{{ currentSymbolPanel.forceLabel }}</span>
                    <span class="sum-val">+ {{ currentSymbolPanel.totalForce }}</span>
                  </div>
                  <div
                    v-for="st in currentSymbolPanel.statTotals"
                    :key="st.label"
                    class="symbol-sum-line"
                  >
                    <span class="sum-key">{{ st.label }}</span>
                    <span class="sum-val">{{ st.value }}</span>
                  </div>
                </div>

                <!-- 豪華真實符文 (1x3 六角形卡槽) -->
                <div v-if="currentSymbolPanel.isGrand" class="maple-symbol-grand-grid">
                  <div
                    v-for="(slot, sIdx) in currentSymbolPanel.slots"
                    :key="slot ? slot.key : `empty-grand-${sIdx}`"
                    class="maple-symbol-slot grand-hex-slot"
                    :class="{ empty: !slot }"
                    @mouseenter="slot && onEquipEnter(slot.item, $event)"
                    @mousemove="slot && onEquipMove($event)"
                    @mouseleave="onEquipLeave"
                  >
                    <template v-if="slot">
                      <div class="symbol-hex-wrap">
                        <img
                          :src="slot.item.item_icon"
                          :alt="slot.item.item_name"
                          class="symbol-orb-img"
                        />
                      </div>
                      <div class="symbol-slot-lv">Lv. {{ slot.level }}</div>
                      <div class="symbol-slot-max">{{ slot.growthText }}</div>
                    </template>
                    <template v-else>
                      <div class="symbol-hex-empty"></div>
                      <div class="symbol-lock-icon">🔒</div>
                    </template>
                  </div>
                </div>

                <!-- 一般 ARC / AUT 符文 (3x2 卡槽) -->
                <div v-else class="maple-symbol-3x2-grid">
                  <div
                    v-for="(slot, sIdx) in currentSymbolPanel.slots"
                    :key="slot ? slot.key : `empty-sym-${sIdx}`"
                    class="maple-symbol-slot"
                    :class="{ empty: !slot }"
                    @mouseenter="slot && onEquipEnter(slot.item, $event)"
                    @mousemove="slot && onEquipMove($event)"
                    @mouseleave="onEquipLeave"
                  >
                    <template v-if="slot">
                      <div class="symbol-orb-wrap">
                        <img
                          :src="slot.item.item_icon"
                          :alt="slot.item.item_name"
                          class="symbol-orb-img"
                        />
                      </div>
                      <div class="symbol-slot-lv">Lv. {{ slot.level }}</div>
                      <div class="symbol-slot-max">{{ slot.growthText }}</div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 滑鼠懸停浮動裝備視窗 (Maple 風格 Tooltip) -->
        <aside
          v-if="hoveredItem"
          ref="tooltipRef"
          class="equip-hover-tooltip"
          :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
        >
          <!-- 官方原版雙行星力實心星芒陣列 (最高 30 星，每行 15 顆，5 顆一組間隔) -->
          <div v-if="Number(hoveredItem.starforce) > 0" class="tooltip-starforce-rack">
            <div class="starforce-stars-container">
              <div
                v-for="(row, rIdx) in getStarforceStarRows(hoveredItem, 30)"
                :key="rIdx"
                class="sf-star-row"
              >
                <span
                  v-for="(star, sIdx) in row"
                  :key="sIdx"
                  class="sf-star-glyph"
                  :class="{
                    'active': star.active,
                    'is-fifth-gap': star.isFifth
                  }"
                >★</span>
              </div>
            </div>
            <div class="tooltip-stars-text">
              ★ {{ hoveredItem.starforce }} 星力強化 (最高 30 星)
              <span v-if="hoveredItem.starforce_scroll_flag === '套用'" class="sf-scroll-applied-badge">
                (防爆/咒文已套用)
              </span>
            </div>
          </div>
          <h3 class="tooltip-name">
            {{ hoveredItem.item_name }}
            <span v-if="Number(hoveredItem.scroll_upgrade) > 0">
              (+{{ hoveredItem.scroll_upgrade }})
            </span>
          </h3>
          <p class="tooltip-part">裝備部位：{{ hoveredItem.item_equipment_part }}</p>

          <!-- 若為合併拼圖，顯示 4x3 完整拼圖圖案；一般裝備顯示單一圖示 -->
          <div v-if="hoveredItem.item_equipment_slot === '拼圖'" class="tooltip-puzzle-box">
            <div class="puzzle-jigsaw-board small">
              <div
                v-for="(piece, pIdx) in mapleEquipmentLayout.puzzleGrid"
                :key="`tt-puzzle-${pIdx}`"
                class="puzzle-tile"
              >
                <img
                  v-if="piece"
                  :src="piece.item_icon"
                  :alt="piece.item_name"
                  class="puzzle-tile-img"
                />
              </div>
            </div>
          </div>
          <div v-else class="tooltip-icon-box">
            <img :src="hoveredItem.item_icon" :alt="hoveredItem.item_name" />
          </div>

          <div class="tooltip-divider"></div>

          <!-- 屬性明細 (總計 = 基礎 + 星火 + 卷軸 + 星力) -->
          <div class="tooltip-stats">
            <div
              v-if="hoveredItem.item_total_option?.str && hoveredItem.item_total_option.str !== '0'"
              class="tt-stat-line"
            >
              <span>STR : +{{ hoveredItem.item_total_option.str }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.str || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.str || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.str || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.str || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="hoveredItem.item_total_option?.dex && hoveredItem.item_total_option.dex !== '0'"
              class="tt-stat-line"
            >
              <span>DEX : +{{ hoveredItem.item_total_option.dex }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.dex || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.dex || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.dex || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.dex || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="hoveredItem.item_total_option?.int && hoveredItem.item_total_option.int !== '0'"
              class="tt-stat-line"
            >
              <span>INT : +{{ hoveredItem.item_total_option.int }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.int || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.int || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.int || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.int || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="hoveredItem.item_total_option?.luk && hoveredItem.item_total_option.luk !== '0'"
              class="tt-stat-line"
            >
              <span>LUK : +{{ hoveredItem.item_total_option.luk }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.luk || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.luk || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.luk || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.luk || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.max_hp &&
                hoveredItem.item_total_option.max_hp !== '0'
              "
              class="tt-stat-line"
            >
              <span>MaxHP : +{{ hoveredItem.item_total_option.max_hp }}</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.max_mp &&
                hoveredItem.item_total_option.max_mp !== '0'
              "
              class="tt-stat-line"
            >
              <span>MaxMP : +{{ hoveredItem.item_total_option.max_mp }}</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.attack_power &&
                hoveredItem.item_total_option.attack_power !== '0'
              "
              class="tt-stat-line"
            >
              <span>攻擊力 : +{{ hoveredItem.item_total_option.attack_power }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.attack_power || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.attack_power || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.attack_power || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.attack_power || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.magic_power &&
                hoveredItem.item_total_option.magic_power !== '0'
              "
              class="tt-stat-line"
            >
              <span>魔力 : +{{ hoveredItem.item_total_option.magic_power }}</span>
              <small v-if="hoveredItem.item_equipment_slot !== '拼圖'">
                ({{ hoveredItem.item_base_option?.magic_power || 0 }}
                <span class="c-flame">+{{ hoveredItem.item_add_option?.magic_power || 0 }}</span>
                <span class="c-scroll">+{{ hoveredItem.item_etc_option?.magic_power || 0 }}</span>
                <span class="c-star">+{{ hoveredItem.item_starforce_option?.magic_power || 0 }}</span>)
              </small>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.armor &&
                hoveredItem.item_total_option.armor !== '0'
              "
              class="tt-stat-line"
            >
              <span>防禦力 : +{{ hoveredItem.item_total_option.armor }}</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.speed &&
                hoveredItem.item_total_option.speed !== '0'
              "
              class="tt-stat-line"
            >
              <span>移動速度 : +{{ hoveredItem.item_total_option.speed }}</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.jump &&
                hoveredItem.item_total_option.jump !== '0'
              "
              class="tt-stat-line"
            >
              <span>跳躍力 : +{{ hoveredItem.item_total_option.jump }}</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.boss_damage &&
                hoveredItem.item_total_option.boss_damage !== '0'
              "
              class="tt-stat-line highlight"
            >
              <span>BOSS怪物傷害 : +{{ hoveredItem.item_total_option.boss_damage }}%</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.ignore_monster_armor &&
                hoveredItem.item_total_option.ignore_monster_armor !== '0'
              "
              class="tt-stat-line highlight"
            >
              <span>無視防禦率 : +{{ hoveredItem.item_total_option.ignore_monster_armor }}%</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.damage &&
                hoveredItem.item_total_option.damage !== '0'
              "
              class="tt-stat-line"
            >
              <span>總傷害 : +{{ hoveredItem.item_total_option.damage }}%</span>
            </div>
            <div
              v-if="
                hoveredItem.item_total_option?.all_stat &&
                hoveredItem.item_total_option.all_stat !== '0'
              "
              class="tt-stat-line"
            >
              <span>全屬性 : +{{ hoveredItem.item_total_option.all_stat }}%</span>
            </div>
          </div>

          <!-- 若為合併拼圖，列出 12 片拼圖明細 -->
          <div v-if="hoveredItem.item_equipment_slot === '拼圖'" class="tt-pot-block">
            <div class="tt-pot-title">🧩 已鑲嵌拼圖明細</div>
            <div
              v-for="piece in mapleEquipmentLayout.equippedPuzzles"
              :key="piece.item_equipment_slot"
              class="tt-puzzle-piece-line"
            >
              {{ piece.item_name }}
            </div>
          </div>

          <div class="tooltip-divider"></div>

          <!-- 潛能區塊 -->
          <div
            v-if="hoveredItem.potential_option_grade || hoveredItem.potential_option_1"
            class="tt-pot-block"
          >
            <div class="tt-pot-title">
              <span
                class="grade-badge"
                :class="getGradeBadgeClass(hoveredItem.potential_option_grade)"
              >
                {{ hoveredItem.potential_option_grade || '潛能' }}
              </span>
              潛能屬性
            </div>
            <div v-if="hoveredItem.potential_option_1" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.potential_option_1 }}</span>
            </div>
            <div v-if="hoveredItem.potential_option_2" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.potential_option_2 }}</span>
            </div>
            <div v-if="hoveredItem.potential_option_3" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.potential_option_3 }}</span>
            </div>
          </div>

          <!-- 附加潛能區塊 -->
          <div
            v-if="
              hoveredItem.additional_potential_option_grade ||
              hoveredItem.additional_potential_option_1
            "
            class="tt-pot-block"
          >
            <div class="tt-pot-title">
              <span
                class="grade-badge"
                :class="getGradeBadgeClass(hoveredItem.additional_potential_option_grade)"
              >
                {{ hoveredItem.additional_potential_option_grade || '附加' }}
              </span>
              附加潛能
            </div>
            <div v-if="hoveredItem.additional_potential_option_1" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.additional_potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.additional_potential_option_1 }}</span>
            </div>
            <div v-if="hoveredItem.additional_potential_option_2" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.additional_potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.additional_potential_option_2 }}</span>
            </div>
            <div v-if="hoveredItem.additional_potential_option_3" class="tt-pot-line">
              <span
                class="pot-line-dot"
                :class="getGradeBadgeClass(hoveredItem.additional_potential_option_grade)"
              ></span>
              <span>{{ hoveredItem.additional_potential_option_3 }}</span>
            </div>
          </div>

          <!-- 靈魂寶珠 -->
          <div v-if="hoveredItem.soul_name" class="tt-soul-block">
            <div class="tt-pot-title">🔮 {{ hoveredItem.soul_name }}</div>
            <div>{{ hoveredItem.soul_option }}</div>
          </div>

          <!-- 道具說明 (如機器人、寶石、勳章等) -->
          <div v-if="hoveredItem.item_description" class="tt-soul-block tt-desc-block">
            {{ hoveredItem.item_description }}
          </div>
        </aside>
      </section>

      <!-- Tab 3: 6 轉 HEXA 屬性 ＆ 靈魂艾爾達碎片完成度計算機 -->
      <section v-if="activeTab === 'hexa'" class="tab-content hexa-tab-shell">
        <!-- 頂部：HEXA 整體完成度與還差多少碎片儀表板 -->
        <div class="panel-card hexa-dashboard-card">
          <div class="hexa-dash-header">
            <div class="hexa-dash-title-wrap">
              <h3>🔮 6 轉 HEXA 矩陣完成度 ＆ 靈魂艾爾達碎片計算機</h3>
              <p class="hexa-dash-sub">
                自動依據角色目前 HEXA 核心等級，精算已投入碎片、完成度百分比，以及距離全滿 (Lv.30) 還差多少靈魂艾爾達碎片
              </p>
            </div>

            <div class="hexa-scope-controls">
              <button
                type="button"
                class="preset-btn"
                :class="{ active: hexaCalcScope === 'current10' }"
                @click="hexaCalcScope = 'current10'"
              >
                🎯 當前版本全滿 (10 顆核心)
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: hexaCalcScope === 'unlocked' }"
                @click="hexaCalcScope = 'unlocked'"
              >
                🔓 僅計算目前已解鎖核心
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: hexaCalcScope === 'full11' }"
                @click="hexaCalcScope = 'full11'"
              >
                🔮 含索爾雅努斯全滿 (11 顆)
              </button>
              <button
                v-if="hexaAnalysis.hasCustomOverrides"
                type="button"
                class="preset-btn hexa-reset-btn"
                @click="resetHexaSimulatedLevels"
              >
                🔄 還原角色 API 原始等級
              </button>
            </div>
          </div>

          <!-- 大型進度條 -->
          <div class="hexa-overall-progress-box">
            <div class="hexa-progress-labels">
              <span class="hexa-progress-main-label">
                整體 HEXA 碎片完成度
                <strong>{{ hexaAnalysis.overallPercent.toFixed(2) }}%</strong>
              </span>
              <span class="hexa-progress-fraction">
                已投入 <strong>{{ hexaAnalysis.totalInvested.toLocaleString() }}</strong> / 滿等總計
                <strong>{{ hexaAnalysis.totalMax.toLocaleString() }}</strong> 碎片
              </span>
            </div>
            <div class="hexa-progress-track">
              <div
                class="hexa-progress-fill"
                :style="{ width: `${Math.min(100, hexaAnalysis.overallPercent)}%` }"
              ></div>
            </div>
          </div>

          <!-- 四大關鍵統計指標 -->
          <div class="hexa-kpi-grid">
            <div class="hexa-kpi-card highlight-purple">
              <span class="hexa-kpi-label">📊 目前整體完成度</span>
              <strong class="hexa-kpi-value">{{ hexaAnalysis.overallPercent.toFixed(2) }}%</strong>
              <span class="hexa-kpi-sub">
                已滿等核心：{{ hexaAnalysis.maxedCount }} / {{ hexaAnalysis.totalCoresCount }} 顆
              </span>
            </div>

            <div class="hexa-kpi-card">
              <span class="hexa-kpi-label">💎 已投入靈魂艾爾達碎片</span>
              <strong class="hexa-kpi-value cyan">
                {{ hexaAnalysis.totalInvested.toLocaleString() }} 個
              </strong>
              <span class="hexa-kpi-sub">目前角色已消耗碎片總量</span>
            </div>

            <div class="hexa-kpi-card highlight-amber">
              <span class="hexa-kpi-label">🔥 距離全滿 (Lv.30) 還差多少碎片</span>
              <strong class="hexa-kpi-value amber">
                {{ hexaAnalysis.totalRemaining.toLocaleString() }} 個
              </strong>
              <span class="hexa-kpi-sub">
                {{
                  hexaAnalysis.totalRemaining === 0
                    ? '🎉 恭喜！所有目標核心皆已達成 Lv.30 滿等！'
                    : `尚需收集 ${hexaAnalysis.totalRemaining.toLocaleString()} 個碎片即可達成全滿`
                }}
              </span>
            </div>

            <div class="hexa-kpi-card">
              <span class="hexa-kpi-label">🎯 滿等總需求碎片 (Lv.30)</span>
              <strong class="hexa-kpi-value">
                {{ hexaAnalysis.totalMax.toLocaleString() }} 個
              </strong>
              <span class="hexa-kpi-sub">
                {{
                  hexaCalcScope === 'full11'
                    ? '2 技能 + 4 精通 + 4 強化 + 1 通用 (11 顆)'
                    : hexaCalcScope === 'current10'
                      ? '當前 10 顆 (2 技能 + 4 精通 + 4 強化)'
                      : '以目前已解鎖核心為基準'
                }}
              </span>
            </div>
          </div>

          <!-- 四大核心分類完成度小卡 (技能 / 精通 / 強化 / 通用) -->
          <div class="hexa-cat-grid">
            <div
              v-for="cat in hexaAnalysis.categorySummaries"
              :key="cat.cat"
              class="hexa-cat-card"
              :class="`hexa-cat-${cat.cat}`"
            >
              <div class="hexa-cat-top">
                <span class="hexa-cat-badge" :class="`badge-${cat.cat}`">{{ cat.label }}</span>
                <strong class="hexa-cat-pct">{{ cat.percent.toFixed(1) }}%</strong>
              </div>
              <div class="hexa-mini-bar">
                <div
                  class="hexa-mini-bar-fill"
                  :class="`fill-${cat.cat}`"
                  :style="{ width: `${Math.min(100, cat.percent)}%` }"
                ></div>
              </div>
              <div class="hexa-cat-meta">
                <span>已用：<strong>{{ cat.invested.toLocaleString() }}</strong></span>
                <span class="remaining-tag">
                  還差：<strong>{{ cat.remaining.toLocaleString() }}</strong> 碎片
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 第二區塊：HEXA 屬性核心 (HEXA Stat Core I / II / III) -->
        <div class="panel-card hexa-stat-panel">
          <div class="panel-header">
            <div>
              <h3>⚡ HEXA 屬性核心 (HEXA Stat Core I / II / III)</h3>
              <p class="hexa-section-note">
                顯示角色目前裝備的 HEXA 屬性核心主屬性 (Max Lv.10) 與兩條副屬性等級配點
              </p>
            </div>
            <div class="preset-controls">
              <button
                type="button"
                class="preset-btn"
                :class="{ active: hexaStatViewMode === 'equipped' }"
                @click="hexaStatViewMode = 'equipped'"
              >
                目前套用中
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: hexaStatViewMode === 'preset' }"
                @click="hexaStatViewMode = 'preset'"
              >
                預設頁配置
              </button>
            </div>
          </div>

          <div class="hexa-stat-cores-grid">
            <div
              v-for="slot in hexaStatSlotsDisplay"
              :key="slot.index"
              class="hexa-stat-core-card"
              :class="{ locked: !slot.unlocked }"
            >
              <div class="hexa-stat-core-header">
                <span class="hexa-stat-slot-title">💠 {{ slot.title }}</span>
                <span v-if="slot.unlocked" class="hexa-stat-lv-pill">
                  總等級 Lv.{{ slot.totalLv }} / 20
                </span>
                <span v-else class="hexa-stat-lv-pill locked-pill">尚未解鎖</span>
              </div>

              <template v-if="slot.unlocked && slot.core">
                <!-- 主屬性 -->
                <div class="hexa-stat-line main-line">
                  <div class="stat-line-top">
                    <span class="stat-role-tag main-tag">主屬性</span>
                    <span class="stat-line-name">{{ slot.core.main_stat_name }}</span>
                    <strong class="stat-line-lv">Lv.{{ slot.mainLv }}</strong>
                  </div>
                  <div class="stat-step-bar">
                    <span
                      v-for="n in 10"
                      :key="n"
                      class="stat-step-pip"
                      :class="{ active: n <= slot.mainLv, main: true }"
                    ></span>
                  </div>
                </div>

                <!-- 副屬性 1 -->
                <div class="hexa-stat-line">
                  <div class="stat-line-top">
                    <span class="stat-role-tag sub-tag">副屬性 1</span>
                    <span class="stat-line-name">{{ slot.core.sub_stat_name_1 }}</span>
                    <strong class="stat-line-lv">Lv.{{ slot.sub1Lv }}</strong>
                  </div>
                  <div class="stat-step-bar">
                    <span
                      v-for="n in 10"
                      :key="n"
                      class="stat-step-pip"
                      :class="{ active: n <= slot.sub1Lv }"
                    ></span>
                  </div>
                </div>

                <!-- 副屬性 2 -->
                <div class="hexa-stat-line">
                  <div class="stat-line-top">
                    <span class="stat-role-tag sub-tag">副屬性 2</span>
                    <span class="stat-line-name">{{ slot.core.sub_stat_name_2 }}</span>
                    <strong class="stat-line-lv">Lv.{{ slot.sub2Lv }}</strong>
                  </div>
                  <div class="stat-step-bar">
                    <span
                      v-for="n in 10"
                      :key="n"
                      class="stat-step-pip"
                      :class="{ active: n <= slot.sub2Lv }"
                    ></span>
                  </div>
                </div>
              </template>

              <div v-else class="hexa-stat-empty">
                <p>此屬性核心槽位尚未開啟或無資料</p>
                <small>開啟需消耗 {{ slot.unlockFrag }} 個靈魂艾爾達碎片</small>
              </div>
            </div>
          </div>
        </div>

        <!-- 第三區塊：HEXA 核心明細與單顆碎片差距試算表 -->
        <div class="panel-card hexa-cores-list-panel">
          <div class="panel-header">
            <div>
              <h3>📋 HEXA 核心等級明細 ＆ 單顆還差多少碎片試算表</h3>
              <p class="hexa-section-note">
                可直接拖曳或修改單顆核心等級，即時模擬升級後的整體完成度與剩餘碎片需求
              </p>
            </div>
          </div>

          <div v-if="hexaAnalysis.allCores.length" class="hexa-cores-grid">
            <div
              v-for="core in hexaAnalysis.allCores"
              :key="core.key"
              class="hexa-core-item-card"
              :class="[
                `core-border-${core.category}`,
                {
                  'is-maxed': core.currentLevel >= 30,
                  'is-unopened': core.currentLevel === 0,
                },
              ]"
            >
              <div class="hexa-core-card-top">
                <span class="hexa-cat-badge" :class="`badge-${core.category}`">
                  {{ core.typeLabel }}
                </span>
                <span class="hexa-core-pct-pill" :class="{ maxed: core.currentLevel >= 30 }">
                  {{ core.currentLevel >= 30 ? '★ MAX (100%)' : `${core.percent.toFixed(1)}%` }}
                </span>
              </div>

              <h4 class="hexa-core-title">{{ core.name }}</h4>
              <div v-if="core.linkedSkills.length" class="hexa-linked-skills">
                強化技能：{{ core.linkedSkills.join('、') }}
              </div>

              <!-- 等級調整與顯示列 -->
              <div class="hexa-core-lv-control">
                <div class="lv-label-group">
                  <span class="lv-current-badge">
                    Lv.<strong>{{ core.currentLevel }}</strong> / 30
                  </span>
                  <small v-if="core.currentLevel !== core.apiLevel" class="lv-sim-tag">
                    (原始 Lv.{{ core.apiLevel }})
                  </small>
                </div>

                <input
                  type="range"
                  min="0"
                  max="30"
                  :value="core.currentLevel"
                  class="hexa-lv-slider"
                  @input="
                    setHexaCoreSimulatedLevel(
                      core.key,
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                />
              </div>

              <!-- 單顆碎片進度條 -->
              <div class="hexa-mini-bar">
                <div
                  class="hexa-mini-bar-fill"
                  :class="`fill-${core.category}`"
                  :style="{ width: `${Math.min(100, core.percent)}%` }"
                ></div>
              </div>

              <!-- 已投入碎片 vs 還差多少碎片 -->
              <div class="hexa-core-frag-footer">
                <div class="frag-stat-col">
                  <span class="frag-col-label">已投入碎片</span>
                  <strong class="frag-col-val">
                    {{ core.invested.toLocaleString() }} / {{ core.totalMax.toLocaleString() }}
                  </strong>
                </div>
                <div class="frag-stat-col right">
                  <span class="frag-col-label">距離 Lv.30 還差</span>
                  <strong
                    class="frag-col-val"
                    :class="core.remaining > 0 ? 'need-more' : 'done-max'"
                  >
                    {{ core.remaining > 0 ? `${core.remaining.toLocaleString()} 個碎片` : '已滿等' }}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <p v-else class="empty-hint">
            此角色尚未完成 6 轉或無已解鎖的 HEXA 核心資料（可切換上方「🎯 標準全滿畢業目標」預覽完整 11 顆核心需求）。
          </p>
        </div>
      </section>

      <!-- Tab 4: 角色名片製作 & 小畫家塗鴉工作室 -->
      <section v-if="activeTab === 'card'" class="tab-content">
        <CharacterCardStudio
          :profile="profile"
          :combat-power-text="combatPowerText"
          :stat-attack-range-text="statAttackRangeText"
          :exp-history="expHistory"
        />
      </section>

      <!-- Tab 5: 紙娃娃與換裝模擬器 -->
      <section v-if="activeTab === 'doll'" class="tab-content">
        <CharacterDollStudio :profile="profile" />
      </section>

      <!-- Tab 6: 聯盟戰地與同帳號角色名單 -->
      <section v-if="activeTab === 'union'" class="tab-content union-tab-section">
        <div class="panel-card">
          <div class="panel-header">
            <h3>👥 聯盟戰地角色名單與戰隊加成全覽</h3>
            <span v-if="profile.union?.union_level" class="union-grade-tag">
              {{ profile.union.union_grade }} · Lv.{{ profile.union.union_level }}
            </span>
          </div>

          <!-- 戰地四大主力旗艦 -->
          <div v-if="enrichedChampions.length > 0" class="union-champions-block">
            <h4 class="sub-block-title">👑 同帳號戰地主力冠軍角色 (點選直接跳轉查詢)</h4>
            <div class="champions-grid large-grid">
              <div
                v-for="champ in enrichedChampions"
                :key="champ.champion_name + champ.champion_slot"
                class="champion-card champion-card-full"
                :class="{ 'is-current': champ.champion_name.trim().toLowerCase() === profile.basic.character_name.trim().toLowerCase() }"
                @click="handleSearch(champ.champion_name)"
              >
                <div class="champion-avatar-box large-avatar">
                  <img
                    v-if="champ.character_image"
                    :src="champ.character_image"
                    :alt="champ.champion_name"
                    class="champion-avatar-img"
                    loading="lazy"
                  />
                  <div v-else class="champion-avatar-placeholder">
                    👤
                  </div>
                  <span class="champion-slot-pill">Slot {{ champ.champion_slot }}</span>
                  <span class="champion-grade-pill">{{ champ.champion_grade }}</span>
                </div>

                <div class="champion-meta">
                  <div class="champion-name-row">
                    <span class="champion-name font-bold">{{ champ.champion_name }}</span>
                    <span v-if="champ.champion_name.trim().toLowerCase() === profile.basic.character_name.trim().toLowerCase()" class="current-tag">
                      當前角色
                    </span>
                  </div>
                  <div class="champion-details-row">
                    <span class="champion-class">{{ champ.champion_class }}</span>
                    <span v-if="champ.character_level" class="champion-level">Lv.{{ champ.character_level }}</span>
                    <span v-if="champ.world_name" class="champion-world">{{ champ.world_name }}</span>
                  </div>
                  <div v-if="champ.champion_badge_info?.length" class="champion-badge-list">
                    <div
                      v-for="(b, bIdx) in champ.champion_badge_info"
                      :key="bIdx"
                      class="champion-badge-item"
                    >
                      ✦ {{ b.stat }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 聯盟戰地 22x20 實際拼盤樣貌 (Synergy Grid) -->
          <UnionBoardViewer
            :union-raider="profile.unionRaider"
            :blocks="profile.unionRaider?.union_block"
            :occupied-stats="profile.unionRaider?.union_occupied_stat"
            :raider-stats="profile.unionRaider?.union_raider_stat"
          />

          <!-- 戰地全體角色棋盤名單 -->
          <div class="union-all-blocks-block">
            <div class="blocks-filter-bar">
              <h4 class="sub-block-title">
                ⚔️ 聯盟戰地參戰角色 (共 {{ sortedUnionBlocks.length }} 隻)
              </h4>
              <div class="filter-chips-group">
                <button
                  class="filter-chip"
                  :class="{ active: selectedRaiderTypeFilter === 'all' }"
                  @click="selectedRaiderTypeFilter = 'all'"
                >
                  全部 ({{ sortedUnionBlocks.length }})
                </button>
                <button
                  v-for="t in unionBlockTypes"
                  :key="t"
                  class="filter-chip"
                  :class="{ active: selectedRaiderTypeFilter === t }"
                  @click="selectedRaiderTypeFilter = t"
                >
                  {{ t }}
                </button>
              </div>
            </div>

            <div class="union-blocks-grid">
              <div
                v-for="(block, bIdx) in filteredUnionBlocks"
                :key="bIdx + (block.block_class || '')"
                class="union-block-card"
                :class="{
                  'is-280-plus': Number(block.block_level) >= 280,
                  'is-260-plus': Number(block.block_level) >= 260 && Number(block.block_level) < 280,
                }"
                @click="block.block_class && handleSearch(block.block_class)"
              >
                <div class="block-top">
                  <span class="block-type-badge">{{ block.block_type }}</span>
                  <span class="block-level-badge">Lv.{{ block.block_level }}</span>
                </div>
                <div class="block-class-name">{{ block.block_class || '戰地角色' }}</div>
                <div class="block-action-hint">點擊查詢此角色 ↗</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    </template>
  </div>
</template>
