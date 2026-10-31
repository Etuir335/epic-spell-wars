// Прокачка колдунов и сундуки (как в Clash Royale), см. transcript/progression.md.
// Колдун открыт, если у него есть уровень (1..5). Карты колдуна копятся на прокачку, золото — на её цену.
// Сундук ждёт в одном из 4 слотов; открывается по одному за раз, по таймеру. Бесплатный сундук дня — без слота.
import { ABILITIES, type Rarity } from './game/abilities.ts'
import { rollChestEmote, type Emote } from './emotes.ts'
import type { SetupPlayer } from './game/types.ts'

export const STARTERS = [0, 1, 3, 5, 8, 12, 16, 23]
export const WIZ_COUNT = ABILITIES.length
export const MAX_LVL = 5
export const SLOTS = 4

export type ChestKind = 'wood' | 'silver' | 'gold' | 'epic'
export interface ChestSlot { kind: ChestKind; arena: number; until?: number } // until — открывается (время готовности)
export interface Progress {
  arena?: number
  gold?: number
  wiz?: Record<number, { lvl: number; cards: number }>
  chests?: (ChestSlot | null)[]
  freeChestDay?: string
  emotes?: string[]
  road?: number[] // забранные награды дороги кубков (ROAD)
  cups: number
}

export const CHESTS: Record<ChestKind, { name: string; icon: string; ms: number; cards: number; gold: number; chance: number; emote: number }> = {
  wood: { name: 'Деревянный', icon: '📦', ms: 15 * 60e3, cards: 4, gold: 20, chance: 60, emote: 0.08 },
  silver: { name: 'Серебряный', icon: '🎁', ms: 3 * 3600e3, cards: 10, gold: 60, chance: 28, emote: 0.2 },
  gold: { name: 'Золотой', icon: '💰', ms: 8 * 3600e3, cards: 25, gold: 200, chance: 10, emote: 0.5 },
  epic: { name: 'Эпичный', icon: '💎', ms: 12 * 3600e3, cards: 23, gold: 120, chance: 2, emote: 1 },
}
export const RARITY_CHANCE: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legend: 2 }
// карт и золота до уровня 2/3/4/5
const NEED: Record<Rarity, { cards: number[]; gold: number[]; spare: number }> = {
  common: { cards: [2, 4, 10, 20], gold: [20, 50, 150, 400], spare: 5 },
  rare: { cards: [2, 4, 8, 15], gold: [50, 150, 400, 1000], spare: 10 },
  epic: { cards: [1, 2, 4, 8], gold: [150, 400, 1000, 2000], spare: 25 },
  legend: { cards: [1, 1, 2, 4], gold: [400, 1000, 2000, 4000], spare: 50 },
}

export const rarityOf = (w: number): Rarity => ABILITIES[w]?.rarity ?? 'common'
export const wizLvl = (st: Progress, w: number) => st.wiz?.[w]?.lvl ?? (STARTERS.includes(w) ? 1 : 0)
export const wizCards = (st: Progress, w: number) => st.wiz?.[w]?.cards ?? 0
export const owned = (st: Progress, w: number) => wizLvl(st, w) > 0
// что нужно до следующего уровня (null — максимум)
export function nextCost(st: Progress, w: number): { cards: number; gold: number } | null {
  const l = wizLvl(st, w)
  if (l < 1 || l >= MAX_LVL) return null
  const n = NEED[rarityOf(w)]
  return { cards: n.cards[l - 1], gold: n.gold[l - 1] }
}
export function canUpgrade(st: Progress, w: number) {
  const c = nextCost(st, w)
  return !!c && wizCards(st, w) >= c.cards && (st.gold ?? 0) >= c.gold
}
export function upgrade(st: Progress, w: number): boolean {
  const c = nextCost(st, w)
  if (!c || !canUpgrade(st, w)) return false
  const x = slot(st, w)
  x.cards -= c.cards; x.lvl++
  st.gold = (st.gold ?? 0) - c.gold
  return true
}
const slot = (st: Progress, w: number) => ((st.wiz ??= {})[w] ??= { lvl: wizLvl(st, w), cards: 0 })

// ---------- сундуки ----------
export const chestSlots = (st: Progress): (ChestSlot | null)[] => Array.from({ length: SLOTS }, (_, i) => st.chests?.[i] ?? null)
export const opening = (st: Progress) => chestSlots(st).findIndex(c => c?.until != null)
export const ready = (c: ChestSlot | null, now = Date.now()) => !!c && c.until != null && c.until <= now
export function rollKind(rnd = Math.random): ChestKind {
  let x = rnd() * 100
  for (const k of Object.keys(CHESTS) as ChestKind[]) if ((x -= CHESTS[k].chance) < 0) return k
  return 'wood'
}
// положить сундук в свободный слот; −1 — все заняты
export function grantChest(st: Progress, kind: ChestKind = rollKind()): number {
  const s = chestSlots(st), i = s.indexOf(null)
  if (i < 0) return -1
  s[i] = { kind, arena: st.arena ?? 0 }
  st.chests = s
  return i
}
export function startOpening(st: Progress, i: number, now = Date.now()) {
  const s = chestSlots(st), c = s[i]
  if (!c || c.until != null || opening(st) >= 0) return false
  s[i] = { ...c, until: now + CHESTS[c.kind].ms }
  st.chests = s
  return true
}
// открыть сразу за золото: всегда дороже золота внутри сундука (чистая трата, не заработок)
// плюс доплата за оставшееся время — чем дольше ждать, тем дороже; почти готовый — только основа
export function rushCost(c: ChestSlot, now = Date.now()) {
  const k = CHESTS[c.kind], mul = 1 + Math.min(6, c.arena) / 6
  const left = c.until != null ? Math.max(0, c.until - now) : k.ms, frac = left / k.ms
  return Math.ceil(k.gold * mul * 1.2) + Math.ceil((k.gold * mul * 2 + k.ms / 60e3) * frac)
}
export function rushChest(st: Progress, i: number, now = Date.now()) {
  const s = chestSlots(st), c = s[i]
  if (!c || ready(c, now)) return false
  const cost = rushCost(c, now)
  if ((st.gold ?? 0) < cost) return false
  st.gold = (st.gold ?? 0) - cost
  s[i] = { ...c, until: now }
  st.chests = s
  return true
}
export const dayKey = (d = new Date()) => d.toDateString()
export const freeChestReady = (st: Progress) => st.freeChestDay !== dayKey()

export interface Loot { kind: ChestKind; gold: number; cards: { w: number; n: number; fresh: boolean; spare: number }[]; emote: Emote | null }

// Открыть сундук слота i (готовый) или бесплатный сундук дня (i = −1): содержимое сразу зачисляется.
export function openChest(st: Progress, i: number, rnd = Math.random, now = Date.now()): Loot | null {
  let c: ChestSlot
  if (i < 0) {
    if (!freeChestReady(st)) return null
    st.freeChestDay = dayKey()
    c = { kind: 'wood', arena: st.arena ?? 0 }
  } else {
    const s = chestSlots(st), x = s[i]
    if (!x || !ready(x, now)) return null
    c = x; s[i] = null; st.chests = s
  }
  return fillChest(st, c, rnd)
}

function fillChest(st: Progress, c: ChestSlot, rnd: () => number): Loot {
  const k = CHESTS[c.kind], mul = 1 + Math.min(6, c.arena) / 6 // ×1 … ×2 к арене 7
  const counts = new Map<number, number>()
  const add = (w: number, n: number) => counts.set(w, (counts.get(w) ?? 0) + n)
  const pick = (r: Rarity) => { let pool = ABILITIES.map((a, w) => (a.rarity === r && wizArena(w) <= c.arena ? w : -1)).filter(w => w >= 0); if (!pool.length) pool = ABILITIES.map((a, w) => (a.rarity === r ? w : -1)).filter(w => w >= 0); return pool[Math.floor(rnd() * pool.length)] }
  const roll = (min?: Rarity): Rarity => {
    const order: Rarity[] = ['common', 'rare', 'epic', 'legend'], from = min ? order.indexOf(min) : 0
    const left = order.slice(from)
    let x = rnd() * left.reduce((a, r) => a + RARITY_CHANCE[r], 0)
    for (const r of left) if ((x -= RARITY_CHANCE[r]) < 0) return r
    return left[0]
  }
  let total = Math.round(k.cards * mul)
  if (c.kind === 'epic') { add(pick('epic'), 8); total -= 8 }
  if (c.kind === 'gold') { add(pick(roll('rare')), 1); total-- }
  // остальное — пачками по 1–4 карты (редкие колдуны — поштучно)
  while (total > 0) {
    const r = roll(), n = Math.min(total, r === 'common' ? 1 + Math.floor(rnd() * 4) : r === 'rare' ? 1 + Math.floor(rnd() * 2) : 1)
    add(pick(r), n); total -= n
  }
  const loot: Loot = { kind: c.kind, gold: Math.round(k.gold * mul * (0.85 + rnd() * 0.3)), cards: [], emote: null }
  for (const [w, n] of counts) {
    const fresh = !owned(st, w), x = slot(st, w)
    let got = n
    if (fresh) { x.lvl = 1; got-- }
    x.cards += got
    // лишние карты колдуна 5-го уровня — в золото
    let spare = 0
    if (x.lvl >= MAX_LVL && x.cards > 0) { spare = x.cards * NEED[rarityOf(w)].spare; loot.gold += spare; x.cards = 0 }
    loot.cards.push({ w, n, fresh, spare })
  }
  // сначала обычные, в конце — самые редкие (как в Clash Royale)
  const ord: Rarity[] = ['common', 'rare', 'epic', 'legend']
  loot.cards.sort((a, b) => ord.indexOf(rarityOf(a.w)) - ord.indexOf(rarityOf(b.w)))
  st.gold = (st.gold ?? 0) + loot.gold
  if (rnd() < k.emote) {
    const e = rollChestEmote(st, rnd)
    if (e) { st.emotes = [...(st.emotes ?? []), e.id]; loot.emote = e }
  }
  return loot
}

// ---------- способности в режимах ----------
// own — у людей свои уровни (из прокачки), боты по сложности; lvl3 — у всех ур. 3; off — без способностей. Боссам способности нет.
export type AbilMode = 'own' | 'lvl3' | 'off'
export const ABIL_MODES: { v: AbilMode; label: string; hint: string }[] = [
  { v: 'own', label: '⭐ Свои уровни', hint: 'Каждый со своим уровнем колдуна из прокачки.' },
  { v: 'lvl3', label: '⚖️ У всех ур. 3', hint: 'Честно: способности у всех на 3-м уровне.' },
  { v: 'off', label: '🚫 Без способностей', hint: 'Как в настолке — только карты.' },
]
export function withAbil(players: SetupPlayer[], mode: AbilMode = 'own'): SetupPlayer[] {
  return players.map(p => {
    const { lvl, ...rest } = p
    const l = p.boss || mode === 'off' ? 0 : mode === 'lvl3' ? 3 : lvl ?? (p.bot ? Math.min(MAX_LVL, 1 + p.bot) : 0)
    return l > 0 ? { ...rest, lvl: l } : rest
  })
}

// Колдуны, которые открываются с аренами (как карты в Clash Royale): в сундуках выпадают только с этой арены.
// Остальные — с первой арены. Новых колдунов дополнений добавлять сюда же.
export const ARENA_WIZ: Record<number, number[]> = {
  1: [10, 21, 7, 2],     // Логово Деда
  2: [34, 27, 40, 30, 24], // Безумная гора
  3: [19, 22, 15, 35],   // Грибучее Болото
}
export const wizArena = (w: number) => Number(Object.keys(ARENA_WIZ).find(a => ARENA_WIZ[+a].includes(w)) ?? 0)

// Дорога кубков: награды забираются вручную на экране арен (Progress.road — забранные пороги).
export type RoadPrize = { cups: number } & ({ t: 'emote'; id: string } | { t: 'gold'; n: number } | { t: 'chest'; kind: ChestKind } | { t: 'wiz'; w: number })
export const ROAD: RoadPrize[] = [
  { cups: 15, t: 'gold', n: 40 }, { cups: 30, t: 'emote', id: 'hehe' }, { cups: 50, t: 'chest', kind: 'wood' }, { cups: 70, t: 'emote', id: 'yawn' }, { cups: 85, t: 'gold', n: 80 },
  { cups: 100, t: 'wiz', w: 10 }, { cups: 120, t: 'emote', id: 'pancakes' }, { cups: 140, t: 'chest', kind: 'silver' }, { cups: 180, t: 'emote', id: 'hog' }, { cups: 215, t: 'gold', n: 150 },
  { cups: 250, t: 'wiz', w: 34 }, { cups: 260, t: 'emote', id: 'skelcry' }, { cups: 300, t: 'chest', kind: 'silver' }, { cups: 350, t: 'emote', id: 'nowifi' }, { cups: 400, t: 'gold', n: 250 },
  { cups: 450, t: 'wiz', w: 19 }, { cups: 500, t: 'emote', id: 'hi' }, { cups: 560, t: 'chest', kind: 'gold' }, { cups: 620, t: 'gold', n: 400 }, { cups: 650, t: 'emote', id: 'bye' },
  { cups: 680, t: 'chest', kind: 'epic' },
]
export const roadTaken = (st: Progress, r: RoadPrize) => !!st.road?.includes(r.cups)
export const roadReady = (st: Progress) => ROAD.filter(r => st.cups >= r.cups && !roadTaken(st, r))
// забрать награду; false — некуда положить (сундук при занятых слотах)
export function claimRoad(st: Progress, r: RoadPrize): boolean {
  if (st.cups < r.cups || roadTaken(st, r)) return false
  if (r.t === 'chest' && grantChest(st, r.kind) < 0) return false
  if (r.t === 'gold') st.gold = (st.gold ?? 0) + r.n
  if (r.t === 'emote') st.emotes = [...new Set([...(st.emotes ?? []), r.id])]
  if (r.t === 'wiz') { st.wiz ??= {}; const x = st.wiz[r.w]; st.wiz[r.w] = { lvl: Math.max(1, x?.lvl ?? 0), cards: x?.cards ?? 0 } }
  st.road = [...(st.road ?? []), r.cups]
  return true
}
