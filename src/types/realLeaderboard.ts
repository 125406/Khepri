export interface RealLeaderboardRow {
  rank: number
  ocid: string
  character_name: string
  world_name: string
  class: string
  guild_name?: string
  level: number
  exp?: number
  exp_rate?: number
  combat_power?: number
  current_combat_power?: number
  yesterday_combat_power?: number
  max_combat_power?: number
  character_image?: string
  union_level?: number
  fetched_at?: string
}

export interface RealLeaderboardResponse {
  ok: boolean
  mode: 'combat' | 'exp' | 'union'
  world?: string
  class?: string
  limit: number
  offset: number
  total: number
  db_total?: number
  updatedAt?: string
  rows: RealLeaderboardRow[]
}

export interface RealRankQueryResponse {
  ok: boolean
  found: boolean
  rank: number
  row?: RealLeaderboardRow
}
