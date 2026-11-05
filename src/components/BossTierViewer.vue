<script setup lang="ts">
import '../boss-tailwind.css';
import { ref, computed } from 'vue';
import { BOSS_TIER_DATA, CATEGORY_LABELS, DIFFICULTY_LABELS, getBossIconUrl, type BossTierItem } from '../data/bossTierData';

// Track icons that failed to load so we can show the text fallback instead
const brokenIcons = ref<Set<string>>(new Set());
const iconFor = (boss: BossTierItem) => {
  const url = getBossIconUrl(boss);
  return url && !brokenIcons.value.has(url) ? url : null;
};
const markIconBroken = (boss: BossTierItem) => {
  const url = getBossIconUrl(boss);
  if (!url) return;
  const next = new Set(brokenIcons.value);
  next.add(url);
  brokenIcons.value = next;
};

// User search & filters
const searchQuery = ref('');
const selectedCategory = ref<string>('ALL');
const selectedDifficulty = ref<string>('ALL');
const viewMode = ref<'card' | 'table' | 'visual'>('card');

// Filtered bosses
const filteredBosses = computed(() => {
  return BOSS_TIER_DATA.filter(boss => {
    // category filter
    if (selectedCategory.value !== 'ALL' && boss.category !== selectedCategory.value) {
      return false;
    }
    // difficulty filter
    if (selectedDifficulty.value !== 'ALL' && boss.difficulty !== selectedDifficulty.value) {
      return false;
    }
    // search filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      const matchName = boss.name.toLowerCase().includes(q);
      const matchDiff = boss.difficulty.toLowerCase().includes(q);
      const matchHp = boss.hpText.toLowerCase().includes(q);
      const matchNotes = boss.notes.toLowerCase().includes(q);
      const matchOrder = String(boss.order) === q;
      if (!matchName && !matchDiff && !matchHp && !matchNotes && !matchOrder) {
        return false;
      }
    }
    return true;
  });
});

// Modal for full details / image preview
const inspectingBoss = ref<BossTierItem | null>(null);
const openBossDetail = (boss: BossTierItem) => {
  inspectingBoss.value = boss;
};
const closeBossDetail = () => {
  inspectingBoss.value = null;
};
</script>

<template>
  <div class="boss-tier-container max-w-7xl mx-auto px-4 py-6">
    <!-- Toolbar: Filters, search, and view switcher -->
    <div class="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 mb-6 shadow-lg flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
      <!-- Search input -->
      <div class="relative flex-1 max-w-md">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="搜尋首領名稱、難度、血量或機制 (例: 賽連 / 300% / 鎖血)..."
          class="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
        <button 
          v-for="(cat, key) in CATEGORY_LABELS"
          :key="key"
          @click="selectedCategory = key"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border"
          :class="selectedCategory === key 
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' 
            : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800'"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- View Switcher -->
      <div class="inline-flex rounded-lg bg-slate-800/80 p-1 border border-slate-700/80 self-end md:self-auto">
        <button 
          @click="viewMode = 'card'"
          :class="viewMode === 'card' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'"
          class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1"
          title="卡片檢視"
        >
          <span>🃏 卡片</span>
        </button>
        <button 
          @click="viewMode = 'table'"
          :class="viewMode === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'"
          class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1"
          title="清單列表"
        >
          <span>📋 表格</span>
        </button>
        <button 
          @click="viewMode = 'visual'"
          :class="viewMode === 'visual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'"
          class="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1"
          title="完整圖卡"
        >
          <span>🖼️ 原圖</span>
        </button>
      </div>
    </div>

    <!-- Active filter stats -->
    <div class="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
      <div>
        顯示 <span class="font-bold text-indigo-400">{{ filteredBosses.length }}</span> 筆首領資料
        <span v-if="searchQuery || selectedCategory !== 'ALL'">（已篩選）</span>
      </div>
    </div>

    <!-- VIEW 1: Card Grid -->
    <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="boss in filteredBosses"
        :key="boss.id"
        class="group relative bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:border-indigo-500/50 flex flex-col justify-between"
      >
        <!-- Top bar: Order, Name, Difficulty badge -->
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-12 h-12 shrink-0 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center overflow-hidden">
                <img
                  v-if="iconFor(boss)"
                  :src="iconFor(boss)!"
                  :alt="boss.name"
                  loading="lazy"
                  class="max-w-full max-h-full object-contain"
                  @error="markIconBroken(boss)"
                />
                <span v-else class="text-lg font-black text-slate-500">{{ boss.name.charAt(0) }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                #{{ boss.order }}
              </span>
              <h3 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                {{ boss.name }}
              </h3>
            </div>
            
            <div class="flex items-center gap-1.5">
              <span 
                class="px-2 py-0.5 rounded text-[11px] font-bold border"
                :class="DIFFICULTY_LABELS[boss.difficulty]?.bg || 'bg-slate-800 text-slate-300 border-slate-700'"
              >
                {{ boss.difficulty }}
              </span>
            </div>
          </div>

          <!-- Main attributes row -->
          <div class="grid grid-cols-2 gap-2 my-3 text-xs">
            <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-800">
              <span class="text-slate-400 block mb-0.5">總體估計血量</span>
              <span class="font-extrabold text-amber-400 text-sm">{{ boss.hpText || '特殊機制' }}</span>
            </div>
            <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-800">
              <span class="text-slate-400 block mb-0.5">防禦率 / 等級</span>
              <span class="font-semibold text-slate-200">{{ boss.defense }} <span class="text-slate-500 text-[11px]">(Lv.{{ boss.level }})</span></span>
            </div>
            <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-800">
              <span class="text-slate-400 block mb-0.5">ARC / AUT 需求</span>
              <span v-if="boss.aut > 0" class="font-semibold text-purple-400">AUT {{ boss.aut }}</span>
              <span v-else-if="boss.arc > 0" class="font-semibold text-cyan-400">ARC {{ boss.arc }}</span>
              <span v-else class="text-slate-400">無特殊需求</span>
            </div>
            <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-800">
              <span class="text-slate-400 block mb-0.5">結晶石價格 (單人)</span>
              <span class="font-semibold text-emerald-400 truncate block">{{ boss.mesoPrice }}</span>
            </div>
          </div>
        </div>

        <!-- Footer button to preview author's card image -->
        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span class="text-slate-400 text-[11px]">基準: 20分鐘通關</span>
          <button 
            @click="openBossDetail(boss)"
            class="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <span>查看作者圖卡</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- VIEW 2: Table List -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl">
      <table class="w-full text-left text-xs sm:text-sm text-slate-300">
        <thead class="bg-slate-800/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-700">
          <tr>
            <th class="py-3 px-3 w-16">層級</th>
            <th class="py-3 px-4">首領名稱</th>
            <th class="py-3 px-3">難度</th>
            <th class="py-3 px-4">總血量</th>
            <th class="py-3 px-3">等級 / 防禦</th>
            <th class="py-3 px-3">ARC / AUT</th>
            <th class="py-3 px-4">單人結晶價格</th>
            <th class="py-3 px-3 text-center">圖卡</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80">
          <tr 
            v-for="boss in filteredBosses"
            :key="boss.id"
            class="hover:bg-slate-800/40 transition-colors"
          >
            <td class="py-3 px-3 font-mono font-bold text-slate-400">#{{ boss.order }}</td>
            <td class="py-3 px-4 font-bold text-white whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 shrink-0 rounded bg-slate-800/80 flex items-center justify-center overflow-hidden">
                  <img
                    v-if="iconFor(boss)"
                    :src="iconFor(boss)!"
                    :alt="boss.name"
                    loading="lazy"
                    class="max-w-full max-h-full object-contain"
                    @error="markIconBroken(boss)"
                  />
                  <span v-else class="text-xs font-black text-slate-500">{{ boss.name.charAt(0) }}</span>
                </div>
                <span>{{ boss.name }}</span>
              </div>
            </td>
            <td class="py-3 px-3">
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap"
                :class="DIFFICULTY_LABELS[boss.difficulty]?.bg || 'bg-slate-800 text-slate-300 border-slate-700'"
              >
                {{ boss.difficulty }}
              </span>
            </td>
            <td class="py-3 px-4 font-extrabold text-amber-400 whitespace-nowrap">{{ boss.hpText || '-' }}</td>
            <td class="py-3 px-3 text-slate-300 whitespace-nowrap">Lv.{{ boss.level }} / {{ boss.defense }}</td>
            <td class="py-3 px-3 whitespace-nowrap">
              <span v-if="boss.aut > 0" class="text-purple-400 font-semibold">AUT {{ boss.aut }}</span>
              <span v-else-if="boss.arc > 0" class="text-cyan-400 font-semibold">ARC {{ boss.arc }}</span>
              <span v-else class="text-slate-400">-</span>
            </td>
            <td class="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">{{ boss.mesoPrice }}</td>
            <td class="py-3 px-3 text-center">
              <button 
                @click="openBossDetail(boss)"
                class="text-indigo-400 hover:text-indigo-300 underline text-xs"
              >
                檢視
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- VIEW 3: Visual Original Card View -->
    <div v-else-if="viewMode === 'visual'" class="space-y-6">
      <div class="bg-indigo-950/30 border border-indigo-900/60 rounded-xl p-4 text-xs text-indigo-300 flex items-center justify-between">
        <span>💡 此模式展示巴哈論壇作者「最後的Mercy」製作之高清晰排版原圖卡片，包含階段血量拆解與掉落清單。</span>
        <span class="text-slate-400">每張圖卡對應一個層級</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          v-for="boss in filteredBosses"
          :key="boss.id"
          class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all hover:border-indigo-500/50"
        >
          <div class="p-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-indigo-600/40 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/40">
                #{{ boss.order }}
              </span>
              <span class="font-bold text-white text-sm">{{ boss.name }}</span>
              <span class="text-xs text-slate-400 font-mono">({{ boss.difficulty }})</span>
            </div>
          </div>
          
          <div class="p-3 bg-slate-950 flex items-center justify-center">
            <img 
              :src="boss.cardImageUrl"
              referrerpolicy="no-referrer"
              :alt="`${boss.name} 原圖卡片`"
              loading="lazy"
              class="w-full h-auto rounded object-contain max-h-56 cursor-zoom-in"
              @click="openBossDetail(boss)"
            />
          </div>

          <div class="p-3 text-xs bg-slate-900/70 border-t border-slate-800/80 flex items-center justify-between text-slate-300">
            <span>血量: <strong class="text-amber-400">{{ boss.hpText }}</strong></span>
            <span>防禦: <strong>{{ boss.defense }}</strong></span>
            <span>結晶: <strong class="text-emerald-400">{{ boss.mesoPrice }}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox / Detail Modal -->
    <div 
      v-if="inspectingBoss"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeBossDetail"
    >
      <div class="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <button 
          @click="closeBossDetail"
          class="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
        >
          ✕
        </button>

        <div class="flex items-center gap-3 mb-4">
          <img
            v-if="iconFor(inspectingBoss)"
            :src="iconFor(inspectingBoss)!"
            :alt="inspectingBoss.name"
            class="w-16 h-16 object-contain rounded-lg bg-slate-800/80 border border-slate-700"
            @error="markIconBroken(inspectingBoss)"
          />
          <span class="px-2.5 py-1 rounded text-sm font-mono font-bold bg-indigo-600 text-white">
            Rank #{{ inspectingBoss.order }}
          </span>
          <h2 class="text-2xl font-black text-white">
            {{ inspectingBoss.name }}
          </h2>
          <span 
            class="px-2.5 py-0.5 rounded text-xs font-bold border"
            :class="DIFFICULTY_LABELS[inspectingBoss.difficulty]?.bg"
          >
            {{ inspectingBoss.difficulty }}
          </span>
        </div>

        <!-- Full Original Card Image -->
        <div class="bg-slate-950 rounded-xl p-2 border border-slate-800 my-4 flex items-center justify-center">
          <img 
            :src="inspectingBoss.cardImageUrl"
            referrerpolicy="no-referrer"
            :alt="inspectingBoss.name" 
            class="max-w-full h-auto rounded"
          />
        </div>

        <!-- Detail specs grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs my-4">
          <div class="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span class="text-slate-400 block mb-1">估計總血量</span>
            <span class="text-amber-400 font-extrabold text-base">{{ inspectingBoss.hpText }}</span>
          </div>
          <div class="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span class="text-slate-400 block mb-1">防禦率 / 等級</span>
            <span class="text-white font-bold text-base">{{ inspectingBoss.defense }} <span class="text-xs text-slate-400">(Lv.{{ inspectingBoss.level }})</span></span>
          </div>
          <div class="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span class="text-slate-400 block mb-1">神秘 / 原初需求</span>
            <span v-if="inspectingBoss.aut > 0" class="text-purple-400 font-bold text-base">AUT {{ inspectingBoss.aut }}</span>
            <span v-else-if="inspectingBoss.arc > 0" class="text-cyan-400 font-bold text-base">ARC {{ inspectingBoss.arc }}</span>
            <span v-else class="text-slate-400 font-bold text-base">無特殊要求</span>
          </div>
          <div class="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span class="text-slate-400 block mb-1">結晶石收益</span>
            <span class="text-emerald-400 font-bold text-base">{{ inspectingBoss.mesoPrice }}</span>
          </div>
        </div>

        <div class="mt-6 flex justify-end items-center pt-4 border-t border-slate-800">
          <button 
            @click="closeBossDetail"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
