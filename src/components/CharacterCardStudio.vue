<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { ExpHistoryEntry, FullCharacterProfile } from '../types/nexon'

const props = defineProps<{
  profile: FullCharacterProfile
  combatPowerText?: string
  statAttackRangeText?: string
  expHistory?: ExpHistoryEntry[]
}>()

const CANVAS_W = 800
const CANVAS_H = 500

type CardThemeId = 'white' | 'transparent' | 'nebula' | 'arcane' | 'cernium' | 'lachelein' | 'maple'
type DrawTool = 'pen' | 'neon' | 'highlighter' | 'line' | 'rect' | 'circle' | 'eraser' | 'text' | 'sticker'

interface ThemePreset {
  id: CardThemeId
  name: string
  bgStops?: [string, string, string]
  solid?: string
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'nebula',
    name: '🌌 闇夜星辰',
    bgStops: ['#090d16', '#111827', '#1e1b4b'],
  },
  {
    id: 'arcane',
    name: '💧 奧術之河',
    bgStops: ['#041e3a', '#0c4a6e', '#1e3a8a'],
  },
  {
    id: 'cernium',
    name: '☀️ 賽爾尼溫',
    bgStops: ['#1c1917', '#422006', '#713f12'],
  },
  {
    id: 'lachelein',
    name: '🌸 露希妲夢境',
    bgStops: ['#1e1035', '#4a1d6e', '#701a75'],
  },
  {
    id: 'maple',
    name: '🍁 楓葉經典紅',
    bgStops: ['#1f0909', '#450a0a', '#7c2d12'],
  },
  {
    id: 'transparent',
    name: '🏁 透明無背景',
  },
  {
    id: 'white',
    name: '⬜ 純白背景',
    solid: '#ffffff',
  },
]

const COLOR_SWATCHES = [
  '#ffffff',
  '#fbbf24',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#38bdf8',
  '#10b981',
  '#84cc16',
  '#0f172a',
]

const STICKER_PRESETS = [
  '🍁',
  '👑',
  '⭐',
  '🔥',
  '❤️',
  '💯',
  '✨',
  '🎉',
  '💎',
  '⚔️',
  '🛡️',
  '🍎',
]

// 畫布底圖與角色位置設定（只留角色與背景，無任何預設文字或邊框）
const selectedTheme = ref<CardThemeId>('nebula')
const customBgImage = ref<HTMLImageElement | null>(null)
const avatarScale = ref<number>(1.8)
const avatarOffsetX = ref<number>(0)
const avatarOffsetY = ref<number>(0)

// 小畫家繪圖設定
const activeTool = ref<DrawTool>('pen')
const brushColor = ref<string>('#ffffff')
const brushSize = ref<number>(5)
const stampText = ref<string>('')
const selectedSticker = ref<string>('🍁')

// Canvas refs & 圖層狀態
const baseCanvasRef = ref<HTMLCanvasElement | null>(null)
const drawCanvasRef = ref<HTMLCanvasElement | null>(null)
const loadedAvatarImg = ref<HTMLImageElement | null>(null)

const isDrawing = ref<boolean>(false)
const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const snapshotBeforeShape = ref<ImageData | null>(null)
const undoStack = ref<ImageData[]>([])
const redoStack = ref<ImageData[]>([])
const copySuccess = ref<boolean>(false)

function loadCorsImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function preloadProfileImages() {
  const charUrl = props.profile.basic?.character_image
  loadedAvatarImg.value = charUrl ? await loadCorsImage(charUrl) : null
  renderBaseCard()
}

function renderBaseCard() {
  const canvas = baseCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const theme = THEME_PRESETS.find((t) => t.id === selectedTheme.value) || THEME_PRESETS[0]
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // 1. 背景（純色、漸層、透明或自訂背景圖片）
  if (customBgImage.value) {
    ctx.drawImage(customBgImage.value, 0, 0, CANVAS_W, CANVAS_H)
  } else if (theme.solid) {
    ctx.fillStyle = theme.solid
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  } else if (theme.bgStops) {
    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    grad.addColorStop(0, theme.bgStops[0])
    grad.addColorStop(0.55, theme.bgStops[1])
    grad.addColorStop(1, theme.bgStops[2])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }

  // 2. 僅繪製角色立繪（置中，無任何文字或框線）
  if (loadedAvatarImg.value) {
    ctx.save()
    ctx.imageSmoothingEnabled = false
    const baseSize = 150 * avatarScale.value
    const imgX = CANVAS_W / 2 - baseSize / 2 + avatarOffsetX.value
    const imgY = CANVAS_H / 2 - baseSize / 2 + avatarOffsetY.value
    ctx.drawImage(loadedAvatarImg.value, imgX, imgY, baseSize, baseSize)
    ctx.restore()
  }
}

function resetAvatarTransform() {
  avatarScale.value = 1.8
  avatarOffsetX.value = 0
  avatarOffsetY.value = 0
}

watch(
  [() => props.profile, selectedTheme, avatarScale, avatarOffsetX, avatarOffsetY],
  () => {
    renderBaseCard()
  },
  { deep: true }
)

watch(
  () => props.profile.ocid,
  () => {
    preloadProfileImages()
  }
)

onMounted(async () => {
  await nextTick()
  await preloadProfileImages()
  saveUndoSnapshot()
})

function onCustomBgUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      customBgImage.value = img
      renderBaseCard()
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function clearCustomBg() {
  customBgImage.value = null
  renderBaseCard()
}

// ============================================================================
// 小畫家繪圖互動邏輯 (Pointer Events on drawCanvasRef)
// ============================================================================
function getCanvasCoords(e: PointerEvent): { x: number; y: number } {
  const canvas = drawCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_W / rect.width
  const scaleY = CANVAS_H / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

function saveUndoSnapshot() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
  undoStack.value.push(data)
  if (undoStack.value.length > 25) {
    undoStack.value.shift()
  }
  redoStack.value = []
}

function handleUndo() {
  if (undoStack.value.length <= 1) return
  const canvas = drawCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const current = undoStack.value.pop()!
  redoStack.value.push(current)
  const prev = undoStack.value[undoStack.value.length - 1]
  ctx.putImageData(prev, 0, 0)
}

function handleRedo() {
  if (!redoStack.value.length) return
  const canvas = drawCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const next = redoStack.value.pop()!
  undoStack.value.push(next)
  ctx.putImageData(next, 0, 0)
}

function clearDrawLayer() {
  const canvas = drawCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  saveUndoSnapshot()
}

function configureBrushContext(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1

  if (activeTool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = brushSize.value * 2.5
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = brushColor.value
    ctx.fillStyle = brushColor.value
    ctx.lineWidth = brushSize.value

    if (activeTool.value === 'neon') {
      ctx.shadowColor = brushColor.value
      ctx.shadowBlur = 14
    } else if (activeTool.value === 'highlighter') {
      ctx.globalAlpha = 0.35
      ctx.lineWidth = brushSize.value * 2.2
    }
  }
}

function onPointerDown(e: PointerEvent) {
  const canvas = drawCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  canvas.setPointerCapture(e.pointerId)
  const pos = getCanvasCoords(e)

  if (activeTool.value === 'text') {
    if (!stampText.value.trim()) return
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    const fontSize = Math.max(16, brushSize.value * 4)
    ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = brushColor.value
    ctx.fillText(stampText.value, pos.x, pos.y)
    ctx.restore()
    saveUndoSnapshot()
    return
  }

  if (activeTool.value === 'sticker') {
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    const fontSize = Math.max(24, brushSize.value * 5)
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(selectedSticker.value, pos.x, pos.y)
    ctx.restore()
    saveUndoSnapshot()
    return
  }

  isDrawing.value = true
  startPos.value = pos
  configureBrushContext(ctx)

  if (activeTool.value === 'line' || activeTool.value === 'rect' || activeTool.value === 'circle') {
    snapshotBeforeShape.value = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
  } else {
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1)
    ctx.stroke()
  }
}

function onPointerMove(e: PointerEvent) {
  if (!isDrawing.value) return
  const canvas = drawCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const pos = getCanvasCoords(e)
  configureBrushContext(ctx)

  if (activeTool.value === 'line' || activeTool.value === 'rect' || activeTool.value === 'circle') {
    if (snapshotBeforeShape.value) {
      ctx.putImageData(snapshotBeforeShape.value, 0, 0)
    }
    ctx.beginPath()
    if (activeTool.value === 'line') {
      ctx.moveTo(startPos.value.x, startPos.value.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (activeTool.value === 'rect') {
      ctx.strokeRect(
        startPos.value.x,
        startPos.value.y,
        pos.x - startPos.value.x,
        pos.y - startPos.value.y
      )
    } else if (activeTool.value === 'circle') {
      const rx = Math.abs(pos.x - startPos.value.x) / 2
      const ry = Math.abs(pos.y - startPos.value.y) / 2
      const cx = (startPos.value.x + pos.x) / 2
      const cy = (startPos.value.y + pos.y) / 2
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else {
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }
}

function onPointerUp(e: PointerEvent) {
  if (!isDrawing.value) return
  isDrawing.value = false
  const canvas = drawCanvasRef.value
  if (canvas && canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId)
  }
  saveUndoSnapshot()
}

function buildMergedCanvas(): HTMLCanvasElement | null {
  if (!baseCanvasRef.value || !drawCanvasRef.value) return null
  const out = document.createElement('canvas')
  out.width = CANVAS_W
  out.height = CANVAS_H
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(baseCanvasRef.value, 0, 0)
  ctx.drawImage(drawCanvasRef.value, 0, 0)
  return out
}

function downloadCardPng() {
  const merged = buildMergedCanvas()
  if (!merged) return
  const link = document.createElement('a')
  link.download = `${props.profile.basic.character_name}_小畫家角色卡.png`
  link.href = merged.toDataURL('image/png')
  link.click()
}

function copyCardToClipboard() {
  const merged = buildMergedCanvas()
  if (!merged) return
  merged.toBlob(async (blob) => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2200)
    } catch {
      downloadCardPng()
    }
  }, 'image/png')
}
</script>

<template>
  <div class="card-studio-shell">
    <!-- 左側設定＆小畫家工具面板 -->
    <div class="studio-controls-col">
      <!-- 區塊 1：畫布背景與角色位置設定 -->
      <div class="panel-card studio-panel">
        <div class="studio-header-between">
          <h3>🧍 1. 畫布背景 ＆ 角色位置</h3>
          <button type="button" class="studio-mini-btn" @click="resetAvatarTransform">
            置中重置
          </button>
        </div>

        <div class="theme-pills-row">
          <button
            v-for="t in THEME_PRESETS"
            :key="t.id"
            type="button"
            class="theme-pill-btn"
            :class="{ active: selectedTheme === t.id && !customBgImage }"
            @click="selectedTheme = t.id; clearCustomBg()"
          >
            {{ t.name }}
          </button>
          <label class="theme-pill-btn upload-bg-label">
            🖼️ 自訂背景圖
            <input type="file" accept="image/*" hidden @change="onCustomBgUpload" />
          </label>
        </div>

        <div class="studio-field-row">
          <label class="studio-label">角色大小縮放 ({{ Math.round(avatarScale * 100) }}%)</label>
          <input
            v-model.number="avatarScale"
            type="range"
            min="0.6"
            max="3.2"
            step="0.05"
            class="studio-range"
          />
        </div>

        <div class="studio-field-row">
          <label class="studio-label">角色左右位置 ({{ avatarOffsetX }}px)</label>
          <input
            v-model.number="avatarOffsetX"
            type="range"
            min="-320"
            max="320"
            step="5"
            class="studio-range"
          />
        </div>

        <div class="studio-field-row">
          <label class="studio-label">角色上下位置 ({{ avatarOffsetY }}px)</label>
          <input
            v-model.number="avatarOffsetY"
            type="range"
            min="-200"
            max="200"
            step="5"
            class="studio-range"
          />
        </div>
      </div>

      <!-- 區塊 2：小畫家自由塗鴉與貼圖工具 -->
      <div class="panel-card studio-panel">
        <div class="studio-header-between">
          <h3>🎨 2. 小畫家塗鴉工具</h3>
          <div class="undo-redo-group">
            <button
              type="button"
              class="studio-mini-btn"
              :disabled="undoStack.length <= 1"
              @click="handleUndo"
            >
              ↩️ 復原
            </button>
            <button
              type="button"
              class="studio-mini-btn"
              :disabled="redoStack.length === 0"
              @click="handleRedo"
            >
              ↪️ 重做
            </button>
            <button type="button" class="studio-mini-btn danger" @click="clearDrawLayer">
              🗑️ 清空塗鴉
            </button>
          </div>
        </div>

        <div class="paint-tools-grid">
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'pen' }"
            @click="activeTool = 'pen'"
          >
            🖌️ 畫筆
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'neon' }"
            @click="activeTool = 'neon'"
          >
            ✨ 霓虹筆
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'highlighter' }"
            @click="activeTool = 'highlighter'"
          >
            🖍️ 螢光筆
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'line' }"
            @click="activeTool = 'line'"
          >
            📏 直線
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'rect' }"
            @click="activeTool = 'rect'"
          >
            ▭ 矩形框
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'circle' }"
            @click="activeTool = 'circle'"
          >
            ◯ 圓形框
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'sticker' }"
            @click="activeTool = 'sticker'"
          >
            😀 蓋貼圖
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'text' }"
            @click="activeTool = 'text'"
          >
            🔤 蓋文字
          </button>
          <button
            type="button"
            class="paint-tool-btn"
            :class="{ active: activeTool === 'eraser' }"
            @click="activeTool = 'eraser'"
          >
            🧹 橡皮擦
          </button>
        </div>

        <div class="color-and-size-bar">
          <div class="swatches-row">
            <input v-model="brushColor" type="color" class="color-picker-native" />
            <button
              v-for="hex in COLOR_SWATCHES"
              :key="hex"
              type="button"
              class="color-swatch-dot"
              :class="{ active: brushColor.toLowerCase() === hex }"
              :style="{ backgroundColor: hex }"
              @click="brushColor = hex"
            ></button>
          </div>

          <div class="studio-field-row">
            <label class="studio-label">筆刷粗細 ({{ brushSize }}px)</label>
            <input
              v-model.number="brushSize"
              type="range"
              min="2"
              max="32"
              step="1"
              class="studio-range"
            />
          </div>
        </div>

        <div v-if="activeTool === 'text'" class="stamp-config-box">
          <label class="studio-label">輸入文字後，點擊右側畫布即可蓋上：</label>
          <input
            v-model="stampText"
            type="text"
            class="input-control"
            placeholder="輸入文字..."
          />
        </div>

        <div v-if="activeTool === 'sticker'" class="stamp-config-box">
          <label class="studio-label">選擇貼圖後，點擊右側畫布即可蓋章：</label>
          <div class="sticker-picker-row">
            <button
              v-for="st in STICKER_PRESETS"
              :key="st"
              type="button"
              class="sticker-chip-btn"
              :class="{ active: selectedSticker === st }"
              @click="selectedSticker = st"
            >
              {{ st }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右側即時雙層畫布預覽與匯出區（只留角色，無任何預設文字） -->
    <div class="studio-canvas-col">
      <div class="canvas-stage-header">
        <div>
          <h4>🎨 小畫家角色畫布 ({{ CANVAS_W }} × {{ CANVAS_H }})</h4>
          <p class="canvas-stage-hint">
            畫布上僅保留角色立繪，可直接在角色周圍或身上自由塗鴉（橡皮擦只會擦除手繪筆跡，不會擦掉角色）
          </p>
        </div>
        <div class="canvas-export-btns">
          <button type="button" class="royal-util-btn" @click="copyCardToClipboard">
            {{ copySuccess ? '✅ 已複製圖片' : '📋 複製到剪貼簿' }}
          </button>
          <button type="button" class="btn-primary" @click="downloadCardPng">
            💾 下載 PNG 圖片
          </button>
        </div>
      </div>

      <div
        class="dual-canvas-container"
        :class="{ 'checkerboard-bg': selectedTheme === 'transparent' && !customBgImage }"
      >
        <canvas
          ref="baseCanvasRef"
          :width="CANVAS_W"
          :height="CANVAS_H"
          class="card-canvas-layer base-layer"
        ></canvas>

        <canvas
          ref="drawCanvasRef"
          :width="CANVAS_W"
          :height="CANVAS_H"
          class="card-canvas-layer draw-layer"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        ></canvas>
      </div>
    </div>
  </div>
</template>
