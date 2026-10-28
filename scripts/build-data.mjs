// Расшифровка transcript/*.md → src/data/cards.ts (тексты, типы, знаки, инициатива, таблицы могучего броска).
// Эффекты как код появятся в движке (фаза 3); здесь только данные с карт.
import fs from 'node:fs'
const rows = f => fs.readFileSync(f, 'utf8').split('\n').filter(l => /^\d+ \|/.test(l)).map(l => l.split(' | ').map(s => s.trim()))
const SCHOOL = { 'Трава': 'grass', 'Порча': 'hex', 'Кумар': 'haze', 'Мрак': 'dark', 'Угар': 'fire' }
const TYPE = { 'З': 'source', 'Н': 'quality', 'П': 'delivery', '—': 'wild' }

function mighty(text) {
  const m = text.match(/^(.*?)Могучий бросок: (.*)$/)
  if (!m) return null
  const tiers = m[2].split(/ (?=\d+[–+])/).map(t => {
    const r = t.match(/^(\d+)(?:–(\d+)|\+) — (.*)$/)
    return { from: +r[1], to: r[2] ? +r[2] : null, text: r[3].replace(/\.$/, '') + '.' }
  })
  return { victim: m[1].trim(), tiers }
}

const spells = rows('transcript/spells.md').map(([n, t, name, sc, ini, text]) => {
  const promo = sc.includes('☠')
  const school = SCHOOL[sc.replace('☠', '').trim()] ?? null
  const md = mighty(text)
  return {
    index: +n, type: TYPE[t], name, school, initiative: ini === '—' ? null : +ini,
    copies: +n === 0 ? 8 : 2, promo,
    ...(md ? { victim: md.victim, mighty: md.tiers } : { text }),
  }
})
const treasures = rows('transcript/treasures.md').map(([n, name, text]) => ({
  index: +n, name: name.replace(' ☠', ''), promo: name.includes('☠'), text,
  school: (text.match(/знаком (травы|угара|мрака|кумара|порчи) в каждом/) || [])[1] ?? null,
}))
const SG = { 'травы': 'grass', 'угара': 'fire', 'мрака': 'dark', 'кумара': 'haze', 'порчи': 'hex' }
for (const t of treasures) t.school = t.school ? SG[t.school] : null
const dead = rows('transcript/dead.md').map(([n, c, name, text]) => ({ index: +n, copies: +c, name, text }))

// ---------- «Мессиво на грибучем болоте»: нумерация продолжает базу ----------
const SIGN = { 'Трава': 'grass', 'Порча': 'hex', 'Кумар': 'haze', 'Мрак': 'dark', 'Угар': 'fire' }
const SIGN_OF = { 'травы': 'grass', 'угара': 'fire', 'мрака': 'dark', 'кумара': 'haze', 'порчи': 'hex' }
const OFF = { spells: 64, treasures: 26, dead: 8 }
const SORC = { 'заводил': 'source', 'наворота': 'quality', 'прихода': 'delivery' }
for (const [n, t, name, sc, ini, text] of rows('transcript/swamp-spells.md')) {
  const [a, b] = sc.split('+').map(x => SIGN[x.trim()])
  const md = mighty(text)
  const sorc = text.match(/Колдунство: сбрось 2 (заводил|наворота|прихода)/)
  spells.push({
    index: OFF.spells + +n, type: TYPE[t.replace('*', '')], name, school: a, ...(b ? { school2: b } : {}),
    initiative: ini === '—' ? null : +ini, copies: 2, promo: false, set: 'swamp',
    ...(t.includes('*') ? { creature: true } : {}),
    ...(sorc ? { sorcery: SORC[sorc[1]] } : {}),
    ...(text.includes('Пережор:') ? { overdose: true } : {}),
    ...(text.includes('Нежданчик:') ? { surprise: true } : {}),
    ...(md ? { victim: md.victim, mighty: md.tiers } : { text }),
  })
}
for (const [n, name, text] of rows('transcript/swamp-treasures.md')) {
  const cr = text.match(/считается тварью со знаком (\S+?)\./)
  const md = cr ? mighty(text.replace(/^.*?(?=Жертва: )/, '')) : null
  treasures.push({
    index: OFF.treasures + +n, name, promo: false, text, school: null, set: 'swamp',
    ...(text.includes('Вечное.') ? { eternal: true } : {}),
    ...(cr ? { creature: SIGN_OF[cr[1]], victim: md?.victim, mighty: md?.tiers } : {}),
  })
}
for (const [n, c, name, text] of rows('transcript/swamp-dead.md')) {
  dead.push({ index: OFF.dead + +n, copies: +c, name, text, set: 'swamp',
    school: SIGN_OF[(text.match(/считается картой со знаком (\S+) в каждом/) || [])[1]] ?? null })
}

const out = `// СГЕНЕРИРОВАНО scripts/build-data.mjs из transcript/*.md — правьте расшифровку и перезапускайте.
// Картинка карты: assets/cards/<колода>/<index>.webp

export type School = 'grass' | 'hex' | 'haze' | 'dark' | 'fire'
export type SpellType = 'source' | 'quality' | 'delivery' | 'wild'
export interface MightyTier { from: number; to: number | null; text: string }
export interface SpellData {
  index: number; type: SpellType; name: string; school: School | null; initiative: number | null
  copies: number; promo: boolean
  text?: string; victim?: string; mighty?: MightyTier[]
  set?: 'swamp' // дополнение (нет — база)
  school2?: School // второй знак (приходы болота)
  creature?: boolean // тварь: «СТОЯТЬ!» оставляет её в игре
  sorcery?: 'source' | 'quality' | 'delivery' // колдунство: сбрось 2 карты этого типа — и карта с руки идёт в заклинание
  overdose?: boolean // пережор: при 4+ уникальных знаках эффект ещё раз
  surprise?: boolean // нежданчик: если подох до этой карты — колдунства с руки
}
export interface TreasureData {
  index: number; name: string; promo: boolean; text: string; school: School | null
  set?: 'swamp'; eternal?: boolean // вечное: не сбрасывается в конце игры и при смерти
  creature?: School; victim?: string; mighty?: MightyTier[] // сокровище-тварь
}
export interface DeadData { index: number; copies: number; name: string; text: string; set?: 'swamp'; school?: School | null }

export const SCHOOL_NAMES: Record<School, string> = { grass: 'Трава', hex: 'Порча', haze: 'Кумар', dark: 'Мрак', fire: 'Угар' }
export const TYPE_NAMES: Record<SpellType, string> = { source: 'Заводила', quality: 'Наворот', delivery: 'Приход', wild: 'Шальная магия' }

export const SPELLS: SpellData[] = ${JSON.stringify(spells, null, 1)}

export const TREASURES: TreasureData[] = ${JSON.stringify(treasures, null, 1)}

export const DEAD: DeadData[] = ${JSON.stringify(dead, null, 1)}
`
fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync('src/data/cards.ts', out)
const cnt = k => spells.filter(s => s.type === k && !s.promo).length
console.log('заклинаний', spells.length, 'З/Н/П без промо', cnt('source'), cnt('quality'), cnt('delivery'), 'с таблицей', spells.filter(s => s.mighty).length,
  '| сокровищ', treasures.length, 'со знаком', treasures.filter(t => t.school).length, '| дохлых', dead.reduce((a, d) => a + d.copies, 0))
console.log(spells.filter(s => s.mighty).map(s => s.index + ':' + s.mighty.length).join(' '))
