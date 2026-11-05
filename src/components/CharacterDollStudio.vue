<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FullCharacterProfile } from '../types/nexon'

const props = defineProps<{
  profile: FullCharacterProfile
}>()

// 1. 部位分類定義 (繁體中文標籤)
export type SlotType =
  | 'Hat'
  | 'Overall'
  | 'Top'
  | 'Bottom'
  | 'Cape'
  | 'Weapon'
  | 'Glove'
  | 'Shoes'
  | 'Face Accessory'
  | 'Eye Decoration'
  | 'Earrings'

interface SlotCategory {
  id: SlotType
  label: string
  icon: string
  filterSubCategory?: string
  filterCategory?: string
  cashOnly?: boolean
}

const SLOT_CATEGORIES: SlotCategory[] = [
  { id: 'Hat', label: '帽子', icon: '🧢', filterSubCategory: 'Hat', cashOnly: true },
  { id: 'Overall', label: '套服', icon: '👗', filterSubCategory: 'Overall', cashOnly: true },
  { id: 'Top', label: '上衣', icon: '👕', filterSubCategory: 'Top', cashOnly: true },
  { id: 'Bottom', label: '褲/裙', icon: '👖', filterSubCategory: 'Bottom', cashOnly: true },
  { id: 'Cape', label: '披風', icon: '🪽', filterSubCategory: 'Cape', cashOnly: true },
  {
    id: 'Weapon',
    label: '點裝武器',
    icon: '⚔️',
    filterCategory: 'One-Handed Weapon',
    filterSubCategory: 'Cash',
    cashOnly: true,
  },
  { id: 'Glove', label: '手套', icon: '🧤', filterSubCategory: 'Glove', cashOnly: true },
  { id: 'Shoes', label: '鞋子', icon: '👟', filterSubCategory: 'Shoes', cashOnly: true },
  { id: 'Face Accessory', label: '臉飾', icon: '🎭', filterSubCategory: 'Face Accessory', cashOnly: true },
  { id: 'Eye Decoration', label: '眼飾', icon: '👓', filterSubCategory: 'Eye Decoration', cashOnly: true },
  { id: 'Earrings', label: '耳環', icon: '✨', filterSubCategory: 'Earrings', cashOnly: true },
]

// 2. 楓之谷點裝名詞繁體中文化字典
const TRANSLATE_DICT: Record<string, string> = {
  Hat: '帽子',
  Cap: '鴨舌帽',
  Beret: '貝雷帽',
  Beanie: '毛帽',
  Helmet: '頭盔',
  Crown: '王冠',
  Hood: '兜帽',
  Ribbon: '蝴蝶結緞帶',
  Hairband: '髮箍',
  Band: '髮帶',
  Pin: '髮夾',
  Ears: '獸耳',
  Overall: '套服',
  Suit: '套裝',
  Dress: '洋裝',
  Uniform: '制服',
  Robe: '長袍',
  Top: '上衣',
  Shirt: '襯衫',
  'T-Shirt': 'T恤',
  Vest: '背心',
  Coat: '大衣',
  Jacket: '外套',
  Pants: '長褲',
  Bottom: '下裝褲裙',
  Shorts: '短褲',
  Skirt: '短裙',
  Cape: '披風',
  Wings: '雙翼翅膀',
  Wing: '羽翼',
  Cloak: '斗篷',
  Weapon: '武器',
  Sword: '單手劍',
  Blade: '軍刀',
  Saber: '光刃劍',
  Staff: '法杖',
  Wand: '短杖',
  Bow: '長弓',
  Dagger: '短刀',
  Gun: '手槍',
  Claw: '拳套',
  Gloves: '手套',
  Glove: '手套',
  Shoes: '鞋子',
  Boots: '長靴',
  Slippers: '拖鞋',
  Sandals: '涼鞋',
  Sneakers: '球鞋',
  Glasses: '眼鏡',
  Goggles: '護目鏡',
  Mask: '面具口罩',
  Earrings: '耳環',
  Earring: '耳環',
  Black: '黑色',
  White: '純白',
  Red: '赤紅',
  Blue: '湛藍',
  Green: '翠綠',
  Yellow: '明黃',
  Pink: '粉紅',
  Purple: '神秘紫',
  Orange: '澄橘',
  Brown: '深褐',
  Gold: '金燦',
  Silver: '銀白',
  Grey: '墨灰',
  Gray: '墨灰',
  Dark: '暗黑',
  Light: '閃耀',
  Fine: '精緻',
  Classic: '經典',
  Royal: '皇家',
  Sweet: '微甜',
  Dream: '夢境',
  Dreaming: '夢幻',
  Starry: '星空',
  Star: '繁星',
  Night: '極夜',
  Moon: '月光',
  Sun: '熾陽',
  Angel: '天使',
  Devil: '惡魔',
  Cat: '貓咪',
  Bear: '小熊',
  Bunny: '萌兔',
  Rabbit: '白兔',
  Puppy: '萌犬',
  Picnic: '野餐',
  Hanbok: '韓服',
  Plasma: '電漿離子',
  Dual: '雙持',
  Crystal: '永恆水晶',
  Magic: '魔法',
  Shadow: '暗影',
  Ghost: '幽靈',
  Skull: '骷髏',
  Rose: '薔薇玫瑰',
  Flower: '花卉',
  Blossom: '繁花',
  Love: '純愛',
  Heart: '愛心',
  Cute: '俏皮',
  Cool: '酷帥',
  Baby: '寶貝',
  Boy: '男孩',
  Girl: '女孩',
}

function translateName(rawEng: string): string {
  if (!rawEng) return ''
  let res = rawEng
  const keys = Object.keys(TRANSLATE_DICT).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    const reg = new RegExp('\\b' + k + '\\b', 'gi')
    res = res.replace(reg, TRANSLATE_DICT[k])
  }
  return res.replace(/\s+/g, ' ').trim()
}

// 中文關鍵字轉換
const CH_SEARCH_ORDERED_MAP: Array<[string, string]> = [
  ['貝雷帽', 'Beret'],
  ['鴨舌帽', 'Cap'],
  ['毛帽', 'Beanie'],
  ['王冠', 'Crown'],
  ['皇冠', 'Crown'],
  ['頭盔', 'Helmet'],
  ['髮箍', 'Hairband'],
  ['髮夾', 'Pin'],
  ['蝴蝶結', 'Ribbon'],
  ['緞帶', 'Ribbon'],
  ['貓耳', 'Cat'],
  ['兔耳', 'Bunny'],
  ['熊', 'Bear'],
  ['帽子', 'Hat'],
  ['洋裝', 'Dress'],
  ['套服', 'Overall'],
  ['制服', 'Uniform'],
  ['長袍', 'Robe'],
  ['上衣', 'Top'],
  ['襯衫', 'Shirt'],
  ['褲', 'Pants'],
  ['裙', 'Skirt'],
  ['披風', 'Cape'],
  ['翅膀', 'Wings'],
  ['羽翼', 'Wing'],
  ['武器', 'Weapon'],
  ['劍', 'Sword'],
  ['刀', 'Blade'],
  ['杖', 'Staff'],
  ['弓', 'Bow'],
  ['槍', 'Gun'],
  ['手套', 'Glove'],
  ['鞋', 'Shoes'],
  ['靴', 'Boots'],
  ['臉飾', 'Face'],
  ['眼飾', 'Eye'],
  ['眼鏡', 'Glasses'],
  ['面具', 'Mask'],
  ['口罩', 'Mask'],
  ['耳環', 'Earrings'],
  ['黑', 'Black'],
  ['白', 'White'],
  ['粉紅', 'Pink'],
  ['粉', 'Pink'],
  ['紅', 'Red'],
  ['藍', 'Blue'],
  ['綠', 'Green'],
  ['黃', 'Yellow'],
  ['紫', 'Purple'],
  ['金', 'Gold'],
  ['銀', 'Silver'],
  ['天使', 'Angel'],
  ['惡魔', 'Devil'],
  ['星', 'Star'],
  ['月', 'Moon'],
  ['夢', 'Dream'],
  ['水晶', 'Crystal'],
  ['愛心', 'Heart'],
  ['玫瑰', 'Rose'],
  ['花', 'Flower'],
  ['皇家', 'Royal'],
]

function convertSearchQuery(chineseQuery: string): string {
  const q = chineseQuery.trim()
  if (!q) return ''
  for (const [ch, en] of CH_SEARCH_ORDERED_MAP) {
    if (q.includes(ch)) {
      return en
    }
  }
  return q
}

// 當前選取分類
const currentSlot = ref<SlotType>('Hat')
const searchQuery = ref<string>('')
const isLoadingItems = ref<boolean>(false)

// 點裝資料介面
interface CashItem {
  id: number
  name: string
  subCategory?: string
  iconUrl?: string
}

const itemList = ref<CashItem[]>([])
const page = ref<number>(0)
const pageSize = 48
const hasMore = ref<boolean>(true)

// 試穿點裝清單（點選試穿的點裝，不破壞搜尋角色的身體）
interface TriedItem {
  id: number
  name: string
  slot: SlotType
  iconUrl: string
}

const triedItems = ref<TriedItem[]>([])

// 動作切換
interface ActionOption {
  id: string
  name: string
  icon: string
  actCode: string
}

const ACTIONS: ActionOption[] = [
  { id: 'stand1', name: '站姿 1', icon: '🧍', actCode: 'A00' },
  { id: 'stand2', name: '站姿 2', icon: '🧍‍♂️', actCode: 'A01' },
  { id: 'alert', name: '警戒戰鬥', icon: '⚔️', actCode: 'A11' },
  { id: 'walk1', name: '走步 1', icon: '🚶', actCode: 'A02' },
  { id: 'walk2', name: '走步 2', icon: '🏃', actCode: 'A03' },
  { id: 'prone', name: '趴下休息', icon: '🛌', actCode: 'A04' },
  { id: 'jump', name: '跳躍騰空', icon: '🦘', actCode: 'A06' },
  { id: 'fly', name: '飄浮飛行', icon: '🕊️', actCode: 'A05' },
  { id: 'sit', name: '坐下', icon: '🪑', actCode: 'A07' },
  { id: 'ladder', name: '爬梯子', icon: '🪜', actCode: 'A08' },
  { id: 'rope', name: '抓繩子', icon: '🧗', actCode: 'A09' },
  { id: 'swingO1', name: '單手揮劍', icon: '🗡️', actCode: 'A13' },
  { id: 'swingOF', name: '旋風大揮砍', icon: '🌪️', actCode: 'A16' },
  { id: 'swingT1', name: '雙手重揮', icon: '🪓', actCode: 'A20' },
  { id: 'stabO1', name: '單手刺擊', icon: '🎯', actCode: 'A24' },
]

// 面部表情切換
interface EmotionOption {
  id: string
  name: string
  icon: string
}

const EMOTIONS: EmotionOption[] = [
  { id: 'E00', name: '預設表情', icon: '😐' },
  { id: 'E02', name: '溫柔微笑', icon: '😊' },
  { id: 'E01', name: '俏皮眨眼', icon: '😉' },
  { id: 'E09', name: '歡呼雀躍', icon: '😆' },
  { id: 'E10', name: '嘟嘴飛吻', icon: '😘' },
  { id: 'E13', name: '星光閃爍', icon: '🤩' },
  { id: 'E17', name: '眼冒愛心', icon: '😍' },
  { id: 'E03', name: '難過流淚', icon: '😭' },
  { id: 'E04', name: '生氣憤怒', icon: '😡' },
]

const currentAction = ref<string>('stand1')
const currentEmotion = ref<string>('E00')
const zoomLevel = ref<number>(2.5) // 預設放大至 2.5x，視覺效果清晰震撼
const isFlipped = ref<boolean>(false)
const bgTheme = ref<'dark' | 'transparent' | 'pink' | 'blue'>('dark')

// 核心：角色真實外觀底圖 (100% 來自 Nexon 官方，保證是剛剛搜尋角色的真實外觀)
const baseCharacterUrl = computed(() => {
  const baseImg = props.profile.basic.character_image
  if (!baseImg) return ''
  return baseImg
})

// 試穿點裝透明去背 Data URL 緩存
const isolatedItemMap = ref<Record<string, string>>({})
const isProcessingItems = ref<boolean>(false)

// 取得 maplestory.io 基準假人素體影像 (96x96 Canvas)，用於扣除素體像素以取得純淨透明點裝
const baseDollCache: Record<string, ImageData> = {}

async function getBaseDollData(action: string): Promise<ImageData | null> {
  if (baseDollCache[action]) return baseDollCache[action]
  try {
    const partsBase = [
      { itemId: 12000, region: 'TWMS', version: '245' },
      { itemId: 2000, region: 'TWMS', version: '245' },
    ]
    const url = `https://maplestory.io/api/character/${encodeURIComponent(JSON.stringify(partsBase).slice(1, -1))}/${action}/0?renderMode=1`
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    const c = document.createElement('canvas')
    c.width = 96
    c.height = 96
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, 96, 96)
    baseDollCache[action] = data
    return data
  } catch (err) {
    console.warn('載入基準素體失敗:', err)
    return null
  }
}

// 動態去背：扣除素體假人，僅保留試穿的點裝（帽子、套服、武器、披風等），產生純透明 PNG Data URL
async function isolateItem(itemId: number, action: string): Promise<string> {
  const cacheKey = `${itemId}_${action}`
  if (isolatedItemMap.value[cacheKey]) {
    return isolatedItemMap.value[cacheKey]
  }

  try {
    const baseDoll = await getBaseDollData(action)
    const partsItem = [
      { itemId: 12000, region: 'TWMS', version: '245' },
      { itemId: 2000, region: 'TWMS', version: '245' },
      { itemId: itemId, region: 'TWMS', version: '245' },
    ]
    const itemUrl = `https://maplestory.io/api/character/${encodeURIComponent(JSON.stringify(partsItem).slice(1, -1))}/${action}/0?renderMode=1`

    const itemImg = new Image()
    itemImg.crossOrigin = 'anonymous'
    itemImg.src = itemUrl
    await new Promise((resolve, reject) => {
      itemImg.onload = resolve
      itemImg.onerror = reject
    })

    const c = document.createElement('canvas')
    c.width = 96
    c.height = 96
    const ctx = c.getContext('2d')
    if (!ctx) return itemUrl
    ctx.drawImage(itemImg, 0, 0)

    if (baseDoll) {
      const itemData = ctx.getImageData(0, 0, 96, 96)
      const iData = itemData.data
      const bData = baseDoll.data

      // 若該像素與素體一致（顏色與透明度誤差在容許值內），則標記為完全透明，僅留下時裝本身
      const tol = 5
      for (let i = 0; i < iData.length; i += 4) {
        if (bData[i + 3] > 0) {
          const dr = Math.abs(iData[i] - bData[i])
          const dg = Math.abs(iData[i + 1] - bData[i + 1])
          const db = Math.abs(iData[i + 2] - bData[i + 2])
          const da = Math.abs(iData[i + 3] - bData[i + 3])
          if (dr <= tol && dg <= tol && db <= tol && da <= tol) {
            iData[i + 3] = 0 // 將素體假人皮膚遮罩剔除為透明！
          }
        }
      }
      ctx.putImageData(itemData, 0, 0)
    }

    const dataUrl = c.toDataURL('image/png')
    isolatedItemMap.value[cacheKey] = dataUrl
    return dataUrl
  } catch (err) {
    console.warn('提取透明點裝失敗，回退至默認圖層:', err)
    return `https://maplestory.io/api/gms/250/character/2000/${itemId}/${action}/0`
  }
}

// 監聽 triedItems 與 currentAction，自動解析並緩存透明去背圖層
watch(
  [triedItems, currentAction],
  async () => {
    if (triedItems.value.length === 0) return
    isProcessingItems.value = true
    try {
      for (const item of triedItems.value) {
        const key = `${item.id}_${currentAction.value}`
        if (!isolatedItemMap.value[key]) {
          await isolateItem(item.id, currentAction.value)
        }
      }
    } finally {
      isProcessingItems.value = false
    }
  },
  { immediate: true, deep: true }
)

// 試穿點裝純透明疊加層 (保證不會覆蓋原角色的臉型、髮型與真實外觀)
const overlayItemUrls = computed(() => {
  return triedItems.value.map((item) => {
    const key = `${item.id}_${currentAction.value}`
    return {
      id: item.id,
      name: item.name,
      url: isolatedItemMap.value[key] || '',
    }
  })
})

// 從 maplestory.io API 抓取各分類時裝
async function fetchCategoryItems(reset = false) {
  if (reset) {
    page.value = 0
    itemList.value = []
    hasMore.value = true
  }

  const catDef = SLOT_CATEGORIES.find((c) => c.id === currentSlot.value)
  if (!catDef) return

  isLoadingItems.value = true
  try {
    const params = new URLSearchParams()
    if (catDef.filterCategory) params.append('categoryFilter', catDef.filterCategory)
    if (catDef.filterSubCategory) params.append('subCategoryFilter', catDef.filterSubCategory)
    if (catDef.cashOnly) params.append('cashFilter', 'true')

    const apiSearchKey = convertSearchQuery(searchQuery.value)
    if (apiSearchKey) params.append('searchFor', apiSearchKey)

    params.append('startPosition', String(page.value * pageSize))
    params.append('count', String(pageSize))

    const url = `https://maplestory.io/api/gms/250/item?${params.toString()}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        const formatted: CashItem[] = data.map((item: any) => ({
          id: item.id,
          name: translateName(item.name || `時裝 #${item.id}`),
          subCategory: item.typeInfo?.subCategory || '',
          iconUrl: `https://maplestory.io/api/gms/250/item/${item.id}/icon`,
        }))

        if (reset) {
          itemList.value = formatted
        } else {
          itemList.value.push(...formatted)
        }

        if (data.length < pageSize) {
          hasMore.value = false
        }
      }
    }
  } catch (err) {
    console.warn('載入時裝列表失敗:', err)
  } finally {
    isLoadingItems.value = false
  }
}

function handleSlotChange(slotId: SlotType) {
  currentSlot.value = slotId
  searchQuery.value = ''
  fetchCategoryItems(true)
}

function loadMoreItems() {
  if (isLoadingItems.value || !hasMore.value) return
  page.value += 1
  fetchCategoryItems(false)
}

function handleSearchSubmit() {
  fetchCategoryItems(true)
}

// 點擊穿戴點裝 (直接在原本角色上試穿，同一部位覆蓋)
function wearItem(item: CashItem) {
  const existingIdx = triedItems.value.findIndex((t) => t.slot === currentSlot.value)
  const newTried: TriedItem = {
    id: item.id,
    name: item.name,
    slot: currentSlot.value,
    iconUrl: item.iconUrl || '',
  }

  if (existingIdx >= 0) {
    triedItems.value[existingIdx] = newTried
  } else {
    triedItems.value.push(newTried)
  }
}

// 卸下特定部位試穿點裝
function removeTriedItem(itemId: number) {
  triedItems.value = triedItems.value.filter((t) => t.id !== itemId)
}

// 清空所有試穿點裝
function clearAllTriedItems() {
  triedItems.value = []
}

// 一鍵儲存 PNG 高清立繪 (使用 Canvas 合成角色原圖與試穿點裝)
async function downloadAvatar() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = 384
  canvas.height = 384
  ctx.imageSmoothingEnabled = false

  const baseImg = new Image()
  baseImg.crossOrigin = 'anonymous'
  baseImg.src = baseCharacterUrl.value

  baseImg.onload = async () => {
    ctx.drawImage(baseImg, 0, 0, 384, 384)

    for (const overlay of overlayItemUrls.value) {
      if (!overlay.url) continue
      try {
        const itemImg = new Image()
        itemImg.crossOrigin = 'anonymous'
        itemImg.src = overlay.url
        await new Promise((resolve) => {
          itemImg.onload = resolve
          itemImg.onerror = resolve
        })
        ctx.drawImage(itemImg, 0, 0, 384, 384)
      } catch {
        // continue
      }
    }

    const blobUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = blobUrl
    const cName = props.profile.basic.character_name || 'MapleAvatar'
    a.download = `${cName}_${currentAction.value}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

onMounted(() => {
  fetchCategoryItems(true)
})

watch(
  () => props.profile,
  () => {
    triedItems.value = []
  }
)
</script>

<template>
  <div class="character-doll-studio">
    <!-- 主工作區：左側伸展展示台 + 右側全點裝衣櫃選單 -->
    <div class="doll-main-grid">
      <!-- 左側：角色展示伸展台 -->
      <section class="avatar-stage-card">
        <!-- 頂部視角與場景工具列 -->
        <div class="stage-toolbar">
          <div class="bg-selector">
            <span class="toolbar-label">背景:</span>
            <button
              type="button"
              class="toolbar-btn"
              :class="{ active: bgTheme === 'dark' }"
              @click="bgTheme = 'dark'"
            >
              暗夜
            </button>
            <button
              type="button"
              class="toolbar-btn"
              :class="{ active: bgTheme === 'transparent' }"
              @click="bgTheme = 'transparent'"
            >
              透明
            </button>
            <button
              type="button"
              class="toolbar-btn"
              :class="{ active: bgTheme === 'pink' }"
              @click="bgTheme = 'pink'"
            >
              夢幻
            </button>
            <button
              type="button"
              class="toolbar-btn"
              :class="{ active: bgTheme === 'blue' }"
              @click="bgTheme = 'blue'"
            >
              深海
            </button>
          </div>

          <div class="view-controls">
            <button
              type="button"
              class="toolbar-btn"
              :class="{ active: isFlipped }"
              title="左右轉向"
              @click="isFlipped = !isFlipped"
            >
              🔄 鏡像
            </button>
            <button
              type="button"
              class="toolbar-btn"
              title="重設大小"
              @click="zoomLevel = 2.5"
            >
              {{ Math.round((zoomLevel / 2.5) * 100) }}%
            </button>
            <input
              v-model.number="zoomLevel"
              type="range"
              min="1.5"
              max="4.0"
              step="0.2"
              class="zoom-slider"
              title="縮放大小"
            />
          </div>
        </div>

        <!-- 角色畫布中央 (角色置中 + 預設放大展示) -->
        <div class="avatar-canvas" :class="`theme-${bgTheme}`">
          <!-- 角色資訊徽章 -->
          <div class="character-name-badge">
            <span class="c-name">{{ profile.basic.character_name }}</span>
            <span class="c-status">
              {{ triedItems.length > 0 ? `✨ 已試穿 ${triedItems.length} 件點裝` : '🛡️ 角色真實原廠外觀' }}
            </span>
          </div>

          <!-- 角色立繪置中展示舞台 -->
          <div class="avatar-center-wrapper">
            <div
              class="avatar-stage-viewport"
              :style="{
                transform: `scale(${isFlipped ? -zoomLevel : zoomLevel}, ${zoomLevel})`,
              }"
            >
              <!-- 1. 角色本體真實底圖 (100% 來自 Nexon 官方，保證是搜尋角色的原外觀) -->
              <img
                :src="baseCharacterUrl"
                :alt="profile.basic.character_name"
                class="avatar-base-layer"
              />

              <!-- 2. 試穿點裝疊加層 -->
              <img
                v-for="overlay in overlayItemUrls"
                :key="overlay.id"
                :src="overlay.url"
                :alt="overlay.name"
                class="avatar-item-overlay-layer"
              />
            </div>

            <!-- 角色立足點立體光影 -->
            <div class="avatar-shadow"></div>
          </div>
        </div>

        <!-- 動作切換與控制列 -->
        <div class="stage-footer">
          <!-- 動作姿勢 -->
          <div class="action-picker-row">
            <span class="footer-label">動作姿勢:</span>
            <div class="action-scroll-wrap">
              <button
                v-for="act in ACTIONS"
                :key="act.id"
                type="button"
                class="action-chip"
                :class="{ active: currentAction === act.id }"
                @click="currentAction = act.id"
              >
                <span>{{ act.icon }}</span>
                <span>{{ act.name }}</span>
              </button>
            </div>
          </div>

          <!-- 面部表情 -->
          <div class="action-picker-row">
            <span class="footer-label">面部表情:</span>
            <div class="action-scroll-wrap">
              <button
                v-for="emo in EMOTIONS"
                :key="emo.id"
                type="button"
                class="action-chip emo-chip"
                :class="{ active: currentEmotion === emo.id }"
                @click="currentEmotion = emo.id"
              >
                <span>{{ emo.icon }}</span>
                <span>{{ emo.name }}</span>
              </button>
            </div>
          </div>

          <!-- 功能列 -->
          <div class="action-control-row">
            <button
              v-if="triedItems.length > 0"
              type="button"
              class="btn-restore-profile"
              @click="clearAllTriedItems"
            >
              ↺ 還原角色原裝 (卸下點裝)
            </button>
            <span v-else class="text-hint-origin">已套用搜尋角色的真實外觀</span>

            <button type="button" class="btn-snapshot-png" @click="downloadAvatar">
              📸 儲存透明立繪 (PNG)
            </button>
          </div>
        </div>

        <!-- 已試穿點裝清單 (可單獨卸下) -->
        <div v-if="triedItems.length > 0" class="equipped-overview-panel">
          <div class="overview-header">
            <h4>👗 試穿中的點裝部件 ({{ triedItems.length }})</h4>
            <button type="button" class="btn-clear-all" @click="clearAllTriedItems">
              全部卸下
            </button>
          </div>

          <div class="equipped-chips-list">
            <div v-for="t in triedItems" :key="t.id" class="equip-chip">
              <img :src="t.iconUrl" :alt="t.name" class="chip-mini-icon" />
              <span class="chip-part">{{ SLOT_CATEGORIES.find((s) => s.id === t.slot)?.label }}</span>
              <span class="chip-title">{{ t.name }}</span>
              <button type="button" class="chip-del" @click="removeTriedItem(t.id)">✕</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 右側：全點裝衣櫃選單與搜尋 -->
      <section class="closet-catalog-card">
        <!-- 部位分類切換 Tabs -->
        <div class="slot-tabs-nav">
          <button
            v-for="cat in SLOT_CATEGORIES"
            :key="cat.id"
            type="button"
            class="slot-tab-btn"
            :class="{ active: currentSlot === cat.id }"
            @click="handleSlotChange(cat.id)"
          >
            <span class="tab-icon">{{ cat.icon }}</span>
            <span class="tab-label">{{ cat.label }}</span>
          </button>
        </div>

        <!-- 搜尋列 -->
        <div class="catalog-search-bar">
          <form class="search-form" @submit.prevent="handleSearchSubmit">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋點裝 (例如: 貝雷帽, 翅膀, 粉紅, 貓耳, 刀, 武器)..."
              class="search-input"
            />
            <button type="submit" class="btn-search-go" :disabled="isLoadingItems">
              🔍 搜尋
            </button>
          </form>
        </div>

        <!-- 點裝道具網格 (從 maplestory.io API 即時載入) -->
        <div class="catalog-items-container">
          <div v-if="itemList.length > 0" class="catalog-grid">
            <div
              v-for="item in itemList"
              :key="item.id"
              class="catalog-item-card"
              :class="{
                'is-wearing': triedItems.some((t) => t.id === item.id),
              }"
              @click="wearItem(item)"
            >
              <div class="item-icon-wrap">
                <img
                  :src="item.iconUrl"
                  :alt="item.name"
                  class="item-icon-img"
                  loading="lazy"
                />
              </div>
              <div class="item-meta">
                <span class="item-name" :title="item.name">{{ item.name }}</span>
                <span class="item-id">#{{ item.id }}</span>
              </div>
              <span class="item-wear-badge">
                {{ triedItems.some((t) => t.id === item.id) ? '試穿中' : '+ 試穿' }}
              </span>
            </div>
          </div>

          <!-- 讀取狀態 / 查無結果 -->
          <div v-if="isLoadingItems" class="status-box">
            <span class="status-spinner">⏳</span>
            <span>正在從楓之谷點裝庫載入中...</span>
          </div>

          <div
            v-else-if="itemList.length === 0"
            class="status-box empty"
          >
            <span>未找到符合的點裝，請嘗試其他中文或英文關鍵字。</span>
          </div>

          <!-- 載入更多按鈕 -->
          <div v-if="hasMore && itemList.length > 0 && !isLoadingItems" class="load-more-wrap">
            <button type="button" class="btn-load-more" @click="loadMoreItems">
              載入更多點裝...
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.character-doll-studio {
  display: flex;
  flex-direction: column;
  width: 100%;
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 主佈局左右排版 */
.doll-main-grid {
  display: grid;
  grid-template-columns: 480px 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 1100px) {
  .doll-main-grid {
    grid-template-columns: 1fr;
  }
}

/* 左側：角色展示伸展台 */
.avatar-stage-card {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.15rem;
  overflow: hidden;
  position: sticky;
  top: 1rem;
}

/* 工具列 */
.stage-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.bg-selector,
.view-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.toolbar-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-right: 0.2rem;
}

.toolbar-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 0.75rem;
  padding: 0.22rem 0.55rem;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-btn:hover,
.toolbar-btn.active {
  background: rgba(99, 102, 241, 0.3);
  color: #ffffff;
  border-color: #818cf8;
}

.zoom-slider {
  width: 70px;
  height: 4px;
  accent-color: #818cf8;
  cursor: pointer;
}

/* 畫布中央：增加高度至 440px，讓角色視覺更聚焦置中 */
.avatar-canvas {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 440px;
  overflow: hidden;
  transition: background 0.3s;
}

.character-name-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(15, 23, 42, 0.75);
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.c-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f8fafc;
}

.c-status {
  font-size: 0.7rem;
  color: #818cf8;
}

.theme-dark {
  background: radial-gradient(circle at center, #1e293b 0%, #090d16 100%);
}

.theme-transparent {
  background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
}

.theme-pink {
  background: radial-gradient(circle at center, #581c87 0%, #2e1065 100%);
}

.theme-blue {
  background: radial-gradient(circle at center, #075985 0%, #0c4a6e 100%);
}

/* 角色居中舞台容器 */
.avatar-center-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.avatar-stage-viewport {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 96px;
  height: 96px;
  transform-origin: center center;
  z-index: 5;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.avatar-base-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 96px;
  height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.55));
  z-index: 5;
}

.avatar-item-overlay-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 96px;
  height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  z-index: 6;
  pointer-events: none;
}

.avatar-shadow {
  position: absolute;
  bottom: 50px;
  width: 160px;
  height: 24px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.65) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
}

/* 動作切換與控制條 */
.stage-footer {
  padding: 0.85rem 1rem;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-picker-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-label {
  font-size: 0.78rem;
  color: #94a3b8;
  white-space: nowrap;
}

.action-scroll-wrap {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.action-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 0.45rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.action-chip:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
}

.action-chip.active {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border-color: #818cf8;
  color: #fff;
  font-weight: 700;
}

.emo-chip.active {
  background: linear-gradient(135deg, #ec4899, #db2777);
  border-color: #f472b6;
}

.action-control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.btn-restore-profile {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-restore-profile:hover {
  background: rgba(239, 68, 68, 0.3);
}

.text-hint-origin {
  font-size: 0.76rem;
  color: #10b981;
}

.btn-snapshot-png {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.45rem 0.95rem;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(217, 119, 6, 0.35);
  transition: all 0.15s;
}

.btn-snapshot-png:hover {
  transform: translateY(-1px);
}

/* 穿戴時裝清單 */
.equipped-overview-panel {
  padding: 0.85rem 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.overview-header h4 {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

.btn-clear-all {
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 0.72rem;
  cursor: pointer;
}

.btn-clear-all:hover {
  text-decoration: underline;
}

.equipped-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.equip-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.75rem;
}

.chip-mini-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.chip-part {
  color: #818cf8;
  font-weight: 700;
}

.chip-title {
  color: #f1f5f9;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-del {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 0.15rem;
  font-size: 0.75rem;
}

.chip-del:hover {
  color: #ef4444;
}

/* 右側：全點裝衣櫃選單與搜尋 */
.closet-catalog-card {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.15rem;
  padding: 1.25rem;
  min-height: 650px;
}

/* 部位 Tabs */
.slot-tabs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.slot-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.slot-tab-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #fff;
}

.slot-tab-btn.active {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border-color: #818cf8;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}

/* 搜尋列 */
.catalog-search-bar {
  margin: 1rem 0;
}

.search-form {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.55rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: #818cf8;
}

.btn-search-go {
  background: #6366f1;
  border: none;
  color: #fff;
  padding: 0.55rem 1.1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-search-go:hover {
  background: #4f46e5;
}

/* 道具網格 */
.catalog-items-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.65rem;
  max-height: 560px;
  overflow-y: auto;
  padding-right: 0.35rem;
}

.catalog-item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.65rem;
  padding: 0.65rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  text-align: center;
}

.catalog-item-card:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: #818cf8;
  transform: translateY(-2px);
}

.catalog-item-card.is-wearing {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.item-icon-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.5rem;
  margin-bottom: 0.4rem;
}

.item-icon-img {
  max-width: 36px;
  max-height: 36px;
  object-fit: contain;
}

.item-meta {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.item-name {
  font-size: 0.76rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.item-id {
  font-size: 0.68rem;
  color: #64748b;
}

.item-wear-badge {
  display: none;
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.65rem;
  background: #6366f1;
  color: #fff;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  font-weight: 700;
}

.catalog-item-card:hover .item-wear-badge,
.catalog-item-card.is-wearing .item-wear-badge {
  display: block;
}

.catalog-item-card.is-wearing .item-wear-badge {
  background: #10b981;
}

/* 狀態框 */
.status-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.status-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.btn-load-more {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  font-size: 0.82rem;
  padding: 0.55rem 1.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-load-more:hover {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}
</style>
