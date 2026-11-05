import type { RealLeaderboardResponse, RealRankQueryResponse } from '../types/realLeaderboard'

const LB_API_BASE = 'https://ezraouo3.ddns.net'

export interface FetchRealLeaderboardParams {
  mode: 'combat' | 'exp' | 'union'
  world?: string
  className?: string
  offset?: number
  limit?: number
}

export async function fetchRealLeaderboard(
  params: FetchRealLeaderboardParams
): Promise<RealLeaderboardResponse> {
  const { mode = 'combat', world, className, offset = 0, limit = 50 } = params

  const url = new URL(`${LB_API_BASE}/leaderboard`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('limit', String(limit))
  if (world && world !== 'ALL') url.searchParams.set('world', world)
  if (className && className !== 'ALL') url.searchParams.set('class', className)

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`排行榜資料讀取失敗 (HTTP ${res.status})`)
  }
  return (await res.json()) as RealLeaderboardResponse
}

export async function queryRealRank(
  name: string,
  mode: 'combat' | 'exp' | 'union' = 'combat'
): Promise<RealRankQueryResponse> {
  const url = new URL(`${LB_API_BASE}/rank`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('q', name.trim())

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`個人排名查詢失敗 (HTTP ${res.status})`)
  }
  return (await res.json()) as RealRankQueryResponse
}

export async function fetchRealLeaderboardBase(): Promise<{ worlds: string[]; classes: string[] }> {
  try {
    const url = new URL(`${LB_API_BASE}/leaderboard_base?limit=1`)
    const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      return {
        worlds: Array.isArray(data.worlds) ? data.worlds : [],
        classes: Array.isArray(data.classes) ? data.classes : [],
      }
    }
  } catch {
    // fallback
  }
  return {
    worlds: ['艾麗亞', '普力特', '琉德', '優依娜', '愛麗西亞', '殺人鯨'],
    classes: [],
  }
}
