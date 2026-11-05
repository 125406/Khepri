import type { LocalRankCharacter } from '../types/ranking'
import { DEFAULT_COMMUNITY_CHARACTERS } from '../data/defaultRankingData'

const STORAGE_KEY = 'khepri_community_characters_v2'

export function getCommunityCharacters(): LocalRankCharacter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveCommunityCharacters(DEFAULT_COMMUNITY_CHARACTERS)
      return [...DEFAULT_COMMUNITY_CHARACTERS]
    }
    const parsed = JSON.parse(raw) as LocalRankCharacter[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveCommunityCharacters(DEFAULT_COMMUNITY_CHARACTERS)
      return [...DEFAULT_COMMUNITY_CHARACTERS]
    }
    return parsed
  } catch {
    return [...DEFAULT_COMMUNITY_CHARACTERS]
  }
}

export function saveCommunityCharacters(list: LocalRankCharacter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save community characters to localStorage:', err)
  }
}

export function recordSearchedCharacter(char: LocalRankCharacter): void {
  const current = getCommunityCharacters()
  const existingIdx = current.findIndex(
    (c) => c.name.toLowerCase() === char.name.toLowerCase() || (c.ocid && c.ocid === char.ocid)
  )

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      ...char,
      updatedAt: Date.now(),
    }
  } else {
    current.unshift({
      ...char,
      updatedAt: Date.now(),
    })
  }

  saveCommunityCharacters(current)
}

export function removeCommunityCharacter(name: string): void {
  const current = getCommunityCharacters().filter(
    (c) => c.name.toLowerCase() !== name.toLowerCase()
  )
  saveCommunityCharacters(current)
}

export function resetCommunityCharactersToDefault(): void {
  saveCommunityCharacters(DEFAULT_COMMUNITY_CHARACTERS)
}
