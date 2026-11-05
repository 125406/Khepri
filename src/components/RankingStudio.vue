<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { RealLeaderboardRow } from '../types/realLeaderboard'
import {
  fetchRealLeaderboard,
  queryRealRank,
  fetchRealLeaderboardBase,
} from '../services/realLeaderboardService'

const emit = defineEmits<{
  (e: 'select-character', name: string): void
}>()

// 排行榜模式：combat (戰力) | exp (等級) | union (聯盟戰地)
const currentMode = ref<'combat' | 'exp' | 'union'>('combat')
const selectedWorld = ref<string>('ALL')
const selectedClass = ref<string>('ALL')
const searchQuery = ref<string>('')
const isSearching = ref<boolean>(false)
const searchResultRow = ref<RealLeaderboardRow | null>(null)
const searchRankNumber = ref<number | null>(null)
const searchError = ref<string>('')

// 分頁與資料狀態：初始為空陣列，進入頁面時透過 API 動態讀取載入
const rows = ref<RealLeaderboardRow[]>([])
const totalCount = ref<number>(0)
const currentPage = ref<number>(1)
const pageSize = ref<number>(50)
const loading = ref<boolean>(true)
const errorMessage = ref<string>('')

// 動態伺服器與職業選單
const availableWorlds = ref<string[]>([])
const availableClasses = ref<string[]>([])

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))

onMounted(async () => {
  try {
    const meta = await fetchRealLeaderboardBase()
    availableWorlds.value = ['ALL', ...meta.worlds.filter((w) => !w.startsWith('Special'))]
    availableClasses.value = ['ALL', ...meta.classes]
  } catch {
    availableWorlds.value = ['ALL', '艾麗亞', '普力特', '琉德', '優依娜', '愛麗西亞', '殺人鯨']
  }
  await loadLeaderboard()
})

async function loadLeaderboard(page = 1) {
  loading.value = true
  errorMessage.value = ''
  currentPage.value = page
  const offset = (page - 1) * pageSize.value

  try {
    const res = await fetchRealLeaderboard({
      mode: currentMode.value,
      world: selectedWorld.value,
      className: selectedClass.value,
      offset,
      limit: pageSize.value,
    })
    rows.value = res.rows || []
    totalCount.value = res.total || 0
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '連線失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
}

function handleModeChange(mode: 'combat' | 'exp' | 'union') {
  if (currentMode.value === mode) return
  currentMode.value = mode
  searchResultRow.value = null
  searchRankNumber.value = null
  searchError.value = ''
  loadLeaderboard(1)
}

function handleFilterChange() {
  searchResultRow.value = null
  searchRankNumber.value = null
  searchError.value = ''
  loadLeaderboard(1)
}

async function handleSearchPersonalRank() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResultRow.value = null
    searchRankNumber.value = null
    searchError.value = ''
    return
  }

  isSearching.value = true
  searchError.value = ''
  searchResultRow.value = null
  searchRankNumber.value = null

  try {
    const res = await queryRealRank(q, currentMode.value)
    if (res.found && res.row) {
      searchResultRow.value = res.row
      searchRankNumber.value = res.rank
    } else {
      searchError.value = `找不到【${q}】在當前排行榜中的名次紀錄（可能尚未被資料庫收錄或未達上榜門檻）。`
    }
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : '查詢失敗'
  } finally {
    isSearching.value = false
  }
}

function clearPersonalSearch() {
  searchQuery.value = ''
  searchResultRow.value = null
  searchRankNumber.value = null
  searchError.value = ''
}

function inspectCharacter(name: string) {
  emit('select-character', name)
}

function formatCombatPower(cp?: number): string {
  if (!cp || cp <= 0) return '—'
  if (cp >= 100_000_000) {
    const yi = (cp / 100_000_000).toFixed(2)
    return `${yi} 億`
  }
  if (cp >= 10_000) {
    const wan = (cp / 10_000).toFixed(1)
    return `${wan} 萬`
  }
  return cp.toLocaleString()
}

function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'rank-badge-gold'
  if (rank === 2) return 'rank-badge-silver'
  if (rank === 3) return 'rank-badge-bronze'
  return 'rank-badge-default'
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}
</script>

<template>
  <div class="ranking-studio-container">
    <!-- Header Banner -->
    <header class="rank-header">
      <!-- Mode Switcher: 戰力 / 等級 / 戰地 -->
      <div class="rank-tab-switcher">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentMode === 'combat' }"
          @click="handleModeChange('combat')"
        >
          <span>🔥 戰鬥力排行</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentMode === 'exp' }"
          @click="handleModeChange('exp')"
        >
          <span>🎖️ 等級排行</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: currentMode === 'union' }"
          @click="handleModeChange('union')"
        >
          <span>🛡️ 聯盟戰地</span>
        </button>
      </div>
    </header>

    <!-- Toolbar: Search & Select Filters -->
    <section class="rank-section">
      <div class="rank-toolbar">
        <!-- Personal Rank Search Form -->
        <form class="search-box" @submit.prevent="handleSearchPersonalRank">
          <div class="search-input-wrap">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="輸入角色精確名稱查名次（例：吳獨秀x）..."
              class="rank-input"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="clear-btn"
              @click="clearPersonalSearch"
            >
              ✕
            </button>
          </div>
          <button type="submit" class="search-submit-btn" :disabled="isSearching">
            {{ isSearching ? '查詢中...' : '🔍 查名次' }}
          </button>
        </form>

        <!-- Dropdown filters -->
        <div class="dropdown-group">
          <select
            v-model="selectedWorld"
            class="rank-select"
            @change="handleFilterChange"
          >
            <option v-for="w in availableWorlds" :key="w" :value="w">
              {{ w === 'ALL' ? '全部伺服器' : w }}
            </option>
          </select>

          <select
            v-model="selectedClass"
            class="rank-select"
            @change="handleFilterChange"
          >
            <option v-for="c in availableClasses" :key="c" :value="c">
              {{ c === 'ALL' ? '全部職業' : c }}
            </option>
          </select>

          <button
            type="button"
            class="tool-btn-sm"
            :disabled="loading"
            @click="loadLeaderboard(currentPage)"
          >
            🔄 重新整理
          </button>
        </div>
      </div>

      <!-- Personal Search Result Pin Card -->
      <div v-if="searchResultRow" class="personal-rank-pin">
        <div class="pin-header">
          <span class="pin-badge">🎯 個人排名定位</span>
          <span class="pin-rank-text">
            在當前榜單排行第 <strong class="text-amber-400 font-extrabold text-base">#{{ searchRankNumber }}</strong> 名
          </span>
        </div>
        <div class="pin-body">
          <div class="char-cell">
            <div class="char-avatar-box">
              <img
                v-if="searchResultRow.character_image"
                :src="searchResultRow.character_image"
                :alt="searchResultRow.character_name"
                class="char-avatar-img"
              />
              <span v-else class="char-avatar-fallback">{{ searchResultRow.character_name.charAt(0) }}</span>
            </div>
            <div class="char-info">
              <span class="char-name text-base">{{ searchResultRow.character_name }}</span>
              <span class="char-level font-mono">
                {{ searchResultRow.world_name }} ｜ {{ searchResultRow.class }} ｜ Lv.{{ searchResultRow.level }}
              </span>
            </div>
          </div>
          <div class="pin-stats">
            <div class="stat-group">
              <span class="stat-label">最高戰鬥力</span>
              <span class="stat-val text-amber-400 font-extrabold">
                {{ formatCombatPower(searchResultRow.max_combat_power || searchResultRow.combat_power) }}
              </span>
            </div>
            <div v-if="searchResultRow.union_level" class="stat-group">
              <span class="stat-label">聯盟戰地</span>
              <span class="stat-val text-sky-400 font-bold">Lv.{{ searchResultRow.union_level }}</span>
            </div>
            <button
              type="button"
              class="inspect-btn-pin"
              @click="inspectCharacter(searchResultRow.character_name)"
            >
              🔍 立即深入查裝
            </button>
          </div>
        </div>
      </div>

      <!-- Search Error Banner -->
      <div v-if="searchError" class="search-error-banner">
        <span>⚠️ {{ searchError }}</span>
      </div>

      <!-- Tip & Stats bar -->
      <div class="rank-tip-bar">
        <span>
          💡 共收錄 <strong class="text-indigo-400 font-bold">{{ totalCount.toLocaleString() }}</strong> 位玩家紀錄。每頁顯示 {{ pageSize }} 筆。
        </span>
        <span class="count-badge">頁碼：第 {{ currentPage }} / {{ totalPages }} 頁</span>
      </div>

      <!-- Loading skeleton / Error state -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>正在載入全伺服器排行榜資料...</span>
      </div>

      <div v-else-if="errorMessage" class="error-state">
        <span>❌ {{ errorMessage }}</span>
        <button type="button" class="tool-btn-sm" @click="loadLeaderboard(currentPage)">重試</button>
      </div>

      <!-- Main Leaderboard Table -->
      <div v-else class="table-responsive">
        <table class="rank-table">
          <thead>
            <tr>
              <th class="col-rank">排名</th>
              <th class="col-character">角色基本資料</th>
              <th>伺服器</th>
              <th>職業</th>
              <th>等級 (Level)</th>
              <th v-if="currentMode === 'combat'">最高戰鬥力</th>
              <th v-if="currentMode === 'union'">聯盟總等級</th>
              <th v-if="currentMode === 'exp'">經驗值</th>
              <th class="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.ocid || row.character_name"
              class="rank-row"
              @click="inspectCharacter(row.character_name)"
            >
              <!-- Rank position -->
              <td class="col-rank">
                <span class="rank-badge" :class="getRankBadgeClass(row.rank)">
                  {{ getRankIcon(row.rank) }}
                </span>
              </td>

              <!-- Character details & avatar -->
              <td class="col-character">
                <div class="char-cell">
                  <div class="char-avatar-box">
                    <img
                      v-if="row.character_image"
                      :src="row.character_image"
                      :alt="row.character_name"
                      class="char-avatar-img"
                      loading="lazy"
                    />
                    <span v-else class="char-avatar-fallback">{{ row.character_name.charAt(0) }}</span>
                  </div>
                  <div class="char-info">
                    <span class="char-name">{{ row.character_name }}</span>
                    <span v-if="row.guild_name" class="char-guild">🏰 {{ row.guild_name }}</span>
                  </div>
                </div>
              </td>

              <!-- Server World -->
              <td>
                <span class="world-tag">{{ row.world_name }}</span>
              </td>

              <!-- Job Class -->
              <td>
                <span class="job-tag">{{ row.class }}</span>
              </td>

              <!-- Level & EXP rate -->
              <td>
                <div class="level-cell">
                  <span class="font-bold text-white">Lv.{{ row.level }}</span>
                  <span v-if="row.exp_rate !== undefined" class="text-xs text-slate-400 font-mono">
                    ({{ Number(row.exp_rate).toFixed(2) }}%)
                  </span>
                </div>
              </td>

              <!-- Mode specific metrics -->
              <td v-if="currentMode === 'combat'">
                <div class="cp-cell">
                  <span class="cp-highlight">
                    {{ formatCombatPower(row.max_combat_power || row.combat_power) }}
                  </span>
                  <span class="cp-raw">
                    ({{ (row.max_combat_power || row.combat_power || 0).toLocaleString() }})
                  </span>
                </div>
              </td>

              <td v-if="currentMode === 'union'">
                <span v-if="row.union_level" class="stat-pill union-pill font-bold">
                  🛡️ Lv.{{ row.union_level }}
                </span>
                <span v-else class="text-slate-500">—</span>
              </td>

              <td v-if="currentMode === 'exp'">
                <span class="text-xs font-mono text-slate-300">
                  {{ (row.exp || 0).toLocaleString() }}
                </span>
              </td>

              <!-- Action button -->
              <td class="col-action" @click.stop>
                <button
                  type="button"
                  class="inspect-btn"
                  title="立即查詢此角色全身神裝"
                  @click="inspectCharacter(row.character_name)"
                >
                  🔍 查裝
                </button>
              </td>
            </tr>

            <tr v-if="rows.length === 0">
              <td colspan="8" class="empty-cell">
                查無符合條件的排行榜角色。
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1 && !loading" class="pagination-bar">
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="loadLeaderboard(1)"
        >
          ⏮️ 首頁
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="loadLeaderboard(currentPage - 1)"
        >
          ◀ 上一頁
        </button>

        <span class="page-indicator">第 {{ currentPage }} / {{ totalPages }} 頁</span>

        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="loadLeaderboard(currentPage + 1)"
        >
          下一頁 ▶
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="loadLeaderboard(totalPages)"
        >
          末頁 ⏭️
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ranking-studio-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 48px;
}

/* Header */
.rank-header {
  position: relative;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 24px 28px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 900px) {
  .rank-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.rank-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.rank-title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.rank-subtitle {
  font-size: 13px;
  color: #94a3b8;
  max-width: 600px;
  line-height: 1.5;
}

/* Tab Switcher */
.rank-tab-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.8);
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(51, 65, 85, 0.8);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #ffffff;
}

.tab-btn.active {
  background: #4f46e5;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

/* Section & Toolbar */
.rank-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rank-toolbar {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 280px;
}

.search-input-wrap {
  position: relative;
  flex: 1;
}

.rank-input {
  width: 100%;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.8);
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  color: #ffffff;
  font-size: 13px;
}

.rank-input:focus {
  outline: none;
  border-color: #6366f1;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
}

.search-submit-btn {
  padding: 8px 14px;
  border-radius: 8px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.search-submit-btn:hover:not(:disabled) {
  background: #6366f1;
}

.dropdown-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-select {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(71, 85, 105, 0.8);
  border-radius: 8px;
  padding: 7px 10px;
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
}

.tool-btn-sm {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.8);
  border-radius: 8px;
  padding: 7px 10px;
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.tool-btn-sm:hover:not(:disabled) {
  background: rgba(51, 65, 85, 1);
  color: #ffffff;
}

/* Personal Rank Pin Banner */
.personal-rank-pin {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 1px solid rgba(129, 140, 248, 0.4);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.2);
}

.pin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pin-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
}

.pin-rank-text {
  font-size: 13px;
  color: #cbd5e1;
}

.pin-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pin-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-group {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: #94a3b8;
}

.stat-val {
  font-size: 14px;
}

.inspect-btn-pin {
  padding: 6px 14px;
  border-radius: 8px;
  background: #10b981;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.inspect-btn-pin:hover {
  background: #059669;
}

.search-error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 13px;
}

/* Tip bar */
.rank-tip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #94a3b8;
  padding: 0 4px;
}

.count-badge {
  color: #818cf8;
  font-weight: 700;
}

/* State boxes */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 14px;
  color: #94a3b8;
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Table */
.table-responsive {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 14px;
  overflow-x: auto;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.rank-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
  color: #cbd5e1;
}

.rank-table thead {
  background: rgba(30, 41, 59, 0.85);
  border-bottom: 1px solid rgba(51, 65, 85, 0.8);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.rank-table th,
.rank-table td {
  padding: 12px 16px;
}

.rank-row {
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  transition: background 0.15s;
  cursor: pointer;
}

.rank-row:hover {
  background: rgba(30, 41, 59, 0.6);
}

/* Columns */
.col-rank {
  width: 70px;
  text-align: center;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 14px;
}

.rank-badge-gold {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.6);
  font-size: 18px;
}

.rank-badge-silver {
  background: rgba(148, 163, 184, 0.2);
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 18px;
}

.rank-badge-bronze {
  background: rgba(180, 83, 9, 0.2);
  border: 1px solid rgba(180, 83, 9, 0.6);
  font-size: 18px;
}

.rank-badge-default {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  color: #94a3b8;
  font-size: 12px;
}

.char-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.char-avatar-box {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(71, 85, 105, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.char-avatar-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.char-avatar-fallback {
  font-size: 16px;
  font-weight: 800;
  color: #64748b;
}

.char-info {
  display: flex;
  flex-direction: column;
}

.char-name {
  font-weight: 800;
  color: #ffffff;
  font-size: 14px;
}

.char-guild {
  font-size: 11px;
  color: #818cf8;
}

.job-tag {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.world-tag {
  font-size: 11px;
  color: #94a3b8;
}

.level-cell {
  display: flex;
  flex-direction: column;
}

.cp-cell {
  display: flex;
  flex-direction: column;
}

.cp-highlight {
  font-weight: 800;
  color: #fbbf24;
  font-size: 14px;
}

.cp-raw {
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
}

.union-pill {
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.35);
  color: #7dd3fc;
}

.col-action {
  width: 80px;
  text-align: center;
}

.inspect-btn {
  padding: 5px 12px;
  border-radius: 6px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.inspect-btn:hover {
  background: #6366f1;
}

.empty-cell {
  text-align: center;
  padding: 48px;
  color: #64748b;
  font-size: 14px;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.page-btn {
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.6);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #4f46e5;
  color: #ffffff;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 12px;
  color: #94a3b8;
  padding: 0 8px;
}
</style>
