export type GameRegion = 'maplestorytw' | 'maplestory' | 'maplestorysea'

export interface OcidResponse {
  ocid: string
}

export interface CharacterBasic {
  date: string | null
  character_name: string
  world_name: string
  character_gender: string
  character_class: string
  character_class_level: string
  character_level: number
  character_exp: number
  character_exp_rate: string
  character_guild_name: string | null
  character_image: string
  character_date_create?: string
  access_flag?: string
  liberation_quest_clear_flag?: string
  liberation_quest_clear?: string
}

export interface CharacterPopularity {
  date: string | null
  popularity: number
}

export interface FinalStatItem {
  stat_name: string
  stat_value: string
}

export interface CharacterStat {
  date: string | null
  character_class: string
  final_stat: FinalStatItem[]
  remain_ap: number
}

export interface HyperStatPresetItem {
  stat_type: string
  stat_point: number | null
  stat_level: number
  stat_increase: string | null
}

export interface CharacterHyperStat {
  date: string | null
  character_class: string
  use_preset_no: string
  use_available_hyper_stat: number
  hyper_stat_preset_1: HyperStatPresetItem[]
  hyper_stat_preset_2: HyperStatPresetItem[]
  hyper_stat_preset_3: HyperStatPresetItem[]
}

export interface AbilityInfoItem {
  ability_no: string
  ability_grade: string
  ability_value: string
}

export interface AbilityPreset {
  ability_preset_grade: string
  ability_info: AbilityInfoItem[]
}

export interface CharacterAbility {
  date: string | null
  ability_grade: string
  ability_info: AbilityInfoItem[]
  remain_fame: number
  preset_no: number | null
  ability_preset_1?: AbilityPreset | null
  ability_preset_2?: AbilityPreset | null
  ability_preset_3?: AbilityPreset | null
}

export interface ItemStatOption {
  str?: string
  dex?: string
  int?: string
  luk?: string
  max_hp?: string
  max_mp?: string
  attack_power?: string
  magic_power?: string
  armor?: string
  speed?: string
  jump?: string
  boss_damage?: string
  ignore_monster_armor?: string
  all_stat?: string
  damage?: string
  equipment_level_decrease?: number
  base_equipment_level?: number
}

export interface ItemEquipmentInfo {
  item_equipment_part: string
  item_equipment_slot?: string
  equipment_slot?: string
  item_name: string
  item_icon: string
  item_description: string | null
  item_shape_name: string
  item_shape_icon: string
  item_gender: string | null
  item_total_option: ItemStatOption
  item_base_option: ItemStatOption
  potential_option_grade: string | null
  additional_potential_option_grade: string | null
  potential_option_1: string | null
  potential_option_2: string | null
  potential_option_3: string | null
  additional_potential_option_1: string | null
  additional_potential_option_2: string | null
  additional_potential_option_3: string | null
  equipment_level_increase: number
  item_exceptional_option: ItemStatOption
  item_add_option: ItemStatOption
  growth_exp: number
  growth_level: number
  scroll_upgrade: string
  cuttable_count: string
  golden_hammer_flag: string
  scroll_resilience_count: string
  scroll_upgradeable_count: string
  soul_name: string | null
  soul_option: string | null
  item_etc_option: ItemStatOption
  starforce: string
  starforce_scroll_flag: string
  item_starforce_option: ItemStatOption
  special_ring_level: number
  date_expire: string | null
}

export interface TitleInfo {
  title_name: string
  title_icon: string
  title_description: string | null
  date_expire: string | null
  date_option_expire: string | null
  title_shape_name?: string | null
  title_shape_icon?: string | null
  title_shape_description?: string | null
}

export interface CharacterItemEquipment {
  date: string | null
  character_gender: string
  character_class: string
  preset_no: number | null
  item_equipment: ItemEquipmentInfo[]
  item_equipment_preset_1?: ItemEquipmentInfo[]
  item_equipment_preset_2?: ItemEquipmentInfo[]
  item_equipment_preset_3?: ItemEquipmentInfo[]
  title?: TitleInfo | null
}

export interface CashItemOption {
  option_type: string
  option_value: string
}

export interface CashItemColoringPrism {
  color_range: string
  hue: number
  saturation: number
  value: number
}

export interface CashItemEquipmentInfo {
  cash_item_equipment_part: string
  cash_item_equipment_slot: string
  cash_item_name: string
  cash_item_icon: string
  cash_item_description: string | null
  cash_item_option?: CashItemOption[]
  cash_item_gender?: string | null
  item_gender?: string | null
  cash_item_label?: string | null
  cash_item_coloring_prism?: CashItemColoringPrism | null
  date_expire: string | null
  date_option_expire: string | null
}

export interface CharacterCashItemEquipment {
  date: string | null
  character_gender: string
  character_class: string
  character_look_mode?: string | null
  preset_no: number | null
  cash_item_equipment_base: CashItemEquipmentInfo[]
  cash_item_equipment_preset_1?: CashItemEquipmentInfo[]
  cash_item_equipment_preset_2?: CashItemEquipmentInfo[]
  cash_item_equipment_preset_3?: CashItemEquipmentInfo[]
}

export interface CharacterBeautyEquipment {
  date: string | null
  character_gender: string | null
  character_class: string | null
  character_hair: {
    hair_name: string
    base_color: string
    mix_color: string | null
    mix_rate: string
  } | null
  character_face: {
    face_name: string
    base_color: string
    mix_color: string | null
    mix_rate: string
  } | null
  character_skin: {
    skin_name: string
    color_style: string | null
    hue: number | null
    saturation: number | null
    brightness: number | null
  } | null
}

export interface SymbolInfo {
  symbol_name: string
  symbol_icon: string
  symbol_description: string
  symbol_force: string
  symbol_level: number
  symbol_str: string
  symbol_dex: string
  symbol_int: string
  symbol_luk: string
  symbol_hp: string
  symbol_drop_rate?: string
  symbol_meso_rate?: string
  symbol_exp_rate?: string
  symbol_growth_count: number
  symbol_require_growth_count: number
}

export interface CharacterSymbolEquipment {
  date: string | null
  character_class: string
  symbol: SymbolInfo[]
}

export interface UserUnion {
  date: string | null
  union_level: number | null
  union_grade: string | null
  union_artifact_level: number | null
  union_artifact_exp: number | null
  union_artifact_point: number | null
}

export interface UnionChampionBadgeInfo {
  stat: string
}

export interface UnionChampionItem {
  champion_name: string
  champion_slot: number
  champion_grade: string
  champion_class: string
  champion_badge_info: UnionChampionBadgeInfo[]
  // Enrichment fields fetched from character/basic
  character_level?: number
  character_image?: string
  world_name?: string
  character_gender?: string
}

export interface UserUnionChampion {
  date: string | null
  union_champion: UnionChampionItem[]
  champion_badge_total_info?: UnionChampionBadgeInfo[]
}

export interface UnionRaiderBlock {
  block_type: string
  block_class: string | null
  block_level: string
  block_control_point?: { x: number; y: number }
  block_position?: Array<{ x: number; y: number }>
}

export interface UserUnionRaider {
  date: string | null
  union_raider_stat?: string[]
  union_occupied_stat?: string[]
  union_block?: UnionRaiderBlock[]
  use_preset_no?: string | number
}

export interface AndroidPresetInfo {
  android_name: string | null
  android_nickname: string | null
  android_icon: string | null
  android_description: string | null
  android_gender: string | null
  android_grade: string | null
  android_non_humanoid_flag?: string | null
  android_shop_usable_flag?: string | null
}

export interface CharacterAndroidEquipment extends AndroidPresetInfo {
  date: string | null
  preset_no?: number | null
  android_preset_1?: AndroidPresetInfo | null
  android_preset_2?: AndroidPresetInfo | null
  android_preset_3?: AndroidPresetInfo | null
}

export interface PetEquipmentItem {
  item_name: string | null
  item_icon: string | null
  item_description: string | null
  item_option: Array<{
    option_type: string
    option_value: string
  }>
  scroll_upgrade: number
  scroll_upgradable: number
  item_shape: string | null
  item_shape_icon: string | null
}

export interface PetAutoSkill {
  skill_1: string | null
  skill_1_icon: string | null
  skill_2: string | null
  skill_2_icon: string | null
}

export interface PetPotential {
  potential_step: string
  potential_type: string | null
  potential_increase1: string | null
  potential_increase2: string | null
}

export interface CharacterPetEquipment {
  date: string | null
  pet_1_name: string | null
  pet_1_nickname: string | null
  pet_1_icon: string | null
  pet_1_description: string | null
  pet_1_equipment: PetEquipmentItem | null
  pet_1_auto_skill: PetAutoSkill | null
  pet_1_pet_type: string | null
  pet_1_skill: string[]
  pet_1_date_expire: string | null
  pet_1_appearance: string | null
  pet_1_appearance_icon: string | null
  pet_1_potential?: PetPotential[]
  pet_2_name: string | null
  pet_2_nickname: string | null
  pet_2_icon: string | null
  pet_2_description: string | null
  pet_2_equipment: PetEquipmentItem | null
  pet_2_auto_skill: PetAutoSkill | null
  pet_2_pet_type: string | null
  pet_2_skill: string[]
  pet_2_date_expire: string | null
  pet_2_appearance: string | null
  pet_2_appearance_icon: string | null
  pet_2_potential?: PetPotential[]
  pet_3_name: string | null
  pet_3_nickname: string | null
  pet_3_icon: string | null
  pet_3_description: string | null
  pet_3_equipment: PetEquipmentItem | null
  pet_3_auto_skill: PetAutoSkill | null
  pet_3_pet_type: string | null
  pet_3_skill: string[]
  pet_3_date_expire: string | null
  pet_3_appearance: string | null
  pet_3_appearance_icon: string | null
  pet_3_potential?: PetPotential[]
}

export interface ExpHistoryEntry {
  dateLabel: string
  rawDate: string
  level: number
  exp: number
  expRate: number
  expDiff: number
  rateDiff: number
  levelDiff: number
}

export interface HexaCoreEquipment {
  hexa_core_name: string
  hexa_core_level: number
  hexa_core_type: string
  linked_skill: Array<{
    hexa_skill_id: string
  }>
}

export interface CharacterHexaMatrix {
  date: string | null
  character_hexa_core_equipment: HexaCoreEquipment[] | null
}

export interface HexaStatCore {
  slot_id: string
  main_stat_name: string
  sub_stat_name_1: string
  sub_stat_name_2: string
  main_stat_level: number
  sub_stat_level_1: number
  sub_stat_level_2: number
  stat_grade: number
}

export interface CharacterHexaMatrixStat {
  date: string | null
  character_class: string | null
  character_hexa_stat_core: HexaStatCore[] | null
  character_hexa_stat_core_2: HexaStatCore[] | null
  character_hexa_stat_core_3: HexaStatCore[] | null
  preset_hexa_stat_core: HexaStatCore[] | null
  preset_hexa_stat_core_2: HexaStatCore[] | null
  preset_hexa_stat_core_3: HexaStatCore[] | null
}

export interface FullCharacterProfile {
  ocid: string
  region: GameRegion
  basic: CharacterBasic
  popularity: CharacterPopularity | null
  stat: CharacterStat | null
  hyperStat: CharacterHyperStat | null
  ability: CharacterAbility | null
  itemEquipment: CharacterItemEquipment | null
  androidEquipment?: CharacterAndroidEquipment | null
  petEquipment?: CharacterPetEquipment | null
  cashEquipment: CharacterCashItemEquipment | null
  beautyEquipment?: CharacterBeautyEquipment | null
  symbolEquipment: CharacterSymbolEquipment | null
  hexaMatrix?: CharacterHexaMatrix | null
  hexaMatrixStat?: CharacterHexaMatrixStat | null
  union: UserUnion | null
  unionChampion?: UserUnionChampion | null
  unionRaider?: UserUnionRaider | null
}
