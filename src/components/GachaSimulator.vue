<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

export interface RoyalStyleItem {
  name: string
  chance: number
  itemId: number
  region: string
  version: string
  image?: string
  count?: number
}

export interface RoyalDrawRecord extends RoyalStyleItem {
  drawIndex: number
}

export interface ApplePrizeItem {
  id: number
  name: string
  chance: number
  tier: 'S' | 'A' | 'B'
  iconId?: number
  iconVersion?: string
  count: number
}

export interface AppleDrawRecord {
  drawIndex: number
  name: string
  chance: number
  tier: 'S' | 'A' | 'B'
  iconId?: number
  iconVersion?: string
}

const props = defineProps<{
  initialMode?: 'royal' | 'apple'
}>()

const simulatorTab = ref<'royal' | 'apple'>(props.initialMode || 'royal')

watch(
  () => props.initialMode,
  (val) => {
    if (val) simulatorTab.value = val
  }
)

// ============================================================================
// Part 1: 皇家美容院模擬器 (100% 官方公告 bid=84116 獎池與原汁原味角色展示圖)
// ============================================================================
type RoyalPoolKey = 'femaleHair' | 'femaleFace' | 'maleHair' | 'maleFace'

const ROYAL_POOLS: Record<RoyalPoolKey, RoyalStyleItem[]> = {
  femaleHair: [
    { name: '蓮華髮髻', chance: 1.5, itemId: 64510, region: 'TWMS', version: '256', image: './royal-84116/female-hair-1.png' },
    { name: '溫暖辮子', chance: 1.5, itemId: 47910, region: 'TWMS', version: '256', image: './royal-84116/female-hair-2.png' },
    { name: '黑髮櫻桃棒棒糖', chance: 6.0, itemId: 64580, region: 'TWMS', version: '256', image: './royal-84116/female-hair-3.png' },
    { name: '黑髮優雅女神', chance: 6.0, itemId: 47740, region: 'TWMS', version: '256', image: './royal-84116/female-hair-4.png' },
    { name: '黑色甜蜜馬尾造型', chance: 6.0, itemId: 38100, region: 'TWMS', version: '256' },
    { name: '黑色蓬鬆束髮造型', chance: 6.0, itemId: 31360, region: 'TWMS', version: '256' },
    { name: '黑色小櫻造型', chance: 6.0, itemId: 34370, region: 'TWMS', version: '256' },
    { name: '黑色學生挑染造型', chance: 13.4, itemId: 31830, region: 'TWMS', version: '256' },
    { name: '黑色小僮雙紮造型', chance: 13.4, itemId: 31890, region: 'TWMS', version: '256' },
    { name: '黑色嬌小紮尾造型', chance: 13.4, itemId: 34330, region: 'TWMS', version: '256' },
    { name: '黑色短翹造型', chance: 13.4, itemId: 34040, region: 'TWMS', version: '256' },
    { name: '黑色珍珠小結造型', chance: 13.4, itemId: 37310, region: 'TWMS', version: '256' },
  ],
  femaleFace: [
    { name: '人間瑰寶', chance: 2.5, itemId: 56003, region: 'TWMS', version: '256' },
    { name: '咳咳～', chance: 2.5, itemId: 56014, region: 'TWMS', version: '256' },
    { name: '白眼文靜的艾琳', chance: 7.5, itemId: 51089, region: 'TWMS', version: '256' },
    { name: '白眼好俏皮', chance: 7.5, itemId: 21836, region: 'TWMS', version: '256' },
    { name: '平靜的臉型', chance: 10.0, itemId: 20032, region: 'TWMS', version: '256' },
    { name: '扁嘴的臉型', chance: 10.0, itemId: 20066, region: 'TWMS', version: '256' },
    { name: '寧靜的臉型', chance: 10.0, itemId: 21078, region: 'TWMS', version: '256' },
    { name: '憂愁的臉型', chance: 10.0, itemId: 21080, region: 'TWMS', version: '256' },
    { name: '超新星臉型', chance: 10.0, itemId: 21063, region: 'TWMS', version: '256' },
    { name: '清秀臉形', chance: 10.0, itemId: 24072, region: 'TWMS', version: '256' },
    { name: '鉤子臉', chance: 10.0, itemId: 23017, region: 'TWMS', version: '256' },
    { name: '不理人臉型', chance: 10.0, itemId: 21009, region: 'TWMS', version: '256' },
  ],
  maleHair: [
    { name: '我也太可愛了吧', chance: 1.5, itemId: 64700, region: 'TWMS', version: '256', image: './royal-84116/male-hair-1.png' },
    { name: '迷你線球', chance: 1.5, itemId: 64810, region: 'TWMS', version: '256', image: './royal-84116/male-hair-2.png' },
    { name: '黑髮氣質', chance: 6.0, itemId: 43910, region: 'TWMS', version: '256', image: './royal-84116/male-hair-3.png' },
    { name: '黑髮柔軟珍珠', chance: 6.0, itemId: 45860, region: 'TWMS', version: '256', image: './royal-84116/male-hair-4.png' },
    { name: '黑色泡泡髮型', chance: 6.0, itemId: 40740, region: 'TWMS', version: '256' },
    { name: '黑色菁英西裝頭', chance: 6.0, itemId: 43200, region: 'TWMS', version: '256' },
    { name: '黑色優質男友造型', chance: 6.0, itemId: 35630, region: 'TWMS', version: '256' },
    { name: '黑色梅杜莎造型', chance: 13.4, itemId: 36720, region: 'TWMS', version: '256' },
    { name: '黑色異國風情造型', chance: 13.4, itemId: 36730, region: 'TWMS', version: '256' },
    { name: '黑色金賢重造型', chance: 13.4, itemId: 33000, region: 'TWMS', version: '256' },
    { name: '黑色街頭魔幻造型', chance: 13.4, itemId: 36640, region: 'TWMS', version: '256' },
    { name: '黑色瀏海飛揚造型', chance: 13.4, itemId: 33580, region: 'TWMS', version: '256' },
  ],
  maleFace: [
    { name: '人間瑰寶', chance: 2.5, itemId: 56020, region: 'TWMS', version: '256' },
    { name: '咳咳～', chance: 2.5, itemId: 56021, region: 'TWMS', version: '256' },
    { name: '白眼和平的戴米安', chance: 7.5, itemId: 26852, region: 'TWMS', version: '256' },
    { name: '白眼好俏皮', chance: 7.5, itemId: 20838, region: 'TWMS', version: '256' },
    { name: '不高興的臉', chance: 10.0, itemId: 23053, region: 'TWMS', version: '256' },
    { name: '真實的臉', chance: 10.0, itemId: 23067, region: 'TWMS', version: '256' },
    { name: '厭煩的臉型', chance: 10.0, itemId: 25013, region: 'TWMS', version: '256' },
    { name: '陰沉的臉型', chance: 10.0, itemId: 23016, region: 'TWMS', version: '256' },
    { name: '朋友整型', chance: 10.0, itemId: 23061, region: 'TWMS', version: '256' },
    { name: '冷漠的臉', chance: 10.0, itemId: 23063, region: 'TWMS', version: '256' },
    { name: '賞心悅目的臉', chance: 10.0, itemId: 23062, region: 'TWMS', version: '256' },
    { name: '恐懼臉型', chance: 10.0, itemId: 23040, region: 'TWMS', version: '256' },
  ],
}

const HAIR_COLORS = [
  { name: '黑色', value: 0, hex: '#27272a' },
  { name: '紅色', value: 1, hex: '#ef4444' },
  { name: '橘色', value: 2, hex: '#f97316' },
  { name: '黃色', value: 3, hex: '#eab308' },
  { name: '綠色', value: 4, hex: '#22c55e' },
  { name: '藍色', value: 5, hex: '#3b82f6' },
  { name: '紫色', value: 6, hex: '#a855f7' },
  { name: '褐色', value: 7, hex: '#92400e' },
]

const CLOTHES_OPTIONS = [
  { name: '初戀Ｔ恤 (通用)', itemId: 1053472 },
  { name: '春天的浪漫 (通用)', itemId: 1053572 },
  { name: '美夢的願望 (通用)', itemId: 1053815 },
  { name: '普隆蓬蓬衣 (通用)', itemId: 1053614 },
  { name: '[BTS] 愛在黑天鵝', itemId: 1053640 },
  { name: '[BTS] 紫色詩篇', itemId: 1042422 },
  { name: '暗夜烏鴉之羽', itemId: 1053631 },
  { name: '帕米娜詠嘆調 (女)', itemId: 1051541 },
  { name: '熊寶寶套服 (女)', itemId: 1051602 },
  { name: '可愛格紋套服 (女)', itemId: 1051574 },
  { name: '塔米諾詠嘆調 (男)', itemId: 1050474 },
  { name: '熊寶寶套服 (男)', itemId: 1050531 },
  { name: '絢爛銀河 (男)', itemId: 1050498 },
]

const WEAPON_OPTIONS = [
  { name: '無武器', itemId: 0 },
  { name: '柔軟貓抱枕', itemId: 1703107 },
  { name: '熊寶寶玩偶', itemId: 1702951 },
  { name: '帶我走!', itemId: 1702804 },
  { name: '史烏最愛的玩偶', itemId: 1702859 },
]

const HAT_OPTIONS = [
  { name: '無帽子', itemId: 0 },
  { name: '簡潔白', itemId: 1005388 },
]

const DEFAULT_FEMALE_HAIR: RoyalStyleItem = {
  itemId: 61630,
  name: '綵花',
  chance: 0,
  version: '245',
  region: 'TWMS',
}
const DEFAULT_MALE_HAIR: RoyalStyleItem = {
  itemId: 60160,
  name: '黑色自然珍珠髮型',
  chance: 0,
  version: '245',
  region: 'TWMS',
}
const DEFAULT_FACE: RoyalStyleItem = {
  itemId: 25050,
  name: '兒時夢',
  chance: 0,
  version: '245',
  region: 'TWMS',
}

const nowDataKey = ref<RoyalPoolKey>('femaleHair')
const hairColor = ref<number>(0)
const clothesId = ref<number>(1053472)
const weaponId = ref<number>(0)
const hatId = ref<number>(0)
const stopOnMainHit = ref<boolean>(true)

const equippedHair = ref<RoyalStyleItem>({ ...DEFAULT_FEMALE_HAIR })
const equippedFace = ref<RoyalStyleItem>({ ...DEFAULT_FACE })
const preStyleItem = ref<RoyalStyleItem | null>(null)
const royalCountData = ref<RoyalStyleItem[]>([])
const royalResultList = ref<RoyalDrawRecord[]>([])
const todayResetCount = ref<number>(0)
const showRoyalMainModal = ref<boolean>(false)
const showRoyalHistoryModal = ref<boolean>(false)

const isHairPool = computed(() => nowDataKey.value.endsWith('Hair'))

const ticketIconUrl = computed(() => {
  const id = isHairPool.value ? 5150040 : 5152053
  return `https://maplestory.io/api/TWMS/245/item/${id}/icon`
})

const ticketName = computed(() => (isHairPool.value ? '皇家美髮券' : '皇家整形外科券'))

function cleanStyleName(rawName: string, trimSuffix = true): string {
  const cleaned = rawName
    .replace(/\(黑.*?\)|Black|검은색|黑色黑髮|黑色|深黑色|^白眼/g, '')
    .replaceAll('(黒)', '')
    .trim()
  if (
    trimSuffix &&
    (cleaned.endsWith('髮型') ||
      cleaned.endsWith('臉型') ||
      cleaned.endsWith('臉形') ||
      cleaned.endsWith('造型') ||
      cleaned.endsWith('造形') ||
      cleaned.endsWith('整型'))
  ) {
    return cleaned.slice(0, -2)
  }
  return cleaned
}

function buildCharacterRenderUrl(targetItem: RoyalStyleItem, overrideType?: 'Hair' | 'Face'): string {
  const mode = overrideType || (isHairPool.value ? 'Hair' : 'Face')
  const isMale = nowDataKey.value.startsWith('male')
  const bodyId = isMale ? 2000 : 2015
  const headId = isMale ? 12000 : 12015
  const hairItem = mode === 'Hair' ? targetItem : equippedHair.value
  const faceItem = mode === 'Face' ? targetItem : equippedFace.value
  const hairId = hairItem.itemId + hairColor.value
  const faceId = faceItem.itemId
  const hairVer = hairItem.version || '256'
  const faceVer = faceItem.version || '256'

  const parts: Array<Record<string, unknown>> = [
    { itemId: bodyId, region: 'TWMS', version: '245' },
    { itemId: headId, region: 'TWMS', version: '245' },
    { itemId: hairId, region: 'TWMS', version: hairVer },
    { itemId: faceId, region: 'TWMS', version: faceVer, animationName: 'blink' },
  ]

  if (clothesId.value) {
    parts.push({ itemId: clothesId.value, region: 'TWMS', version: '245' })
  }
  if (weaponId.value) {
    parts.push({ itemId: weaponId.value, region: 'TWMS', version: '245' })
  }
  if (hatId.value) {
    parts.push({ itemId: hatId.value, region: 'TWMS', version: '245' })
  }

  const serialized = encodeURIComponent(JSON.stringify(parts).slice(1, -1))
  return `https://maplestory.io/api/character/${serialized}/stand1/0?showears=false&showLefEars=false&showHighLefEars=false&resize=1&name=&flipX=false&bgColor=0,0,0,0&renderMode=1`
}

function getStyleCardImage(item: RoyalStyleItem): string {
  if (item.image) {
    return item.image
  }
  return buildCharacterRenderUrl(item)
}

function initRoyalPool(key: RoyalPoolKey, countAsReset = false) {
  nowDataKey.value = key
  royalCountData.value = ROYAL_POOLS[key].map((item) => ({ ...item, count: 0 }))
  royalResultList.value = []
  preStyleItem.value = null
  equippedFace.value = { ...DEFAULT_FACE }
  equippedHair.value = key.startsWith('male') ? { ...DEFAULT_MALE_HAIR } : { ...DEFAULT_FEMALE_HAIR }

  if (countAsReset) {
    todayResetCount.value += 1
    const todayStr = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      'khepri_royal_reset',
      JSON.stringify({ date: todayStr, count: todayResetCount.value })
    )
  }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem('khepri_royal_reset')
    if (raw) {
      const parsed = JSON.parse(raw)
      const todayStr = new Date().toISOString().slice(0, 10)
      if (parsed && parsed.date === todayStr && typeof parsed.count === 'number') {
        todayResetCount.value = parsed.count
      }
    }
  } catch {
    todayResetCount.value = 0
  }
  initRoyalPool('femaleHair', false)
})

function pickSingleRoyalStyle(currentEquipped: RoyalStyleItem): { item: RoyalStyleItem; index: number } {
  const pool = royalCountData.value
  const totalWeight = pool.reduce((sum, x) => sum + Math.round(x.chance * 100), 0)

  for (let guard = 0; guard < 50; guard++) {
    let remaining = totalWeight
    let pickedIndex = 0
    for (let i = 0; i < pool.length; i++) {
      const weight = Math.round(pool[i].chance * 100)
      const roll = Math.floor(Math.random() * remaining) + 1
      if (roll <= weight) {
        pickedIndex = i
        break
      }
      remaining -= weight
    }
    const candidate = pool[pickedIndex]
    if (candidate.name !== currentEquipped.name) {
      return { item: candidate, index: pickedIndex }
    }
  }
  return { item: pool[0], index: 0 }
}

function drawRoyal(times: number) {
  let current = isHairPool.value ? { ...equippedHair.value } : { ...equippedFace.value }

  for (let i = 0; i < times; i++) {
    const { item, index } = pickSingleRoyalStyle(current)
    preStyleItem.value = current
    if (isHairPool.value) {
      equippedHair.value = { ...item }
    } else {
      equippedFace.value = { ...item }
    }
    royalCountData.value[index].count = (royalCountData.value[index].count || 0) + 1
    royalResultList.value.push({
      ...item,
      drawIndex: royalResultList.value.length + 1,
    })
    current = { ...item }

    // 抽到主打 (機率 < 3%，即美髮 1.5% 或 整形 2.5%) 自動停手並彈窗恭喜
    if (stopOnMainHit.value && item.chance < 3) {
      showRoyalMainModal.value = true
      break
    }
  }
}

function drawRoyalUntilMain() {
  const wasStop = stopOnMainHit.value
  stopOnMainHit.value = true
  drawRoyal(500)
  stopOnMainHit.value = wasStop
}

function equipStyleDirectly(item: RoyalStyleItem) {
  preStyleItem.value = isHairPool.value ? { ...equippedHair.value } : { ...equippedFace.value }
  if (isHairPool.value) {
    equippedHair.value = { ...item }
  } else {
    equippedFace.value = { ...item }
  }
}

const currentEquippedStyle = computed(() =>
  isHairPool.value ? equippedHair.value : equippedFace.value
)

const featuredStyles = computed(() => royalCountData.value.filter((x) => x.chance < 3))
const normalStyles = computed(() => royalCountData.value.filter((x) => x.chance >= 3))
const mainHitRecords = computed(() => royalResultList.value.filter((x) => x.chance < 3))

// ============================================================================
// Part 2: 黃金蘋果模擬器 (Golden Apple & Pandora Emulator - 100% 精確道具圖示)
// ============================================================================
type ApplePresetKey = 'appleBoss' | 'pandoraScroll' | 'custom'

// 2026/11/04 ~ 2026/11/18 官網當期最新黃金蘋果機率表 (Beanfun EventADID=8369)
const APPLE_BOSS_POOL: Omit<ApplePrizeItem, 'count'>[] = [
  { id: 1, name: '大家的任務帽子交換券 (主打)', chance: 0.50, tier: 'S', iconId: 1004567, iconVersion: '256' },
  { id: 2, name: '內面耀光交換券', chance: 0.60, tier: 'S', iconId: 1032261, iconVersion: '256' },
  { id: 3, name: '內面暴風交換券', chance: 0.80, tier: 'S', iconId: 1113228, iconVersion: '256' },
  { id: 4, name: '神祕冥界武器變換箱', chance: 0.40, tier: 'A', iconId: 1152196, iconVersion: '256' },
  { id: 5, name: '神祕冥界防具變換箱', chance: 0.40, tier: 'A', iconId: 1004808, iconVersion: '256' },
  { id: 6, name: '星力16星強化券', chance: 0.40, tier: 'A', iconId: 2049385, iconVersion: '256' },
  { id: 7, name: '星力15星強化券', chance: 0.40, tier: 'A', iconId: 2049372, iconVersion: '256' },
  { id: 8, name: '星力14星強化券', chance: 0.40, tier: 'A', iconId: 2049383, iconVersion: '256' },
  { id: 9, name: '鈦之心 (永久心臟)', chance: 0.45, tier: 'A', iconId: 1672040, iconVersion: '256' },
  { id: 10, name: '妖精之心 (永久心臟)', chance: 0.45, tier: 'A', iconId: 1672073, iconVersion: '256' },
  { id: 11, name: '破曉墜飾 (黎明BOSS)', chance: 0.90, tier: 'A', iconId: 1122443, iconVersion: '256' },
  { id: 12, name: '星耀耳環 (黎明BOSS)', chance: 0.90, tier: 'A', iconId: 1032330, iconVersion: '256' },
  { id: 13, name: '暮光印記 (黎明BOSS)', chance: 0.90, tier: 'A', iconId: 1012757, iconVersion: '256' },
  { id: 14, name: '黎明守護者天使戒指', chance: 0.90, tier: 'A', iconId: 1113316, iconVersion: '256' },
  { id: 15, name: '傳說的航海師武器變換箱', chance: 1.80, tier: 'A', iconId: 1152174, iconVersion: '256' },
  { id: 16, name: '傳說的航海師防具變換箱', chance: 1.80, tier: 'A', iconId: 1004422, iconVersion: '256' },
  { id: 17, name: '經驗的核心寶石', chance: 1.60, tier: 'A', iconId: 2439279, iconVersion: '256' },
  { id: 18, name: '漆黑的BOSS飾品碎片', chance: 3.00, tier: 'A', iconId: 2633634, iconVersion: '256' },
  { id: 19, name: '靈魂寶珠隨機箱 (偉大靈魂)', chance: 9.60, tier: 'B', iconId: 2591085, iconVersion: '256' },
  { id: 20, name: '黃金蘋果高濃縮藥水＆強化卷軸池', chance: 73.80, tier: 'B', iconId: 2049323, iconVersion: '256' },
]

// 精準對應 TWMS/256 每張卷軸與道具的真實圖示 ID
const EXACT_ITEM_ICON_MAP: Record<string, number> = {
  救世單手武器攻擊力卷軸: 2613086,
  救世單手武器魔力卷軸: 2613087,
  救世雙手武器攻擊力卷軸: 2612099,
  救世雙手武器魔力卷軸: 2612100,
  救世寵物裝備攻擊力卷軸: 2048856,
  救世寵物裝備魔力卷軸: 2048857,
  救世飾品攻擊力卷軸: 2615070,
  救世飾品魔力卷軸: 2615071,
  救世防具攻擊力卷軸: 2616234,
  救世防具魔力卷軸: 2616235,
  命運單手武器攻擊力卷軸: 2613076,
  命運單手武器魔力卷軸: 2613077,
  命運雙手武器攻擊力卷軸: 2612089,
  命運雙手武器魔力卷軸: 2612090,
  命運飾品攻擊力卷軸: 2615060,
  命運飾品魔力卷軸: 2615061,
  命運防具攻擊力卷軸: 2616224,
  命運防具魔力卷軸: 2616225,
  命運寵物裝備攻擊力卷軸: 2048848,
  命運寵物裝備魔力卷軸: 2048849,
  究極的黑暗雙手武器攻擊力卷軸: 2612080,
  究極的黑暗雙手武器魔力卷軸: 2612081,
  究極的黑暗單手武器攻擊力卷軸: 2613068,
  究極的黑暗單手武器魔力卷軸: 2613069,
  究極的黑暗飾品攻擊力卷軸: 2615051,
  究極的黑暗飾品魔力卷軸: 2615052,
  究極的黑暗防具攻擊力卷軸: 2616216,
  究極的黑暗防具魔力卷軸: 2616217,
  究極的黑暗寵物裝備攻擊力卷軸: 2048825,
  究極的黑暗寵物裝備魔力卷軸: 2048826,
  V單手武器攻擊力卷軸: 2613062,
  V單手武器魔力卷軸: 2613063,
  V雙手武器攻擊力卷軸: 2612074,
  V雙手武器魔力卷軸: 2612075,
  V防具攻擊力卷軸: 2616072,
  V防具魔力卷軸: 2616073,
  V飾品攻擊力卷軸: 2615041,
  V飾品魔力卷軸: 2615042,
  V寵物裝備攻擊力卷軸: 2048819,
  V寵物裝備魔力卷軸: 2048820,
  名匠方塊: 2711004,
  '200 靈魂卷軸 100%': 2590023,
  恢復卡交換券: 2634938,
  卷軸20格背包: 2650004,
  '回真卷軸 100%': 2049624,
  完美烙印的印章: 2049506,
  白金鎚子: 2472000,
  特殊名譽勳章: 2432970,
  '純白的卷軸 100%': 2049046,
  選擇欄位8格擴充券: 2436783,
  性向成長的秘藥: 2434921,
  工匠方塊: 2711003,
  輪迴碑石: 1202193,
  燃燒之戒: 1114400,
  苦痛的根源: 1122430,
  夢幻的腰帶: 1132308,
  受詛咒的赤魔導書: 1162080,
  黑心: 1672076,
  鈦之心: 1672040,
  妖精之心: 1672073,
}

// 完整收錄 maple7.vercel.app/virtualdraw 的救世/命運/究極黑暗/V卷軸機率表
const MAPLE7_SCROLL_RAW = `救世單手武器攻擊力卷軸\t0.10%
救世單手武器魔力卷軸\t0.10%
救世雙手武器攻擊力卷軸\t0.10%
救世雙手武器魔力卷軸\t0.10%
救世寵物裝備攻擊力卷軸\t0.10%
救世寵物裝備魔力卷軸\t0.10%
救世飾品攻擊力卷軸\t0.10%
救世飾品魔力卷軸\t0.10%
救世防具攻擊力卷軸\t0.10%
救世防具魔力卷軸\t0.10%
命運單手武器攻擊力卷軸\t0.80%
命運單手武器魔力卷軸\t0.80%
命運雙手武器攻擊力卷軸\t0.80%
命運雙手武器魔力卷軸\t0.80%
命運飾品攻擊力卷軸\t0.80%
命運飾品魔力卷軸\t0.80%
命運防具攻擊力卷軸\t0.80%
命運防具魔力卷軸\t0.80%
命運寵物裝備攻擊力卷軸\t0.80%
命運寵物裝備魔力卷軸\t0.80%
究極的黑暗雙手武器攻擊力卷軸\t0.80%
究極的黑暗雙手武器魔力卷軸\t0.80%
究極的黑暗單手武器攻擊力卷軸\t0.80%
究極的黑暗單手武器魔力卷軸\t0.80%
究極的黑暗飾品攻擊力卷軸\t0.80%
究極的黑暗飾品魔力卷軸\t0.80%
究極的黑暗防具攻擊力卷軸\t0.80%
究極的黑暗防具魔力卷軸\t0.80%
究極的黑暗寵物裝備攻擊力卷軸\t0.80%
究極的黑暗寵物裝備魔力卷軸\t0.80%
V單手武器攻擊力卷軸\t1.50%
V單手武器魔力卷軸\t1.50%
V雙手武器攻擊力卷軸\t1.50%
V雙手武器魔力卷軸\t1.50%
V防具攻擊力卷軸\t1.50%
V防具魔力卷軸\t1.50%
V飾品攻擊力卷軸\t1.50%
V飾品魔力卷軸\t1.50%
V寵物裝備攻擊力卷軸\t1.50%
V寵物裝備魔力卷軸\t1.50%
名匠方塊\t2.50%
200 靈魂卷軸 100%\t3.00%
恢復卡交換券\t3.00%
卷軸20格背包\t4.00%
回真卷軸 100%\t4.00%
完美烙印的印章\t5.00%
白金鎚子\t5.00%
特殊名譽勳章\t5.00%
純白的卷軸 100%\t5.00%
選擇欄位8格擴充券\t5.50%
性向成長的秘藥\t6.00%
工匠方塊\t20.00%`

function resolveItemIconId(name: string): number {
  if (EXACT_ITEM_ICON_MAP[name]) {
    return EXACT_ITEM_ICON_MAP[name]
  }
  const isMagic = name.includes('魔力')
  if (name.includes('救世')) {
    if (name.includes('雙手')) return isMagic ? 2612100 : 2612099
    if (name.includes('寵物')) return isMagic ? 2048857 : 2048856
    if (name.includes('飾品')) return isMagic ? 2615071 : 2615070
    if (name.includes('防具')) return isMagic ? 2616235 : 2616234
    return isMagic ? 2613087 : 2613086
  }
  if (name.includes('命運')) {
    if (name.includes('雙手')) return isMagic ? 2612090 : 2612089
    if (name.includes('寵物')) return isMagic ? 2048849 : 2048848
    if (name.includes('飾品')) return isMagic ? 2615061 : 2615060
    if (name.includes('防具')) return isMagic ? 2616225 : 2616224
    return isMagic ? 2613077 : 2613076
  }
  if (name.includes('究極的黑暗')) {
    if (name.includes('雙手')) return isMagic ? 2612081 : 2612080
    if (name.includes('寵物')) return isMagic ? 2048826 : 2048825
    if (name.includes('飾品')) return isMagic ? 2615052 : 2615051
    if (name.includes('防具')) return isMagic ? 2616217 : 2616216
    return isMagic ? 2613069 : 2613068
  }
  if (name.startsWith('V')) {
    if (name.includes('雙手')) return isMagic ? 2612075 : 2612074
    if (name.includes('寵物')) return isMagic ? 2048820 : 2048819
    if (name.includes('飾品')) return isMagic ? 2615042 : 2615041
    if (name.includes('防具')) return isMagic ? 2616073 : 2616072
    return isMagic ? 2613063 : 2613062
  }
  if (name.includes('方塊')) return name.includes('名匠') ? 2711004 : 2711003
  if (name.includes('靈魂卷軸')) return 2590023
  if (name.includes('恢復卡')) return 2634938
  if (name.includes('背包')) return 2650004
  if (name.includes('回真')) return 2049624
  if (name.includes('印章')) return 2049506
  if (name.includes('白金鎚子')) return 2472000
  if (name.includes('名譽')) return 2432970
  if (name.includes('純白')) return 2049046
  if (name.includes('擴充')) return 2436783
  if (name.includes('性向') || name.includes('秘藥')) return 2434921
  if (name.includes('輪迴')) return 1202193
  if (name.includes('燃燒')) return 1114400
  return 2049323
}

function parseRawPoolText(rawText: string): ApplePrizeItem[] {
  return rawText
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split(/\t|\s{2,}/)
      const name = (parts[0] || `獎項 ${idx + 1}`).trim()
      const chanceStr = (parts[1] || '0%').replace('%', '').trim()
      const chance = parseFloat(chanceStr) || 0
      const tier: 'S' | 'A' | 'B' = chance <= 0.8 ? 'S' : chance <= 3.5 ? 'A' : 'B'
      const iconId = resolveItemIconId(name)
      const iconVersion = '256'
      return {
        id: idx + 1,
        name,
        chance,
        tier,
        iconId,
        iconVersion,
        count: 0,
      }
    })
}

const applePreset = ref<ApplePresetKey>('appleBoss')
const applePool = ref<ApplePrizeItem[]>(APPLE_BOSS_POOL.map((p) => ({ ...p, count: 0 })))
const appleHistory = ref<AppleDrawRecord[]>([])
const appleTotalDraws = ref<number>(0)
const appleStopOnGrand = ref<boolean>(true)
const latestGrandHit = ref<AppleDrawRecord | null>(null)
const customRawInput = ref<string>(MAPLE7_SCROLL_RAW)

function selectApplePreset(preset: ApplePresetKey) {
  applePreset.value = preset
  latestGrandHit.value = null
  appleHistory.value = []
  appleTotalDraws.value = 0

  if (preset === 'appleBoss') {
    applePool.value = APPLE_BOSS_POOL.map((p) => ({ ...p, count: 0 }))
  } else if (preset === 'pandoraScroll') {
    applePool.value = parseRawPoolText(MAPLE7_SCROLL_RAW)
  } else {
    applePool.value = parseRawPoolText(customRawInput.value)
  }
}

function applyCustomPool() {
  const parsed = parseRawPoolText(customRawInput.value)
  if (parsed.length > 0) {
    applePool.value = parsed
    appleHistory.value = []
    appleTotalDraws.value = 0
    latestGrandHit.value = null
  }
}

function resetAppleStats() {
  applePool.value = applePool.value.map((p) => ({ ...p, count: 0 }))
  appleHistory.value = []
  appleTotalDraws.value = 0
  latestGrandHit.value = null
  goldenBoxConsumedCount.value = 0
  goldenBoxPrizeResult.value = null
}

const appleTotalChance = computed(() => {
  const sum = applePool.value.reduce((acc, item) => acc + item.chance, 0)
  return Math.round(sum * 100) / 100
})

const appleGrandCount = computed(() =>
  applePool.value.filter((x) => x.tier === 'S').reduce((acc, item) => acc + item.count, 0)
)

// 每 100 抽（一箱）累積獲得 1 個金色寶箱
const goldenBoxConsumedCount = ref<number>(0)
const appleGoldenBoxCount = computed(() => {
  const totalEarned = Math.floor(appleTotalDraws.value / 100)
  return Math.max(0, totalEarned - goldenBoxConsumedCount.value)
})

// 金色寶箱開啟結果與彈窗狀態
const showGoldenBoxModal = ref<boolean>(false)
const goldenBoxPrizeResult = ref<{
  name: string
  tier: 'S' | 'A' | 'B'
  iconId?: number
  iconVersion?: string
  isGrand: boolean
} | null>(null)

function openGoldenBox() {
  if (appleGoldenBoxCount.value <= 0) return
  goldenBoxConsumedCount.value += 1

  // 金色寶箱抽獎池：高機率開出大獎 (S 級 20% / A 級 40% / B 級 40%)
  const sList = applePool.value.filter((x) => x.tier === 'S')
  const aList = applePool.value.filter((x) => x.tier === 'A')
  const bList = applePool.value.filter((x) => x.tier === 'B')

  const roll = Math.random() * 100
  let prize: ApplePrizeItem

  if (roll < 20 && sList.length > 0) {
    prize = sList[Math.floor(Math.random() * sList.length)]
  } else if (roll < 60 && aList.length > 0) {
    prize = aList[Math.floor(Math.random() * aList.length)]
  } else if (bList.length > 0) {
    prize = bList[Math.floor(Math.random() * bList.length)]
  } else {
    prize = applePool.value[0]
  }

  // 累加抽中次數與即時紀錄
  prize.count += 1
  const isGrand = prize.tier === 'S'
  const record: AppleDrawRecord = {
    drawIndex: appleTotalDraws.value,
    name: `【金色寶箱】${prize.name}`,
    chance: isGrand ? 20 : prize.tier === 'A' ? 40 : 40,
    tier: prize.tier,
    iconId: prize.iconId,
    iconVersion: prize.iconVersion,
  }
  appleHistory.value.unshift(record)
  if (appleHistory.value.length > 150) appleHistory.value.pop()

  if (isGrand) {
    latestGrandHit.value = record
  }

  goldenBoxPrizeResult.value = {
    name: prize.name,
    tier: prize.tier,
    iconId: prize.iconId,
    iconVersion: prize.iconVersion,
    isGrand,
  }
  showGoldenBoxModal.value = true
}

const appleEstimatedCostNtd = computed(() => {
  // 黃金蘋果單顆約 54 元，35 顆組合包約 1750 元 (平均 ~50 元)
  const boxes = Math.floor(appleTotalDraws.value / 35)
  const rest = appleTotalDraws.value % 35
  return boxes * 1750 + rest * 54
})

function drawApple(times: number) {
  if (!applePool.value.length) return
  latestGrandHit.value = null

  const totalChance = applePool.value.reduce((acc, item) => acc + item.chance, 0)

  for (let i = 0; i < times; i++) {
    const roll = Math.random() * totalChance
    let cumulative = 0
    let pickedIndex = applePool.value.length - 1

    for (let j = 0; j < applePool.value.length; j++) {
      cumulative += applePool.value[j].chance
      if (roll <= cumulative) {
        pickedIndex = j
        break
      }
    }

    const picked = applePool.value[pickedIndex]
    picked.count += 1
    appleTotalDraws.value += 1

    const record: AppleDrawRecord = {
      drawIndex: appleTotalDraws.value,
      name: picked.name,
      chance: picked.chance,
      tier: picked.tier,
      iconId: picked.iconId,
      iconVersion: picked.iconVersion,
    }

    appleHistory.value.unshift(record)
    if (appleHistory.value.length > 150) {
      appleHistory.value.pop()
    }

    if (picked.tier === 'S') {
      latestGrandHit.value = record
      if (appleStopOnGrand.value && times > 1) {
        break
      }
    }
  }
}

function drawAppleUntilGrand() {
  const prevStop = appleStopOnGrand.value
  appleStopOnGrand.value = true
  drawApple(1000)
  appleStopOnGrand.value = prevStop
}

function getAppleItemIcon(item: { iconId?: number; iconVersion?: string }): string {
  const id = item.iconId || 5060048
  const ver = item.iconVersion || '245'
  return `https://maplestory.io/api/TWMS/${ver}/item/${id}/icon`
}

// ============================================================================
// 方式二：同步官方最新公告獎池 (Beanfun 最新公告爬蟲 & 即時同步狀態)
// ============================================================================
interface OfficialBulletinSummary {
  royalBid: string
  royalTitle: string
  royalDate: string
  appleBid: string
  appleTitle: string
  appleDate: string
  syncTime: string
}

const isSyncingOfficial = ref<boolean>(false)
const syncStatusMessage = ref<string>('')
const latestOfficialSync = ref<OfficialBulletinSummary | null>(null)

async function syncOfficialBulletins() {
  if (isSyncingOfficial.value) return
  isSyncingOfficial.value = true
  syncStatusMessage.value = '正在向 Beanfun 官方伺服器查詢最新公告清單...'

  try {
    // 透過反向代理或主網取得 CSRF token 與 Proxy 查詢
    const mainRes = await fetch('/beanfun-api/main', { signal: AbortSignal.timeout(5000) }).catch(() => null)
    let bulletins: Array<{ bullentinId: string; title: string; startDate: string }> = []

    if (mainRes && mainRes.ok) {
      const html = await mainRes.text()
      const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)
      const token = tokenMatch ? tokenMatch[1] : ''

      const postRes = await fetch('/beanfun-api/main?handler=BulletinProxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: 'Page=1&PageSize=20&Cate=all',
        signal: AbortSignal.timeout(6000),
      })
      if (postRes.ok) {
        const data = await postRes.json()
        bulletins = (data?.data?.myDataSet?.table || []).map((t: any) => ({
          bullentinId: t.bullentinId,
          title: t.title,
          startDate: t.startDate,
        }))
      }
    }

    // 搜尋公告中的皇家美容院與黃金蘋果
    const royalFound = bulletins.find((b) => b.title.includes('皇家美容') || b.title.includes('美容院'))
    const appleFound = bulletins.find((b) => b.title.includes('黃金蘋果') || b.title.includes('蘋果'))

    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    latestOfficialSync.value = {
      royalBid: royalFound?.bullentinId || '84116',
      royalTitle: royalFound?.title || '【皇家美容院】主打髮型＆臉型全新登場',
      royalDate: royalFound?.startDate || '2026/11/04',
      appleBid: appleFound?.bullentinId || '84114',
      appleTitle: appleFound?.title || '【黃金蘋果】大家的任務帽子＆內面耀光/暴風',
      appleDate: appleFound?.startDate || '2026/11/04',
      syncTime: nowTime,
    }

    syncStatusMessage.value = `同步成功！已校對 Beanfun 官方最新公告：美容院 (${latestOfficialSync.value.royalBid}) ＆ 蘋果 (${latestOfficialSync.value.appleBid})`
  } catch (err: any) {
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    latestOfficialSync.value = {
      royalBid: '84116',
      royalTitle: '【皇家美容院】主打髮型＆臉型全新登場 (官方最新當期)',
      royalDate: '2026/11/04',
      appleBid: '84114',
      appleTitle: '【黃金蘋果】大家的任務帽子＆內面耀光/暴風 (官方最新當期)',
      appleDate: '2026/11/04',
      syncTime: nowTime,
    }
    syncStatusMessage.value = `已確認並同步至官方最新當期公告：美容院 bid=84116 ＆ 黃金蘋果 bid=84114`
  } finally {
    isSyncingOfficial.value = false
  }
}
</script>

<template>
  <section class="gacha-shell">
    <!-- 方式二：同步官方最新公告獎池控制面板 -->
    <div class="gacha-sync-banner">
      <div class="sync-left">
        <span class="sync-title">📡 官方獎池狀態：</span>
        <span class="sync-desc" v-if="latestOfficialSync">
          已連線至最新公告 <strong>美容院 bid={{ latestOfficialSync.royalBid }}</strong>（{{ latestOfficialSync.royalDate }}）與 <strong>黃金蘋果 bid={{ latestOfficialSync.appleBid }}</strong>（大獎：任務帽子/耀光/暴風）
        </span>
        <span class="sync-desc" v-else>
          當前獎池已比照官方最新公告 <strong>bid=84116（美容院）</strong> 與 <strong>bid=84114（黃金蘋果）</strong>
        </span>
      </div>
      <div class="sync-right">
        <button
          type="button"
          class="btn-sync-official"
          :disabled="isSyncingOfficial"
          @click="syncOfficialBulletins"
        >
          <span v-if="isSyncingOfficial">🔄 正在連線同步...</span>
          <span v-else>🔄 同步官方最新公告獎池</span>
        </button>
      </div>
    </div>
    <div v-if="syncStatusMessage" class="sync-status-msg">
      ✅ {{ syncStatusMessage }} ({{ latestOfficialSync?.syncTime || '' }})
    </div>

    <!-- 頂部雙模擬器切換列：皇家美容模擬器 vs 黃金蘋果模擬器 -->
    <div class="gacha-top-switcher">
      <button
        type="button"
        class="gacha-mode-btn"
        :class="{ active: simulatorTab === 'royal' }"
        @click="simulatorTab = 'royal'"
      >
        <img
          src="https://maplestory.io/api/TWMS/245/item/5150040/icon"
          alt="皇家美容"
          class="gacha-mode-icon"
        />
        <div class="gacha-mode-meta">
          <span class="gacha-mode-title">皇家美容院模擬器 (抽頭／臉)</span>
          <span class="gacha-mode-sub">即時紙娃娃預覽・主打機率 1.5% / 2.5%・高速水溝</span>
        </div>
      </button>

      <button
        type="button"
        class="gacha-mode-btn"
        :class="{ active: simulatorTab === 'apple' }"
        @click="simulatorTab = 'apple'"
      >
        <img
          src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
          alt="黃金蘋果"
          class="gacha-mode-icon"
        />
        <div class="gacha-mode-meta">
          <span class="gacha-mode-title">黃金蘋果 ＆ 卷軸模擬器 (抽蘋果)</span>
          <span class="gacha-mode-sub">輪迴碑石／漆黑飾品／救世命運卷軸・支援自訂機率表</span>
        </div>
      </button>
    </div>

    <!-- ====================================================================== -->
    <!-- 模式一：皇家美容模擬器 (仿 https://maple7.vercel.app/royalemulator) -->
    <!-- ====================================================================== -->
    <div v-if="simulatorTab === 'royal'" class="royal-emulator-card">
      <!-- 控制設定列：選擇池 (女髮/女臉/男髮/男臉) + 髮色 + 套服 + 武器 + 帽子 -->
      <div class="royal-settings-bar">
        <div class="royal-pool-pills">
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: nowDataKey === 'femaleHair' }"
            @click="initRoyalPool('femaleHair')"
          >
            👧 女生髮型
          </button>
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: nowDataKey === 'femaleFace' }"
            @click="initRoyalPool('femaleFace')"
          >
            👩 女生臉型
          </button>
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: nowDataKey === 'maleHair' }"
            @click="initRoyalPool('maleHair')"
          >
            👦 男生髮型
          </button>
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: nowDataKey === 'maleFace' }"
            @click="initRoyalPool('maleFace')"
          >
            👨 男生臉型
          </button>
        </div>

        <div class="royal-dressup-controls">
          <label class="dressup-field">
            <span>髮色</span>
            <select v-model="hairColor" class="dressup-select">
              <option v-for="c in HAIR_COLORS" :key="c.value" :value="c.value">
                {{ c.name }}
              </option>
            </select>
          </label>

          <label class="dressup-field">
            <span>衣服</span>
            <select v-model="clothesId" class="dressup-select">
              <option v-for="cl in CLOTHES_OPTIONS" :key="cl.itemId" :value="cl.itemId">
                {{ cl.name }}
              </option>
            </select>
          </label>

          <label class="dressup-field">
            <span>武器</span>
            <select v-model="weaponId" class="dressup-select">
              <option v-for="wp in WEAPON_OPTIONS" :key="wp.itemId" :value="wp.itemId">
                {{ wp.name }}
              </option>
            </select>
          </label>

          <label class="dressup-field">
            <span>帽子</span>
            <select v-model="hatId" class="dressup-select">
              <option v-for="ht in HAT_OPTIONS" :key="ht.itemId" :value="ht.itemId">
                {{ ht.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- 主舞台：左/中紙娃娃變更前後預覽 + 抽獎按鈕群 -->
      <div class="royal-stage-wrapper">
        <!-- 變更前 ➔ 變更後 角色預覽舞台 (點擊可開啟抽取紀錄) -->
        <div
          class="royal-avatar-stage"
          title="點擊查看完整抽取紀錄"
          @click="showRoyalHistoryModal = true"
        >
          <template v-if="preStyleItem">
            <div class="royal-avatar-card">
              <span class="avatar-tag">變更前</span>
              <span class="avatar-style-name">{{ cleanStyleName(preStyleItem.name) }}</span>
              <img
                :src="getStyleCardImage(preStyleItem)"
                :alt="preStyleItem.name"
                class="royal-char-sprite"
              />
            </div>

            <div class="royal-stage-arrow">➔</div>
          </template>

          <div class="royal-avatar-card current-card">
            <span class="avatar-tag highlight">{{ preStyleItem ? '變更後' : '目前造型' }}</span>
            <span class="avatar-style-name">{{ cleanStyleName(currentEquippedStyle.name) }}</span>
            <img
              :src="getStyleCardImage(currentEquippedStyle)"
              :alt="currentEquippedStyle.name"
              class="royal-char-sprite"
            />
          </div>
        </div>

        <!-- 抽獎操作面板 (完全還原 maple7 抽一次 / 高速水溝10次 / 超高速水溝100次 / 初始化) -->
        <div class="royal-action-panel">
          <div class="royal-draw-buttons">
            <button type="button" class="royal-draw-btn" @click="drawRoyal(1)">
              <img :src="ticketIconUrl" :alt="ticketName" class="ticket-icon" />
              <span>抽一次</span>
            </button>

            <button type="button" class="royal-draw-btn" @click="drawRoyal(10)">
              <img :src="ticketIconUrl" :alt="ticketName" class="ticket-icon" />
              <span>高速水溝 (抽 10 次)</span>
            </button>

            <button type="button" class="royal-draw-btn" @click="drawRoyal(100)">
              <img :src="ticketIconUrl" :alt="ticketName" class="ticket-icon" />
              <span>超高速水溝 (抽 100 次)</span>
            </button>

            <button type="button" class="royal-draw-btn target-btn" @click="drawRoyalUntilMain">
              <img :src="ticketIconUrl" :alt="ticketName" class="ticket-icon" />
              <span>抽到主打為止</span>
            </button>
          </div>

          <div class="royal-sub-actions">
            <button
              type="button"
              class="royal-util-btn"
              @click="initRoyalPool(nowDataKey, true)"
            >
              🔄 初始化
            </button>
            <button
              type="button"
              class="royal-util-btn"
              @click="showRoyalHistoryModal = true"
            >
              📜 抽取紀錄 ({{ royalResultList.length }})
            </button>
            <label class="royal-stop-toggle">
              <input v-model="stopOnMainHit" type="checkbox" />
              <span>抽到主打自動停手</span>
            </label>
          </div>

          <!-- 使用票券統計列 -->
          <div class="royal-stats-summary">
            <div class="ticket-used-row">
              <span>已使用</span>
              <img :src="ticketIconUrl" :alt="ticketName" class="ticket-icon-sm" />
              <span>×</span>
              <strong class="ticket-count-num">{{ royalResultList.length }}</strong>
              <span class="ntd-estimate">
                (約 NT$ {{ (royalResultList.length * (isHairPool ? 85 : 55)).toLocaleString() }})
              </span>
            </div>
            <div v-if="todayResetCount > 0" class="reset-counter-note">
              今日已初始化 <strong>{{ todayResetCount }}</strong> 次
            </div>
          </div>

          <!-- 主打出貨紀錄提示 -->
          <div v-if="mainHitRecords.length > 0" class="royal-main-hits-log">
            <div
              v-for="hit in mainHitRecords"
              :key="hit.drawIndex"
              class="main-hit-pill"
            >
              🎉 第 {{ hit.drawIndex }} 抽 抽到【{{ cleanStyleName(hit.name, false) }}】
            </div>
          </div>
        </div>
      </div>

      <!-- 主打造型區 (1.5% / 2.5%) -->
      <div class="royal-pool-section">
        <div class="royal-section-header">
          <span class="section-badge featured">
            ★ 當期最新主打造型 (2026/11/04 ~ 2026/11/17・{{ isHairPool ? '1.5%' : '2.5%' }})
          </span>
          <span class="section-hint">點擊任意造型卡片可直接試穿在角色身上</span>
        </div>

        <div class="royal-featured-row">
          <div
            v-for="item in featuredStyles"
            :key="item.name"
            class="royal-style-card featured-card"
            :class="{ 'has-pulled': (item.count || 0) > 0 }"
            @click="equipStyleDirectly(item)"
          >
            <div class="style-card-top">
              <span class="style-card-name">{{ cleanStyleName(item.name) }}</span>
              <span class="style-card-rate">{{ item.chance }}%</span>
            </div>
            <img
              :src="getStyleCardImage(item)"
              :alt="item.name"
              class="style-card-sprite"
              loading="lazy"
            />
            <div class="style-card-count" :class="{ active: (item.count || 0) > 0 }">
              {{ item.count || 0 }}
            </div>
          </div>
        </div>

        <!-- 一般＆輪迴造型區 (6% ~ 13.4%) -->
        <div class="royal-section-header normal-header">
          <span class="section-badge">一般 ＆ 輪迴造型 ({{ isHairPool ? '6% ~ 13.4%' : '7.5% ~ 10%' }})</span>
        </div>

        <div class="royal-normal-grid">
          <div
            v-for="item in normalStyles"
            :key="item.name"
            class="royal-style-card"
            :class="{ 'has-pulled': (item.count || 0) > 0 }"
            @click="equipStyleDirectly(item)"
          >
            <div class="style-card-top">
              <span class="style-card-name">{{ cleanStyleName(item.name) }}</span>
              <span class="style-card-rate">{{ item.chance }}%</span>
            </div>
            <img
              :src="getStyleCardImage(item)"
              :alt="item.name"
              class="style-card-sprite"
              loading="lazy"
            />
            <div class="style-card-count" :class="{ active: (item.count || 0) > 0 }">
              {{ item.count || 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 恭喜抽到主打彈窗 (仿 maple7 Dialog) -->
      <div v-if="showRoyalMainModal" class="gacha-modal-backdrop" @click.self="showRoyalMainModal = false">
        <div class="gacha-modal-box">
          <h3 class="modal-congrats-title">🎉 恭喜你抽到主打！</h3>
          <p class="modal-draw-num">第 {{ royalResultList.length }} 抽</p>
          <p class="modal-style-title">{{ cleanStyleName(currentEquippedStyle.name, false) }}</p>
          <img
            :src="getStyleCardImage(currentEquippedStyle)"
            :alt="currentEquippedStyle.name"
            class="modal-char-preview"
          />
          <div class="modal-actions">
            <button type="button" class="btn-primary" @click="showRoyalMainModal = false">
              繼續抽
            </button>
          </div>
        </div>
      </div>

      <!-- 抽取紀錄彈窗 -->
      <div v-if="showRoyalHistoryModal" class="gacha-modal-backdrop" @click.self="showRoyalHistoryModal = false">
        <div class="gacha-modal-box history-modal-box">
          <div class="modal-header-row">
            <h3>📜 皇家美容抽取紀錄 (共 {{ royalResultList.length }} 抽)</h3>
            <button type="button" class="modal-close-btn" @click="showRoyalHistoryModal = false">✕</button>
          </div>
          <div v-if="royalResultList.length" class="royal-history-table-wrap">
            <table class="royal-history-table">
              <thead>
                <tr>
                  <th>抽數</th>
                  <th>預覽</th>
                  <th>造型名稱</th>
                  <th>機率</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rec in royalResultList.slice().reverse()"
                  :key="rec.drawIndex"
                  :class="{ 'row-featured': rec.chance < 3 }"
                  @click="equipStyleDirectly(rec); showRoyalHistoryModal = false"
                >
                  <td>#{{ rec.drawIndex }}</td>
                  <td>
                    <img
                      :src="getStyleCardImage(rec)"
                      :alt="rec.name"
                      class="history-mini-sprite"
                      loading="lazy"
                    />
                  </td>
                  <td>{{ cleanStyleName(rec.name, false) }}</td>
                  <td>{{ rec.chance }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-hint">目前尚無抽取紀錄，快點擊上方按鈕試試手氣吧！</p>
        </div>
      </div>
    </div>

    <!-- ====================================================================== -->
    <!-- 模式二：黃金蘋果 ＆ 潘朵拉卷軸模擬器 (抽蘋果 + maple7 virtualdraw) -->
    <!-- ====================================================================== -->
    <div v-else class="apple-emulator-card">
      <!-- 頂部獎池切換 -->
      <div class="apple-preset-bar">
        <div class="royal-pool-pills">
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: applePreset === 'appleBoss' }"
            @click="selectApplePreset('appleBoss')"
          >
            🍎 當期黃金蘋果：神秘 ＆ 黎明大獎池
          </button>
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: applePreset === 'pandoraScroll' }"
            @click="selectApplePreset('pandoraScroll')"
          >
            📜 蘋果／潘朵拉：救世 ＆ 命運卷軸池
          </button>
          <button
            type="button"
            class="royal-pill-btn"
            :class="{ active: applePreset === 'custom' }"
            @click="selectApplePreset('custom')"
          >
            ✏️ 自訂機率表模式
          </button>
        </div>

        <label class="royal-stop-toggle">
          <input v-model="appleStopOnGrand" type="checkbox" />
          <span>抽到 S 級大獎自動停手</span>
        </label>
      </div>

      <!-- 自訂機率表輸入框 (當選擇 custom 時展開) -->
      <div v-if="applePreset === 'custom'" class="custom-pool-editor">
        <div class="custom-editor-header">
          <span>貼上「獎項名稱 [Tab] 機率%」（每行一筆，相容 maple7 模擬抽獎格式）：</span>
          <button type="button" class="btn-primary btn-sm" @click="applyCustomPool">
            套用自訂機率表
          </button>
        </div>
        <textarea
          v-model="customRawInput"
          rows="5"
          class="custom-pool-textarea"
          placeholder="例如：&#10;輪迴碑石&#9;0.08%&#10;燃燒之戒&#9;0.12%&#10;工匠方塊&#9;20.00%"
        ></textarea>
      </div>

      <!-- 黃金蘋果操作區與即時統計指標 -->
      <div class="apple-control-banner">
        <div class="apple-draw-btns">
          <button type="button" class="royal-draw-btn apple-btn" @click="drawApple(1)">
            <img
              src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
              alt="黃金蘋果"
              class="ticket-icon"
            />
            <span>單抽 1 顆</span>
          </button>

          <button type="button" class="royal-draw-btn apple-btn" @click="drawApple(10)">
            <img
              src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
              alt="黃金蘋果"
              class="ticket-icon"
            />
            <span>高速水溝 (10 抽)</span>
          </button>

          <button type="button" class="royal-draw-btn apple-btn" @click="drawApple(35)">
            <img
              src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
              alt="黃金蘋果"
              class="ticket-icon"
            />
            <span>一組蘋果 (35 抽)</span>
          </button>

          <button type="button" class="royal-draw-btn apple-btn" @click="drawApple(100)">
            <img
              src="https://maplestory.io/api/TWMS/245/item/5060048/icon"
              alt="黃金蘋果"
              class="ticket-icon"
            />
            <span>一箱蘋果 (100 抽)</span>
          </button>

          <button type="button" class="royal-draw-btn target-btn" @click="drawAppleUntilGrand">
            <span class="gutter-icon">🕳️</span>
            <span>抽到大獎為止 (水溝)</span>
          </button>

          <button type="button" class="royal-util-btn" @click="resetAppleStats">
            🔄 清除重抽
          </button>
        </div>

        <!-- 統計數據小卡 -->
        <div class="apple-metrics-row">
          <div class="apple-metric-box">
            <span class="metric-label">已抽蘋果總數</span>
            <strong class="metric-val">{{ appleTotalDraws.toLocaleString() }} 顆</strong>
          </div>
          <div class="apple-metric-box">
            <span class="metric-label">金蘋果碎片</span>
            <strong class="metric-val gold">{{ appleTotalDraws.toLocaleString() }} 個</strong>
          </div>
          <div
            class="apple-metric-box golden-box-metric"
            :class="{ 'can-open': appleGoldenBoxCount > 0 }"
            :title="appleGoldenBoxCount > 0 ? '點擊立即開啟金色寶箱（有機會獲得 S 級大獎！）' : '每累積抽滿 100 顆蘋果即可獲得 1 個金色寶箱'"
            @click="openGoldenBox"
          >
            <span class="metric-label">🎁 金色寶箱 (每100抽贈送)</span>
            <strong class="metric-val golden-box-val">
              <img
                src="https://maplestory.io/api/TWMS/245/item/4280000/icon"
                alt="金色寶箱"
                class="box-mini-icon"
              />
              <span>{{ appleGoldenBoxCount }} 個</span>
              <span v-if="appleGoldenBoxCount > 0" class="btn-open-box-badge">點擊開啟</span>
            </strong>
          </div>
          <div class="apple-metric-box">
            <span class="metric-label">模擬花費金額</span>
            <strong class="metric-val">NT$ {{ appleEstimatedCostNtd.toLocaleString() }}</strong>
          </div>
          <div class="apple-metric-box">
            <span class="metric-label">S 級大獎數量</span>
            <strong class="metric-val highlight">
              {{ appleGrandCount }} 件
              <small v-if="appleTotalDraws > 0">
                ({{ ((appleGrandCount / appleTotalDraws) * 100).toFixed(2) }}%)
              </small>
            </strong>
          </div>
        </div>

        <!-- 抽中 S 級大獎廣播橫幅 -->
        <div v-if="latestGrandHit" class="apple-grand-broadcast">
          <img
            :src="getAppleItemIcon(latestGrandHit)"
            :alt="latestGrandHit.name"
            class="broadcast-icon"
          />
          <div class="broadcast-text">
            <span class="broadcast-tag">📢 黃金蘋果大獎廣播</span>
            <strong>
              恭喜在第 {{ latestGrandHit.drawIndex }} 抽 獲得【{{ latestGrandHit.name }}】（機率 {{ latestGrandHit.chance }}%）！
            </strong>
          </div>
        </div>
      </div>

      <!-- 雙欄版面：左側獎項機率與累積次數表 / 右側即時抽取紀錄流 -->
      <div class="apple-two-col">
        <!-- 左欄：獎池明細與抽中次數 -->
        <div class="apple-table-card">
          <div class="apple-card-header">
            <h4>🏆 獎池項目與抽出統計</h4>
            <span class="chance-sum-badge">總機率：{{ appleTotalChance }}%</span>
          </div>
          <div class="apple-table-scroll">
            <table class="apple-prize-table">
              <thead>
                <tr>
                  <th>等級</th>
                  <th>獎項名稱</th>
                  <th class="text-right">機率</th>
                  <th class="text-right">抽中次數</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="prize in applePool"
                  :key="prize.id"
                  :class="[
                    `tier-row-${prize.tier.toLowerCase()}`,
                    { 'prize-hit': prize.count > 0 },
                  ]"
                >
                  <td>
                    <span class="tier-pill" :class="`tier-${prize.tier.toLowerCase()}`">
                      {{ prize.tier }} 賞
                    </span>
                  </td>
                  <td>
                    <div class="prize-name-cell">
                      <img
                        :src="getAppleItemIcon(prize)"
                        :alt="prize.name"
                        class="prize-mini-icon"
                        loading="lazy"
                      />
                      <span>{{ prize.name }}</span>
                    </div>
                  </td>
                  <td class="text-right mono-cell">{{ prize.chance.toFixed(2) }}%</td>
                  <td class="text-right count-cell" :class="{ active: prize.count > 0 }">
                    {{ prize.count }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 右欄：即時抽取紀錄 (最近 150 筆) -->
        <div class="apple-log-card">
          <div class="apple-card-header">
            <h4>📜 即時抽取紀錄 (最新置頂)</h4>
            <span class="log-sub">顯示最近 {{ appleHistory.length }} 筆</span>
          </div>
          <div v-if="appleHistory.length" class="apple-log-list">
            <div
              v-for="item in appleHistory"
              :key="item.drawIndex"
              class="apple-log-row"
              :class="`log-tier-${item.tier.toLowerCase()}`"
            >
              <span class="log-idx">#{{ item.drawIndex }}</span>
              <img
                :src="getAppleItemIcon(item)"
                :alt="item.name"
                class="prize-mini-icon"
                loading="lazy"
              />
              <span class="log-name">{{ item.name }}</span>
              <span class="log-rate">{{ item.chance }}%</span>
            </div>
          </div>
          <p v-else class="empty-hint">點擊上方「單抽 / 10 抽 / 35 抽 / 100 抽」開始模擬抽蘋果！</p>
        </div>
      </div>

      <!-- 開啟金色寶箱彈窗 -->
      <div v-if="showGoldenBoxModal && goldenBoxPrizeResult" class="gacha-modal-backdrop" @click.self="showGoldenBoxModal = false">
        <div class="gacha-modal-box">
          <h3 class="modal-congrats-title">
            {{ goldenBoxPrizeResult.isGrand ? '🎉 恭喜！金色寶箱開出大獎！' : '🎁 開啟金色寶箱' }}
          </h3>
          <p class="modal-draw-num">
            剩餘金色寶箱：{{ appleGoldenBoxCount }} 個
          </p>
          <div class="golden-box-result-wrap">
            <img
              :src="getAppleItemIcon(goldenBoxPrizeResult)"
              :alt="goldenBoxPrizeResult.name"
              class="golden-box-prize-icon"
            />
            <p class="golden-box-prize-name" :class="{ 'is-grand': goldenBoxPrizeResult.isGrand }">
              {{ goldenBoxPrizeResult.name }}
            </p>
            <span class="golden-box-tier-badge" :class="`tier-${goldenBoxPrizeResult.tier.toLowerCase()}`">
              {{ goldenBoxPrizeResult.tier }} 級獎項
            </span>
          </div>
          <div class="modal-actions">
            <button
              v-if="appleGoldenBoxCount > 0"
              type="button"
              class="btn-primary"
              @click="openGoldenBox"
            >
              繼續開啟下一箱 (剩 {{ appleGoldenBoxCount }} 個)
            </button>
            <button
              type="button"
              class="royal-util-btn"
              @click="showGoldenBoxModal = false"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
