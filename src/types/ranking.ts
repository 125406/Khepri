export interface LocalRankCharacter {
  ocid: string
  name: string
  world: string
  job: string
  level: number
  expRate?: number
  image: string
  combatPower: number // Raw combat power integer
  combatPowerFormatted: string
  dojangFloor?: number
  unionLevel?: number
  popularity?: number
  updatedAt: number
}

export interface OfficialOverallRankingItem {
  ranking: number
  character_name: string
  world_name: string
  class_name: string
  sub_class_name?: string
  character_level: number
  character_exp?: number
  character_popularity?: number
  character_image?: string
}

export interface OfficialUnionRankingItem {
  ranking: number
  character_name: string
  world_name: string
  class_name: string
  sub_class_name?: string
  character_level: number
  character_image?: string
  union_level: number
  union_power?: number
}

export interface OfficialDojangRankingItem {
  ranking: number
  character_name: string
  world_name: string
  class_name: string
  sub_class_name?: string
  character_level: number
  character_image?: string
  dojang_floor: number
  dojang_time_record?: number
}

export interface OfficialGuildRankingItem {
  ranking: number
  guild_name: string
  world_name: string
  guild_level: number
  guild_master_name: string
  guild_mark?: string
  guild_point?: number
}

export type OfficialRankingType = 'overall' | 'union' | 'dojang' | 'guild'
