<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UnionRaiderBlock } from '../types/nexon'

const props = defineProps<{
  blocks?: UnionRaiderBlock[]
  occupiedStats?: string[]
  raiderStats?: string[]
}>()

// 楓之谷聯盟戰地規格：22 欄 (X: -11 ~ 10, CSS col: 1 ~ 22) x 20 列 (Y: 10 ~ -9, CSS row: 1 ~ 20)
// 官方座標轉換：col = x + 12, row = 11 - y
const COLS = 22
const ROWS = 20

// 顏色映射：依職業群區分方塊色彩
function getBlockColor(type: string | null | undefined): { bg: string; border: string; text: string } {
  switch (type) {
    case '劍士':
    case 'Warrior':
      return { bg: 'rgba(239, 68, 68, 0.85)', border: '#f87171', text: '#fee2e2' }
    case '法師':
    case 'Magician':
      return { bg: 'rgba(59, 130, 246, 0.85)', border: '#60a5fa', text: '#dbeafe' }
    case '弓箭手':
    case 'Bowman':
      return { bg: 'rgba(34, 197, 94, 0.85)', border: '#4ade80', text: '#dcfce7' }
    case '盜賊':
    case 'Thief':
      return { bg: 'rgba(168, 85, 247, 0.85)', border: '#c084fc', text: '#f3e8ff' }
    case '海盜':
    case 'Pirate':
      return { bg: 'rgba(245, 158, 11, 0.85)', border: '#fbbf24', text: '#fef3c7' }
    case '混合':
    case 'Hybrid':
      return { bg: 'rgba(236, 72, 153, 0.85)', border: '#f472b6', text: '#fce7f3' }
    default:
      return { bg: 'rgba(249, 115, 22, 0.85)', border: '#fb923c', text: '#ffedd5' }
  }
}

// 區塊懸浮 Tooltip 狀態
const hoveredBlock = ref<UnionRaiderBlock | null>(null)
const mousePos = ref<{ x: number; y: number }>({ x: 0, y: 0 })

function handleMouseMove(e: MouseEvent, block: UnionRaiderBlock) {
  hoveredBlock.value = block
  mousePos.value = { x: e.clientX + 14, y: e.clientY + 14 }
}

function handleMouseLeave() {
  hoveredBlock.value = null
}

// 整理所有放置於棋盤上的格子像素
interface OccupiedCell {
  col: number
  row: number
  block: UnionRaiderBlock
  color: { bg: string; border: string; text: string }
  isControlPoint: boolean
}

const placedCells = computed<OccupiedCell[]>(() => {
  const result: OccupiedCell[] = []
  if (!props.blocks || props.blocks.length === 0) return result

  for (const block of props.blocks) {
    const color = getBlockColor(block.block_type)
    const positions = block.block_position || []
    const ctrl = block.block_control_point

    for (const pos of positions) {
      // 轉換成 1-based CSS Grid 索引
      const col = pos.x + 12
      const row = 11 - pos.y

      if (col >= 1 && col <= COLS && row >= 1 && row <= ROWS) {
        const isCtrl = ctrl ? ctrl.x === pos.x && ctrl.y === pos.y : false
        result.push({
          col,
          row,
          block,
          color,
          isControlPoint: isCtrl,
        })
      }
    }
  }
  return result
})

// 統計資訊
const totalOccupiedCount = computed(() => placedCells.value.length)
const placedCharacterCount = computed(() => {
  if (!props.blocks) return 0
  return props.blocks.filter((b) => b.block_position && b.block_position.length > 0).length
})
</script>

<template>
  <div class="union-board-viewer">
    <!-- 棋盤頂部功能與數據列 -->
    <div class="board-header">
      <div class="header-title-wrap">
        <h3 class="board-title">
          <span class="icon">🧩</span>
          <span>聯盟戰地棋盤 (Synergy Grid)</span>
        </h3>
        <span class="board-subtitle">22 × 20 攻擊隊拼盤實際擺放</span>
      </div>

      <div class="board-stats-badges">
        <div class="stat-badge">
          <span class="badge-label">參戰角色:</span>
          <span class="badge-value text-indigo-400">{{ placedCharacterCount }} 隻</span>
        </div>
        <div class="stat-badge">
          <span class="badge-label">佔領格數:</span>
          <span class="badge-value text-amber-400">{{ totalOccupiedCount }} 格</span>
        </div>
      </div>
    </div>

    <!-- 職業類別顏色圖例 -->
    <div class="board-legend-bar">
      <div class="legend-item"><span class="legend-dot warrior"></span>劍士</div>
      <div class="legend-item"><span class="legend-dot magician"></span>法師</div>
      <div class="legend-item"><span class="legend-dot bowman"></span>弓箭手</div>
      <div class="legend-item"><span class="legend-dot thief"></span>盜賊</div>
      <div class="legend-item"><span class="legend-dot pirate"></span>海盜</div>
      <div class="legend-item"><span class="legend-dot hybrid"></span>混合 / 傑諾</div>
    </div>

    <!-- 22x20 戰地棋盤畫布外層滾動容器 -->
    <div class="board-canvas-scroll-wrapper">
      <div class="union-grid-stage">
        <!-- 1. 背景 8 大外圈 + 8 大內圈固定區域名稱標籤 -->
        <div class="outer-label-tag label-boss-dmg">BOSS 傷害</div>
        <div class="outer-label-tag label-buff-dur">加持時間</div>
        <div class="outer-label-tag label-crit-dmg">爆擊傷害</div>
        <div class="outer-label-tag label-ied">無視防禦</div>
        <div class="outer-label-tag label-exp">獲得經驗值</div>
        <div class="outer-label-tag label-crit-rate">爆擊機率</div>
        <div class="outer-label-tag label-abnormal">狀態抗性</div>
        <div class="outer-label-tag label-normal-dmg">一般怪傷害</div>

        <!-- 2. 棋盤中央 4 格起點高光區域 (x: 0, -1; y: 0, 1) -> col: 11, 12; row: 10, 11 -->
        <div class="center-core-glow"></div>

        <!-- 3. 22x20 空格底盤背景格線 (22 x 20 = 440 格) -->
        <div class="grid-mesh-background">
          <div
            v-for="idx in 440"
            :key="idx"
            class="mesh-cell"
            :class="{
              'is-inner-quadrant': Math.ceil(idx / 22) >= 6 && Math.ceil(idx / 22) <= 15 && ((idx - 1) % 22) + 1 >= 6 && ((idx - 1) % 22) + 1 <= 17,
              'is-center-node': Math.ceil(idx / 22) >= 10 && Math.ceil(idx / 22) <= 11 && ((idx - 1) % 22) + 1 >= 11 && ((idx - 1) % 22) + 1 <= 12,
            }"
          ></div>
        </div>

        <!-- 4. 角色攻擊隊方塊實體渲染 (根據 block_position 映射) -->
        <div class="grid-blocks-layer">
          <div
            v-for="(cell, cIdx) in placedCells"
            :key="cIdx"
            class="occupied-block-cell"
            :style="{
              gridColumnStart: cell.col,
              gridRowStart: cell.row,
              backgroundColor: cell.color.bg,
              borderColor: cell.color.border,
            }"
            @mousemove="handleMouseMove($event, cell.block)"
            @mouseleave="handleMouseLeave"
          >
            <!-- 核心樞紐微小指示光點 -->
            <span v-if="cell.isControlPoint" class="control-pivot-dot"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮動 Tooltip 提示角色名稱與等級 -->
    <div
      v-if="hoveredBlock"
      class="block-hover-tooltip"
      :style="{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }"
    >
      <div class="tooltip-header">
        <span class="tt-class">{{ hoveredBlock.block_class || '戰地角色' }}</span>
        <span class="tt-level">Lv.{{ hoveredBlock.block_level }}</span>
      </div>
      <div class="tooltip-type">職業群：{{ hoveredBlock.block_type }}</div>
      <div class="tooltip-count">佔據格數：{{ hoveredBlock.block_position?.length || 0 }} 格</div>
    </div>
  </div>
</template>

<style scoped>
.union-board-viewer {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 22px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.board-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.board-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
}

.board-stats-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-badge {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

.badge-label {
  color: #94a3b8;
}

.badge-value {
  font-weight: 700;
}

/* 圖例 */
.board-legend-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot.warrior { background: #ef4444; border: 1px solid #f87171; }
.legend-dot.magician { background: #3b82f6; border: 1px solid #60a5fa; }
.legend-dot.bowman { background: #22c55e; border: 1px solid #4ade80; }
.legend-dot.thief { background: #a855f7; border: 1px solid #c084fc; }
.legend-dot.pirate { background: #f59e0b; border: 1px solid #fbbf24; }
.legend-dot.hybrid { background: #ec4899; border: 1px solid #f472b6; }

/* 棋盤主舞台 */
.board-canvas-scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 10px 0;
  display: flex;
  justify-content: center;
}

.union-grid-stage {
  position: relative;
  width: 660px;
  height: 600px;
  background: #090d16;
  border: 2px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8), 0 12px 24px rgba(0, 0, 0, 0.5);
}

/* 8 大外圈區域標籤浮水印 */
.outer-label-tag {
  position: absolute;
  font-size: 0.76rem;
  font-weight: 800;
  color: rgba(148, 163, 184, 0.28);
  pointer-events: none;
  z-index: 2;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

.label-boss-dmg { top: 12px; right: 24px; }
.label-buff-dur { top: 40%; right: 14px; transform: translateY(-50%); }
.label-crit-dmg { bottom: 12px; right: 24px; }
.label-ied { bottom: 12px; left: 24px; }
.label-exp { top: 40%; left: 14px; transform: translateY(-50%); }
.label-crit-rate { top: 12px; left: 24px; }
.label-abnormal { top: 12px; left: 45%; transform: translateX(-50%); }
.label-normal-dmg { bottom: 12px; left: 45%; transform: translateX(-50%); }

/* 中心起點高光 */
.center-core-glow {
  position: absolute;
  top: 45%;
  left: 45.4%;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}

/* 22x20 底層格線網格 */
.grid-mesh-background {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(22, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  background: rgba(30, 41, 59, 0.35);
  padding: 4px;
}

.mesh-cell {
  background: #0d1526;
  border-radius: 1px;
  transition: background 0.15s;
}

/* 內側核心 12x10 區域顏色略深作對比 */
.mesh-cell.is-inner-quadrant {
  background: #111d35;
}

.mesh-cell.is-center-node {
  background: rgba(245, 158, 11, 0.18);
  border: 1px dashed rgba(245, 158, 11, 0.45);
}

/* 頂層角色方塊圖層 */
.grid-blocks-layer {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(22, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  padding: 4px;
  z-index: 10;
  pointer-events: none;
}

.occupied-block-cell {
  border-radius: 2px;
  border: 1px solid;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.25), 0 2px 5px rgba(0, 0, 0, 0.35);
  position: relative;
  transition: transform 0.1s, filter 0.1s;
}

.occupied-block-cell:hover {
  transform: scale(1.12);
  filter: brightness(1.25);
  z-index: 20;
}

.control-pivot-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 5px;
  height: 5px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 6px #ffffff;
}

/* Tooltip */
.block-hover-tooltip {
  position: fixed;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(129, 140, 248, 0.6);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  min-width: 140px;
  backdrop-filter: blur(8px);
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 3px;
}

.tt-class {
  font-weight: 800;
  font-size: 0.9rem;
  color: #f8fafc;
}

.tt-level {
  font-size: 0.75rem;
  color: #fbbf24;
  font-weight: 700;
}

.tooltip-type,
.tooltip-count {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .union-board-viewer {
    padding: 12px 8px;
  }
  .union-grid-stage {
    width: 550px;
    height: 500px;
  }
}
</style>
