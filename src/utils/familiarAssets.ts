/**
 * 萌獸中文名稱對應 Yetidb 或官方怪物外觀圖示映射表
 * 來源：media.maplestorywiki.net / Nexon Open API
 */
const MOB_ICON_MAP: Record<string, string> = {
  // 經典怪
  嫩寶: 'Mob_Snail.png',
  藍寶: 'Mob_Blue_Snail.png',
  紅寶: 'Mob_Red_Snail.png',
  綠水靈: 'Mob_Slime.png',
  水靈: 'Mob_Slime.png',
  泡泡水靈: 'Mob_Bubbling.png',
  菇菇寶貝: 'Mob_Orange_Mushroom.png',
  菇菇仔: 'Mob_Spore.png',
  綠菇菇: 'Mob_Green_Mushroom.png',
  挫折的綠菇菇: 'Mob_Cynical_Orange_Mushroom.png',
  刺菇菇: 'Mob_Horny_Mushroom.png',
  殭屍菇菇: 'Mob_Zombie_Mushroom.png',
  菇菇媽媽: 'Mob_Mushmom.png',
  殭屍菇菇媽媽: 'Mob_Zombie_Mushmom.png',
  藍菇菇媽媽: 'Mob_Blue_Mushmom.png',
  三眼章魚: 'Mob_Octopus.png',
  肥肥: 'Mob_Pig.png',
  緞帶肥肥: 'Mob_Ribbon_Pig.png',
  鋼之肥肥: 'Mob_Iron_Hog.png',
  山羊: 'Mob_Wild_Boar.png',
  野豬: 'Mob_Wild_Boar.png',
  猴子: 'Mob_Lupin.png',
  殭屍猴: 'Mob_Zombie_Lupin.png',
  邪惡之眼: 'Mob_Evil_Eye.png',
  詛咒之眼: 'Mob_Curse_Eye.png',
  冰獨眼獸: 'Mob_Cold_Eye.png',
  巫婆: 'Mob_Malady.png',
  幽靈: 'Mob_Wraith.png',
  土龍: 'Mob_Copper_Drake.png',
  赤龍: 'Mob_Red_Drake.png',
  冰龍: 'Mob_Ice_Drake.png',
  黑龍: 'Mob_Dark_Drake.png',
  青龍: 'Mob_Drake.png',
  青蛇: 'Mob_Jr._Necki.png',
  木面怪人: 'Mob_Wooden_Mask.png',
  海膽: 'Mob_Pinboom.png',
  珍珠奶茶: 'Mob_Cherry_Bubble_Tea.png',
  黃金雪吉拉和企鵝國王: 'Mob_Gold_Yeti_and_King_Pepe.png',
  牛頭魔: 'Mob_Tauromacis.png',
  牛頭武士: 'Mob_Taurospear.png',
  巨型樹妖: 'Mob_Stumpy.png',
  巨靈菇菇: 'Mob_Dyle.png',
  巨居蟹: 'Mob_King_Clang.png',
  洛朗: 'Mob_Lorang.png',
  克朗: 'Mob_Clang.png',
  瑪諾: 'Mob_Mano.png',
  雪吉拉: 'Mob_Yeti.png',
  企鵝: 'Mob_Pepe.png',

  // 埃德爾斯坦 / 格蘭帝斯 / 特殊萌獸
  雷普士兵: 'Mob_Flora_Soldier.png',
  沼澤爛泥怪物: 'Mob_Muddy_Sprout_Monster.png',
  竊水賊: 'Mob_Water_Thief_Monster.png',
  幼黃獨角獅: 'Mob_Jr._Cellion.png',
  羅赫: 'Mob_Laha.png',
  喇叭花花盆: 'Mob_Potted_Morning_Glory.png',
  路燈: 'Mob_Streetlight.png',
  沙漠巨人: 'Mob_Desert_Giant.png',
  毒蠍: 'Mob_Scorpion.png',
  灰塵箱: 'Mob_Dust_Box.png',
  巡邏機器人: 'Mob_Patrol_Robot.png',
  大蜘蛛: 'Mob_Big_Spider.png',
  拉坎: 'Mob_Raco.png',
  幽靈礦工: 'Mob_Specter_Miner.png',

  // BOSS / 軍團長
  巴洛古: 'Mob_Balrog.png',
  巨大巴洛古: 'Mob_Balrog.png',
  地獄巴洛古: 'Mob_Crimson_Balrog.png',
  魔王巴洛古: 'Mob_Jr._Balrog.png',
  皮卡啾: 'Mob_Pink_Bean.png',
  殘暴炎魔: 'Mob_Zakum.png',
  闇黑龍王: 'Mob_Horntail.png',
  西格諾斯: 'Mob_Cygnus.png',
  女皇: 'Mob_Cygnus.png',
  希拉: 'Mob_Hilla.png',
  真希拉: 'Mob_Verus_Hilla.png',
  凡雷恩: 'Mob_Von_Leon.png',
  阿卡伊rum: 'Mob_Arkarium.png',
  阿卡伊農: 'Mob_Arkarium.png',
  阿卡伊農阿卡: 'Mob_Arkarium.png',
  比艾樂: 'Mob_Von_Bon.png',
  斑斑: 'Mob_Von_Bon.png',
  貝倫: 'Mob_Vellum.png',
  梅格耐斯: 'Mob_Magnus.png',
  森蘭丸: 'Mob_Mori_Ranmaru.png',
  濃姬: 'Mob_Princess_No.png',
  普拉納斯: 'Mob_Papulatus.png',
  鐘怪: 'Mob_Papulatus.png',
  史威: 'Mob_Lotus.png',
  史烏: 'Mob_Lotus.png',
  戴米安: 'Mob_Damien.png',
  露希妲: 'Mob_Lucid.png',
  威爾: 'Mob_Will.png',
  頓凱爾: 'Mob_Guard_Captain_Darknell.png',
  大精靈頓凱爾: 'Mob_Guard_Captain_Darknell.png',
  巨型怪物眼球: 'Mob_Giant_Monster_Gloom.png',
  眼球: 'Mob_Giant_Monster_Gloom.png',
  黑魔法師: 'Mob_Black_Mage.png',
  守護天使綠水靈: 'Mob_Slime.png',
  卡洛斯: 'Mob_Kalos_the_Guardian.png',
  守護者卡洛斯: 'Mob_Kalos_the_Guardian.png',
  卡凌: 'Mob_Kaling.png',
  巴爾德里克斯: 'Mob_Baldrix.png',
}

/**
 * 根據萌獸名稱或暱稱取得圖標 URL
 */
export function getFamiliarIconUrl(familiarName: string | null | undefined): string | null {
  if (!familiarName) return null
  const clean = familiarName.trim()

  // 1. 完全或包含比對 MOB_ICON_MAP
  for (const [key, filename] of Object.entries(MOB_ICON_MAP)) {
    if (clean === key || clean.includes(key)) {
      return `https://media.maplestorywiki.net/yetidb/${filename}`
    }
  }

  return null
}

/**
 * 產生美觀的萌獸卡片立繪 SVG (當沒有官方 icon 時使用，包含外框與楓之谷風格怪物印記)
 */
export function generateFamiliarCardSvg(name: string, grade: string = '普通'): string {
  const cleanName = (name || '萌獸').trim()
  const firstChar = cleanName.slice(0, 1)

  // 依階級挑選顏色
  let strokeColor = '#94a3b8'
  let gradStart = '#334155'
  let gradEnd = '#0f172a'
  let accentColor = '#38bdf8'

  if (grade.includes('傳說') || grade === 'Legendary') {
    strokeColor = '#10b981'
    gradStart = '#064e3b'
    gradEnd = '#022c22'
    accentColor = '#34d399'
  } else if (grade.includes('罕見') || grade === 'Unique') {
    strokeColor = '#f59e0b'
    gradStart = '#78350f'
    gradEnd = '#451a03'
    accentColor = '#fbbf24'
  } else if (grade.includes('特殊') || grade === 'Rare') {
    strokeColor = '#3b82f6'
    gradStart = '#1e3a8a'
    gradEnd = '#0f172a'
    accentColor = '#60a5fa'
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
    <defs>
      <radialGradient id="fg_${firstChar}" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
        <stop offset="60%" stop-color="${gradStart}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${gradEnd}" stop-opacity="0.95"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="20" fill="url(#fg_${firstChar})" stroke="${strokeColor}" stroke-width="2.5"/>
    <circle cx="60" cy="54" r="32" fill="none" stroke="${accentColor}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.4"/>
    <text x="60" y="66" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="34" fill="#ffffff" filter="url(#glow)">${firstChar}</text>
    <path d="M42 94 L78 94" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
