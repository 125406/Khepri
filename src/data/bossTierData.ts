export interface BossTierItem {
  order: number;
  id: string;
  name: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'CHAOS' | 'EXTREME' | 'SPECIAL';
  category: 'EARLY' | 'MID' | 'ARC' | 'AUT';
  level: number;
  defense: string;
  hpText: string;
  arc: number;
  aut: number;
  mesoPrice: string;
  cardImageUrl: string;
  notes: string;
  targetTime: string;
}

import bossDataRaw from './bossTierData.json';

export const BOSS_TIER_DATA: BossTierItem[] = bossDataRaw as BossTierItem[];

// maplestory.io mob icon API: https://maplestory.io/api/{region}/{version}/mob/{mobId}/icon
const MOB_API_BASE = 'https://maplestory.io/api';
const DEFAULT_MOB_SOURCE = 'TWMS/256';

/**
 * Boss name (without the "(史詩副本)" style suffix) -> mob id.
 * IDs verified against TWMS/256 (non-blank icon). Entries with a `region/version`
 * prefix use that source instead (e.g. bosses only present in KMS data).
 * Bosses not yet available on maplestory.io are omitted and fall back to a text badge.
 */
const BOSS_MOB_IDS: Record<string, number | string> = {
  '沼澤巨鱷': 6220000,
  '火蚌殼': 4220000,
  '西格諾斯': 8850011,
  '希拉': 8870000,
  '殘暴炎魔': 8800000,
  '皮卡啾': 8820001,
  '斑斑': 8910100,
  '血腥皇后': 8920100,
  '比艾樂': 8900100,
  '梅格耐斯': 8880000,
  '貝倫': 9303159,
  '濃姬': 9450022,
  '拉圖斯': 8500022,
  '史烏': 8240099,
  '戴米安': 8880101,
  '守護天使綠水靈': 8880711,
  '露希妲': 8880150,
  '威爾': 8880301,
  '戴斯克': 8950116,
  '頓凱爾': 8645009,
  '真·希拉': 8880405,
  '受選的賽連': 8880600,
  '監視者卡洛斯': 8880803,
  '黑魔法師': 8880532,
  '咖凌': 8880837,
  '林波': 'KMS/389/8645436',
};

const baseBossName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim();

export const getBossIconUrl = (boss: Pick<BossTierItem, 'name'>): string | null => {
  const entry = BOSS_MOB_IDS[baseBossName(boss.name)];
  if (entry === undefined) return null;
  if (typeof entry === 'number') return `${MOB_API_BASE}/${DEFAULT_MOB_SOURCE}/mob/${entry}/icon`;
  const parts = entry.split('/');
  const id = parts.pop();
  return `${MOB_API_BASE}/${parts.join('/')}/mob/${id}/icon`;
};

export const CATEGORY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  ALL: { label: '全部層級', desc: '全69階 BOSS 排行', color: '#6366f1' },
  EARLY: { label: '初階周王', desc: '沼澤巨鱷～混貝/混鐘 (Rank 1-14)', color: '#10b981' },
  MID: { label: '中階周王', desc: '普史戴～普威/高山 (Rank 15-20)', color: '#06b6d4' },
  ARC: { label: '高階 ARC 首領', desc: '困史戴～困真希拉 (Rank 21-36)', color: '#8b5cf6' },
  AUT: { label: '頂級 AUT / 新世代首領', desc: '普賽蓮～極限瑪麗西亞 (Rank 37-69)', color: '#f59e0b' }
};

export const DIFFICULTY_LABELS: Record<string, { label: string; bg: string }> = {
  EASY: { label: 'EASY', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' },
  NORMAL: { label: 'NORMAL', bg: 'bg-sky-950/80 text-sky-300 border-sky-600/50' },
  HARD: { label: 'HARD', bg: 'bg-rose-950/80 text-rose-300 border-rose-600/50' },
  CHAOS: { label: 'CHAOS', bg: 'bg-purple-950/80 text-purple-300 border-purple-600/50' },
  EXTREME: { label: 'EXTREME', bg: 'bg-amber-950/90 text-amber-300 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  SPECIAL: { label: 'SPECIAL', bg: 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50' }
};
