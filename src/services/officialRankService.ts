import type {
  OfficialDojangRankingItem,
  OfficialGuildRankingItem,
  OfficialOverallRankingItem,
  OfficialUnionRankingItem,
} from '../types/ranking'
import {
  DEMO_OFFICIAL_DOJANG,
  DEMO_OFFICIAL_GUILD,
  DEMO_OFFICIAL_OVERALL,
  DEMO_OFFICIAL_UNION,
} from '../data/demoOfficialRanking'

const BASE_URL = 'https://open.api.nexon.com'

export interface FetchOfficialRankingParams {
  rankingType: 'overall' | 'union' | 'dojang' | 'guild'
  date?: string
  worldName?: string
  worldType?: number
  className?: string
  ocid?: string
  page?: number
  apiKey?: string
}

export async function fetchOfficialOverallRanking(
  params: FetchOfficialRankingParams
): Promise<OfficialOverallRankingItem[]> {
  const { date, worldName, worldType, className, ocid, page = 1, apiKey } = params

  if (!apiKey || apiKey.trim() === '') {
    return filterOverallDemo(worldName, className)
  }

  const url = new URL(`${BASE_URL}/maplestory/v1/ranking/overall`)
  if (date) url.searchParams.set('date', date)
  if (worldName) url.searchParams.set('world_name', worldName)
  if (worldType !== undefined) url.searchParams.set('world_type', String(worldType))
  if (className) url.searchParams.set('class', className)
  if (ocid) url.searchParams.set('ocid', ocid)
  url.searchParams.set('page', String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': apiKey.trim(),
      },
    })
    if (!res.ok) {
      console.warn('Official ranking API call not available with current key, using cached demo data.')
      return filterOverallDemo(worldName, className)
    }
    const data = (await res.json()) as { ranking?: OfficialOverallRankingItem[] }
    return data.ranking || []
  } catch (err) {
    console.warn('Network error fetching official ranking, using cached demo data:', err)
    return filterOverallDemo(worldName, className)
  }
}

export async function fetchOfficialUnionRanking(
  params: FetchOfficialRankingParams
): Promise<OfficialUnionRankingItem[]> {
  const { date, worldName, ocid, page = 1, apiKey } = params

  if (!apiKey || apiKey.trim() === '') {
    return filterUnionDemo(worldName)
  }

  const url = new URL(`${BASE_URL}/maplestory/v1/ranking/union`)
  if (date) url.searchParams.set('date', date)
  if (worldName) url.searchParams.set('world_name', worldName)
  if (ocid) url.searchParams.set('ocid', ocid)
  url.searchParams.set('page', String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': apiKey.trim(),
      },
    })
    if (!res.ok) return filterUnionDemo(worldName)
    const data = (await res.json()) as { ranking?: OfficialUnionRankingItem[] }
    return data.ranking || []
  } catch {
    return filterUnionDemo(worldName)
  }
}

export async function fetchOfficialDojangRanking(
  params: FetchOfficialRankingParams
): Promise<OfficialDojangRankingItem[]> {
  const { date, worldName, className, ocid, page = 1, apiKey } = params

  if (!apiKey || apiKey.trim() === '') {
    return filterDojangDemo(worldName, className)
  }

  const url = new URL(`${BASE_URL}/maplestory/v1/ranking/dojang`)
  if (date) url.searchParams.set('date', date)
  if (worldName) url.searchParams.set('world_name', worldName)
  if (className) url.searchParams.set('class', className)
  if (ocid) url.searchParams.set('ocid', ocid)
  url.searchParams.set('page', String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': apiKey.trim(),
      },
    })
    if (!res.ok) return filterDojangDemo(worldName, className)
    const data = (await res.json()) as { ranking?: OfficialDojangRankingItem[] }
    return data.ranking || []
  } catch {
    return filterDojangDemo(worldName, className)
  }
}

export async function fetchOfficialGuildRanking(
  params: FetchOfficialRankingParams
): Promise<OfficialGuildRankingItem[]> {
  const { date, worldName, page = 1, apiKey } = params

  if (!apiKey || apiKey.trim() === '') {
    return filterGuildDemo(worldName)
  }

  const url = new URL(`${BASE_URL}/maplestory/v1/ranking/guild`)
  if (date) url.searchParams.set('date', date)
  if (worldName) url.searchParams.set('world_name', worldName)
  url.searchParams.set('page', String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': apiKey.trim(),
      },
    })
    if (!res.ok) return filterGuildDemo(worldName)
    const data = (await res.json()) as { ranking?: OfficialGuildRankingItem[] }
    return data.ranking || []
  } catch {
    return filterGuildDemo(worldName)
  }
}

function filterOverallDemo(worldName?: string, className?: string): OfficialOverallRankingItem[] {
  return DEMO_OFFICIAL_OVERALL.filter((item) => {
    if (worldName && worldName !== 'ALL' && item.world_name !== worldName) return false
    if (className && className !== 'ALL' && item.class_name !== className) return false
    return true
  })
}

function filterUnionDemo(worldName?: string): OfficialUnionRankingItem[] {
  return DEMO_OFFICIAL_UNION.filter((item) => {
    if (worldName && worldName !== 'ALL' && item.world_name !== worldName) return false
    return true
  })
}

function filterDojangDemo(worldName?: string, className?: string): OfficialDojangRankingItem[] {
  return DEMO_OFFICIAL_DOJANG.filter((item) => {
    if (worldName && worldName !== 'ALL' && item.world_name !== worldName) return false
    if (className && className !== 'ALL' && item.class_name !== className) return false
    return true
  })
}

function filterGuildDemo(worldName?: string): OfficialGuildRankingItem[] {
  return DEMO_OFFICIAL_GUILD.filter((item) => {
    if (worldName && worldName !== 'ALL' && item.world_name !== worldName) return false
    return true
  })
}
