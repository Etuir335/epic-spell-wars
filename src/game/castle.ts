// «Бесчинство в замке Спрутобойни»: кровь, замок, эффекты заклинаний 124–183, нежданчики замка,
// сокровища 51–75 и карты дохлых колдунов 16–23. Тексты — transcript/castle-*.md.
import './swamp.ts' // хуки болота ставятся раньше: замок их дополняет
import { SPELLS, TREASURES, type SpellType } from '../data/cards.ts'
import {
  alive, aoe, ask, cardName, choosePlayer, chooseHandCard, chooseTreasure, creatureTreasures, d6, damage, drawDead, drawFrom, drawSpell,
  enemies, ev, gainTreasure, giveTreasure, heal, hitAll, hooks, isLast, leftEnemy, log, loseTreasure, mightyRoll, moveTreasure, neighborsOf,
  randomEnemy, rightEnemy, rollEv, spellOf, strongest, tier, weakest, yesNo, type Ctx, type TreasureAct,
} from './core.ts'
import { EFFECTS, addToSpell, type E } from './effects.ts'
import type { CardId, GameState, PlayerState } from './types.ts'

type Slot = Exclude<SpellType, 'wild'>
const OFF = 124
const at = (n: number) => OFF + n
export const MAX_BLOOD = 25
// Сокровища и карты дохлых колдунов замка по индексу
export const CT = {
  wolfcake: 51, villains: 52, brake: 53, shield: 54, idol: 55, wanted: 56, scope: 57, pendant: 58, necro: 59, five: 60,
  regalia: 61, divan: 62, coins: 63, twohead: 64, smog: 65, doping: 66, whipboy: 67, shackles: 68, gutter: 69, sausage: 70,
  perch: 71, triple: 72, worm: 73, gong: 74, sphere: 75,
} as const
export const CD = { tomb: 16, cub: 17, joys: 18, curse: 19, storm: 20, squeeze: 21, erosion: 22, whip: 23 } as const
export const castleOn = (s: GameState) => !!s.sets?.includes('castle')

// ---------- кровь ----------
export const bloodOf = (p: PlayerState) => p.blood ?? 0
export function gainBlood(s: GameState, p: PlayerState, n: number, why = '') {
  const before = bloodOf(p), after = Math.min(MAX_BLOOD, before + n)
  if (after <= before) return
  p.blood = after
  log(s, `🩸 ${p.name}: +${after - before} л крови${why ? ` (${why})` : ''} → ${after}.`)
}
export function loseBlood(s: GameState, p: PlayerState, n: number, why = ''): number {
  const k = Math.min(bloodOf(p), Math.max(0, n))
  if (!k) return 0
  p.blood = bloodOf(p) - k
  log(s, `🩸 ${p.name}: −${k} л крови${why ? ` (${why})` : ''} → ${p.blood}.`)
  return k
}
function giveBlood(s: GameState, from: PlayerState, to: PlayerState, n: number) {
  const k = Math.min(bloodOf(from), n)
  if (!k) return
  from.blood = bloodOf(from) - k
  to.blood = Math.min(MAX_BLOOD, bloodOf(to) + k)
  log(s, `🩸 ${from.name} сдаёт ${to.name} ${k} л крови.`)
}
// «Слей N литров крови»: по желанию, если хватает
function spill(e: Ctx, p: PlayerState, n: number, what: string): boolean {
  if (bloodOf(p) < n || !p.alive) return false
  if (!yesNo(e, p, `Слить ${n} л крови (у тебя ${bloodOf(p)}): ${what}?`, `Слить ${n} 🩸`, 'Нет')) return false
  loseBlood(e.s, p, n, 'слито')
  return true
}
// «Слей X литров крови»: сколько угодно
function spillX(e: Ctx, p: PlayerState, what: string): number {
  if (!bloodOf(p)) return 0
  const v = ask(e, { player: p.id, prompt: `Сколько литров крови слить (${what})?`, options: Array.from({ length: bloodOf(p) + 1 }, (_, i) => ({ v: i, label: i ? `${i} 🩸` : 'Нисколько' })) }) as number
  return loseBlood(e.s, p, v, 'слито')
}

// ---------- замок ----------
export const holds = (s: GameState, p: PlayerState) => s.castle === p.id
// Захватить замок; возвращает прежнего владельца
function seize(s: GameState, p: PlayerState): PlayerState | null {
  const prev = s.castle != null ? s.players[s.castle] : null
  if (prev === p) { log(s, `🏰 Замок и так у ${p.name}.`); return null }
  s.castle = p.id
  log(s, `🏰 ${p.name} захватывает замок${prev ? ` у ${prev.name}` : ''}!`)
  return prev
}
const holder = (s: GameState) => (s.castle != null ? s.players[s.castle] : null)

// ---------- помощники ----------
const uniq = (list: (PlayerState | null)[]) => [...new Set(list.filter((q): q is PlayerState => !!q))]
const foes = (e: E) => enemies(e.s, e.p)
const chooseFoe = (e: E, list = foes(e), prompt = 'Выбери врага') => choosePlayer(e, e.p, list, prompt)
const victims = (e: E, pick: () => (PlayerState | null)[]) => (e.card.type === 'delivery' && e.s.turn?.deliveryAll ? foes(e) : uniq(pick()))
const has = (p: PlayerState, t: number) => p.treasures.includes(t)
const creatureCount = (q: PlayerState) => (q.creatures?.length ?? 0) + creatureTreasures(q).length
const isCreature = (id: CardId) => id >= 0 && !!spellOf(id).creature
function die(e: Ctx, p: PlayerState, label = ''): number { const r = d6(e.s); rollEv(e.s, p, [r], r, label); return r }
function mostBlood(e: E): PlayerState | null {
  const list = foes(e)
  if (!list.length) return null
  const m = Math.max(...list.map(bloodOf))
  return chooseFoe(e, list.filter(q => bloodOf(q) === m), 'Ничья: у кого больше всех крови?')
}
// «Двуглавый пустозвон»: лево ↔ право
function side(e: E, dir: 'left' | 'right'): PlayerState | null {
  let d = dir
  if (has(e.p, CT.twohead) && foes(e).length > 1 && yesNo(e, e.p, `«Двуглавый пустозвон»: бить ${dir === 'left' ? 'правого' : 'левого'} врага вместо ${dir === 'left' ? 'левого' : 'правого'}?`, 'Сменить', 'Нет')) d = dir === 'left' ? 'right' : 'left'
  return d === 'left' ? leftEnemy(e.s, e.p) : rightEnemy(e.s, e.p)
}
// Могучий бросок; у твари — «СТОЯТЬ!» по тексту выпавшей строки
function M(e: E): number {
  const t = tier(mightyRoll(e, e.p, e.card))
  const d = SPELLS[e.card.index]
  if (d.creature && e.cur && d.mighty?.[t].text.includes('СТОЯТЬ')) { e.cur.stay = true; log(e.s, `🐾 ${d.name}: СТОЯТЬ!`) }
  return t
}
// Урон твари по жертвам («Волкейк»: +1)
const hitC = (e: E, v: PlayerState[], n: number) => hitAll(e, v, n > 0 && has(e.p, CT.wolfcake) ? n + 1 : n)
// Открывать карты колоды, пока не найдётся подходящая; остальные — в сброс
function revealUntil(e: Ctx, ok: (id: CardId) => boolean): CardId | null {
  const shown: CardId[] = []
  let got: CardId | null = null
  for (let i = 0; i < 300; i++) {
    const x = drawSpell(e.s)
    if (x == null) break
    if (ok(x)) { got = x; break }
    shown.push(x)
  }
  e.s.discard.push(...shown)
  if (shown.length) log(e.s, `Открыто и сброшено карт: ${shown.length}.`)
  return got
}
function addCreatureFromDeck(e: E) {
  const id = revealUntil(e, isCreature)
  if (id != null) { log(e.s, `${e.p.name} находит тварь ${cardName(id)}.`); addToSpell(e, e.p, id, 'added') }
}
function addFromHand(e: E, list: CardId[], prompt: string, optional = false) {
  const id = chooseHandCard(e, e.p, prompt, list, optional)
  if (id == null) return
  e.p.hand = e.p.hand.filter(x => x !== id)
  addToSpell(e, e.p, id, 'added')
}
const TYPES: { v: Slot; label: string }[] = [{ v: 'source', label: 'Заводилы' }, { v: 'quality', label: 'Навороты' }, { v: 'delivery', label: 'Приходы' }]
const typeOf = (id: CardId) => spellOf(id).type
function killCreatures(e: Ctx, q: PlayerState) {
  if (q.creatures?.length) { e.s.discard.push(...q.creatures); q.creatures = [] }
  for (const t of creatureTreasures(q)) loseTreasure(e.s, q, t)
  log(e.s, `Все твари ${q.name} погибают.`)
}
const medalsInPlay = (s: GameState) => s.players.reduce((n, q) => n + q.medals, 0)
function discardOwnTreasure(e: Ctx, q: PlayerState) {
  const t = chooseTreasure(e, q, q, 'Сбрось своё сокровище')
  if (t != null) { loseTreasure(e.s, q, t); log(e.s, `${q.name} сбрасывает сокровище.`) }
}
// «Сгубленный»: отдать карту порчи с руки или сокровище — на выбор отдающего
function hexOrTreasure(e: E, q: PlayerState | null) {
  if (!q) return
  const hex = q.hand.filter(id => { const c = spellOf(id); return c.school === 'hex' || c.school2 === 'hex' })
  const v = ask(e, {
    player: q.id, prompt: `«Сгубленный»: отдай ${e.p.name} карту порчи с руки или сокровище`,
    options: [
      ...hex.map(id => ({ v: id, label: spellOf(id).name, card: { deck: 'spells' as const, index: Math.floor(id / 10) } })),
      ...q.treasures.map(t => ({ v: `t${t}`, label: TREASURES[t].name, card: { deck: 'treasures' as const, index: t } })),
    ],
  })
  if (v == null) return log(e.s, `${q.name}: отдавать нечего.`)
  if (typeof v === 'string') moveTreasure(e.s, q, e.p, +v.slice(1))
  else { q.hand = q.hand.filter(x => x !== v); e.p.hand.push(v); log(e.s, `${q.name} отдаёт ${e.p.name} карту порчи.`) }
}

// ---------- эффекты заклинаний ----------
export const CASTLE_EFFECTS: Record<number, (e: E) => void> = {
  // 0 Йог-Ниггатот (тварь)
  [at(0)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => q.acted))])
    if (e.s.turn && spill(e, e.p, 1, '+1 кубик к броскам твоих тварей на этом ходу')) e.s.turn.creatureDice = (e.s.turn.creatureDice ?? 0) + 1
    const t = M(e)
    hitC(e, v, [0, 1, 2][t])
    if (t === 2) addFromHand(e, e.p.hand.filter(isCreature), 'Сыграй ещё 1 тварь с руки')
  },
  // 1 Герцог Белкингем
  [at(1)]: e => { const v = victims(e, () => [mostBlood(e)]), t = M(e); hitC(e, v, [0, 2, 4][t]); if (t === 2) heal(e, e.p, 2) },
  // 2 Пузырьковый
  [at(2)]: e => {
    const q = chooseFoe(e, foes(e).filter(q => !q.treasures.length), 'Кто из врагов без сокровищ берёт сокровище?')
    if (q) gainTreasure(e, q)
    hitAll(e, foes(e).filter(q => q.treasures.length), 2)
  },
  // 3 Клоноубийственный
  [at(3)]: e => {
    const both = holds(e.s, e.p)
    const pick = both ? 'both' : ask(e, { player: e.p.id, prompt: 'Клоноубийственный: кого бить?', options: [{ v: 'even', label: '2 урона — чётным' }, { v: 'odd', label: '3 урона — нечётным' }] })
    if (pick !== 'odd') hitAll(e, foes(e).filter(q => q.life % 2 === 0), 2)
    if (pick !== 'even') hitAll(e, foes(e).filter(q => q.life % 2 === 1), 3)
  },
  // 4 Завальный: справа 1, 2, 3…
  [at(4)]: e => {
    const k = spill(e, e.p, 2, 'удвоить урон') ? 2 : 1
    const list = [...foes(e)].reverse()
    aoe(e, () => list.forEach((q, i) => damage(e, q, (i + 1) * k)))
  },
  // 5 Волчарный
  [at(5)]: e => {
    const list = spill(e, e.p, 3, 'бить каждого врага') ? foes(e) : uniq([chooseFoe(e)])
    aoe(e, () => {
      for (const q of list) {
        const n = q.hand.filter(isCreature).length
        log(e.s, `${q.name} открывает руку: тварей ${n}.`)
        damage(e, q, 2 * n)
      }
    })
  },
  // 6 Кексуальный
  [at(6)]: e => {
    const prev = seize(e.s, e.p)
    const q = chooseFoe(e, foes(e).filter(q => q !== prev), 'Кому отдать замок?')
    if (!q) return
    e.s.castle = q.id
    log(e.s, `🏰 ${e.p.name} отдаёт замок ${q.name}.`)
    if (creatureCount(q) && spill(e, e.p, 3, `сначала убить всех тварей ${q.name}`)) killCreatures(e, q)
    damage(e, q, 3)
  },
  // 7 Сгубленный
  [at(7)]: e => { hexOrTreasure(e, side(e, 'left')); if (holds(e.s, e.p)) hexOrTreasure(e, side(e, 'right')) },
  // 8 Душноватый
  [at(8)]: e => {
    hitAll(e, foes(e), 1)
    if (!spill(e, e.p, 1, 'обмен уроном по литрам крови')) return
    const q = chooseFoe(e)
    if (!q) return
    const mine = bloodOf(e.p), his = bloodOf(q)
    damage(e, q, mine); damage(e, e.p, his)
  },
  // 9 Надгробовой
  [at(9)]: e => {
    const types = TYPES.filter(t => e.p.hand.some(id => typeOf(id) === t.v))
    const ty = ask(e, { player: e.p.id, prompt: 'Надгробовой: карты какого типа сбросить?', options: types })
    if (ty == null) return
    let n = 0
    for (;;) {
      const id = chooseHandCard(e, e.p, `Сбросить ещё карту? (сброшено ${n})`, e.p.hand.filter(id => typeOf(id) === ty), n > 0)
      if (id == null) break
      e.p.hand = e.p.hand.filter(x => x !== id); e.s.discard.push(id); n++
    }
    if (n && spill(e, e.p, 4, 'удвоить урон')) n *= 2
    damage(e, chooseFoe(e), n)
  },
  // 10 Загребущий
  [at(10)]: e => {
    gainTreasure(e, e.p); gainTreasure(e, e.p)
    for (const q of foes(e).filter(q => !q.acted)) gainTreasure(e, q)
    const done = foes(e).filter(q => q.acted && q.treasures.length)
    if (done.length && spill(e, e.p, 2, 'сходившие враги сбрасывают по сокровищу')) for (const q of done) discardOwnTreasure(e, q)
  },
  // 11 Вятский цирк
  [at(11)]: e => {
    const list = foes(e), m = Math.max(0, ...list.map(creatureCount))
    const v = victims(e, () => [chooseFoe(e, list.filter(q => creatureCount(q) === m))]), t = M(e)
    if (t === 0) return damage(e, e.p, 1)
    if (t === 1) {
      for (const q of v) {
        const id = q.creatures?.[0], tr = creatureTreasures(q)[0]
        if (id != null) { q.creatures = q.creatures!.filter(x => x !== id); e.s.discard.push(id); log(e.s, `Тварь ${cardName(id)} погибает.`) }
        else if (tr != null) loseTreasure(e.s, q, tr)
      }
      return hitC(e, v, 3)
    }
    hitC(e, v, 4)
  },
  // 12 Желатаздр
  [at(12)]: e => { const v = victims(e, () => [side(e, 'left')]), t = M(e); hitC(e, v, [2, 3, 4][t]); if (t === 2) gainTreasure(e, e.p) },
  // 13 Искрюченный
  [at(13)]: e => {
    const q = randomEnemy(e, e.p)
    damage(e, q, die(e, e.p))
    if (holds(e.s, e.p)) damage(e, chooseFoe(e, foes(e).filter(x => x !== q), 'Кому ещё 2 урона?'), 2)
  },
  // 14 Люцифартовый
  [at(14)]: e => {
    const list = foes(e), r = new Map(list.map(q => [q, die(e, q)]))
    const max = Math.max(0, ...r.values())
    aoe(e, () => {
      for (const q of list) {
        if (r.get(q) === max) { gainBlood(e.s, q, 1); damage(e, q, max) }
        else if (holds(e.s, e.p)) damage(e, q, r.get(q)!)
      }
    })
  },
  // 15 Продажношкурный
  [at(15)]: e => {
    gainTreasure(e, e.p)
    for (const q of foes(e).filter(q => !q.treasures.length)) gainTreasure(e, q)
    if (spill(e, e.p, 8, '2 урона каждому врагу за каждое сокровище в игре')) hitAll(e, foes(e), 2 * alive(e.s).reduce((n, q) => n + q.treasures.length, 0))
  },
  // 16 Садистский
  [at(16)]: e => {
    const q = strongest(e, e.p)
    if (!q) return
    const before = creatureCount(q)
    damage(e, q, 3)
    if (creatureCount(q) < before) gainBlood(e.s, e.p, 1, 'прикрылся тварью')
  },
  // 17 Отжигающий
  [at(17)]: e => {
    const h = holder(e.s)
    if (h?.alive) {
      if (spill(e, e.p, 6, `${h.name} — 8 урона, его соседям по 4`)) aoe(e, () => { damage(e, h, 8); for (const q of neighborsOf(e.s, h)) damage(e, q, 4) })
      else damage(e, h, 4)
    } else hitAll(e, alive(e.s), 4)
  },
  // 18 Гостинцевый
  [at(18)]: e => {
    addFromHand(e, e.p.hand.filter(id => typeOf(id) === 'delivery'), 'Добавь приход с руки')
    if (spill(e, e.p, 4, 'найти в колоде тварь и добавить в заклинание')) addCreatureFromDeck(e)
  },
  // 19 Пополямный
  [at(19)]: e => {
    const a = d6(e.s), b = d6(e.s)
    rollEv(e.s, e.p, [a, b], a + b, 'Пополямный')
    const q = chooseFoe(e)
    damage(e, q, Math.min(a, b))
    const rest = foes(e).filter(x => x !== q)
    if (rest.length && spill(e, e.p, 2, `${Math.max(a, b)} урона другому врагу`)) damage(e, chooseFoe(e, rest), Math.max(a, b))
  },
  // 20 Трахангутан
  [at(20)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => q.acted))]), t = M(e)
    hitC(e, v, [2, 3, 4][t])
    if (t === 2) hitAll(e, foes(e).filter(q => !v.includes(q)), 1)
  },
  // 21 Ведьминатор
  [at(21)]: e => { const v = victims(e, () => [mostBlood(e)]), t = M(e); hitC(e, v, [1, 2, 3][t]); if (t) for (const q of v) loseBlood(e.s, q, t) },
  // 22 Гамадрантул
  [at(22)]: e => { const v = victims(e, () => [side(e, 'right')]), t = M(e); hitC(e, v, [1, 2, 4][t]); if (t === 2) gainBlood(e.s, e.p, 1) },
  // 23 Маркиз Жиробас
  [at(23)]: e => {
    if (e.cur && spill(e, e.p, 1, 'Маркиз остаётся в игре (СТОЯТЬ!)')) e.cur.stay = true
    const v = victims(e, () => [strongest(e, e.p)])
    hitC(e, v, [1, 2, 4][M(e)])
  },
  // 24 Квартет бесов-сутенёров
  [at(24)]: e => {
    const v = victims(e, () => [weakest(e, e.p)]), t = M(e)
    if (t === 0) { for (const q of foes(e)) heal(e, q, 1); return }
    hitC(e, v, t === 1 ? 3 : 5)
    if (t === 2) for (const q of foes(e).filter(q => !v.includes(q))) heal(e, q, 1)
  },
  // 25 Анус Запеканус
  [at(25)]: e => { const v = victims(e, () => [mostBlood(e)]); hitC(e, v, [2, 3, 4][M(e)]) },
  // 26 Змей Куриныч
  [at(26)]: e => { const v = victims(e, () => [strongest(e, e.p)]); hitC(e, v, [0, 2, 4][M(e)]) },
  // 27 Мехатана
  [at(27)]: e => {
    const v = victims(e, () => [weakest(e, e.p)]), t = M(e)
    hitC(e, v, [1, 2, 4][t])
    if (t === 1) damage(e, e.p, 1)
    if (t === 2) damage(e, strongest(e, e.p), 2)
  },
  // 28 Пердорыцарь: кубики могучего броска — по отдельности
  [at(28)]: e => {
    const split = spill(e, e.p, 2, 'применить кубики броска по отдельности')
    const v = victims(e, () => [chooseFoe(e)]), t = M(e)
    if (!split) return hitC(e, v, [1, 2, 4][t])
    for (const d of e.s.lastRoll?.dice ?? []) {
      const q = chooseFoe(e, foes(e), `Кубик ${d}: кому ${d >= 5 ? 2 : 1} урона?`)
      hitC(e, uniq([q]), d >= 5 ? 2 : 1)
    }
  },
  // 29 От Яростного Школотрона
  [at(29)]: e => {
    const prev = seize(e.s, e.p)
    if (prev && prev.alive) damage(e, chooseFoe(e, foes(e).filter(q => q !== prev), 'Кому 3 урона?'), 3)
  },
  // 30 От Мозгического космососа
  [at(30)]: e => {
    const q = side(e, 'left')
    if (!q) return
    if (bloodOf(q) && yesNo(e, q, `${e.p.name}: сдать 2 литра крови или отхватить 3 урона?`, 'Сдать кровь', 'Отхватить урон')) giveBlood(e.s, q, e.p, 2)
    else damage(e, q, 3)
  },
  // 31 От Знатного Кидалы
  [at(31)]: e => { const r = die(e, e.p); if (r <= 2 || r >= 5) seize(e.s, e.p); if (r >= 3) gainTreasure(e, e.p) },
  // 32 От Старика Похабыча
  [at(32)]: e => { if (spill(e, e.p, 2, '3 урона каждому врагу')) hitAll(e, foes(e), 3); else damage(e, side(e, 'left'), 3) },
  // 33 От Залёта Нежданного
  [at(33)]: e => {
    damage(e, strongest(e, e.p), 2)
    if (e.p.hand.length && spill(e, e.p, 3, 'добавить в заклинание случайную карту с руки')) {
      const id = e.p.hand[Math.floor(d6(e.s) * e.p.hand.length / 7)]
      e.p.hand = e.p.hand.filter(x => x !== id)
      addToSpell(e, e.p, id, 'added')
    }
  },
  // 34 От Поплошарки
  [at(34)]: e => {
    for (const q of foes(e).filter(q => q.acted)) giveBlood(e.s, q, e.p, 1)
    hitAll(e, foes(e).filter(q => !q.acted), 2)
  },
  // 35 От Полыхающего Принца
  [at(35)]: e => hitAll(e, foes(e), spill(e, e.p, 5, '5 урона вместо 1') ? 5 : 1),
  // 36 От Грибуля Дюка
  [at(36)]: e => heal(e, e.p, die(e, e.p)),
  // 37 От Секача с секачом
  [at(37)]: e => { heal(e, e.p, alive(e.s).reduce((n, q) => n + creatureCount(q), 0)); heal(e, e.p, spillX(e, e.p, '+1 жизнь за литр')) },
  // 38 От Братухи Миксухи
  [at(38)]: e => {
    const ty = ask(e, { player: e.p.id, prompt: 'Братуха Миксуха: какой тип карт передают?', options: TYPES }) as Slot
    const k = spill(e, e.p, 4, 'удвоить урон') ? 2 : 1
    const live = alive(e.s)
    const out = new Map(live.map(q => [q, q.hand.filter(id => typeOf(id) === ty)]))
    const got = new Map<PlayerState, number>()
    for (const q of live) {
      const to = leftEnemy(e.s, q)
      if (!to) continue
      q.hand = q.hand.filter(id => !out.get(q)!.includes(id))
      to.hand.push(...out.get(q)!)
      got.set(to, (got.get(to) ?? 0) + out.get(q)!.length)
    }
    log(e.s, 'Все передают карты соседу слева.')
    aoe(e, () => { for (const [q, n] of got) damage(e, q, n * k) })
  },
  // 39 От Вшивы
  [at(39)]: e => { for (let i = holds(e.s, e.p) ? 2 : 1; i > 0; i--) addFromHand(e, e.p.hand, 'Добавь карту с руки в заклинание') },
  // 40 От Ядрочиста
  [at(40)]: e => damage(e, side(e, 'right'), 2),
  // 41 От Демона Боли
  [at(41)]: e => {
    const a = d6(e.s), b = d6(e.s)
    rollEv(e.s, e.p, [a, b], a + b, 'Демон Боли')
    const v = ask(e, { player: e.p.id, prompt: 'Какой кубик — левому врагу?', options: [{ v: 0, label: `Кубик ${a}` }, { v: 1, label: `Кубик ${b}` }] })
    const [hit, back] = v === 1 ? [b, a] : [a, b]
    damage(e, side(e, 'left'), hit)
    if (!holds(e.s, e.p) && !spill(e, e.p, 1, `не отхватывать ${back} урона`)) damage(e, e.p, back)
  },
  // 42 От Ацкого Ацтека
  [at(42)]: e => {
    const q = strongest(e, e.p)
    if (!q) return
    giveBlood(e.s, e.p, q, 1)
    damage(e, q, die(e, e.p))
    if (holds(e.s, e.p)) damage(e, chooseFoe(e, foes(e).filter(x => x !== q), 'Кому кубик урона?'), die(e, e.p))
  },
  // 43 От Конницы в пальто
  [at(43)]: e => {
    damage(e, strongest(e, e.p), 3)
    const med = foes(e).filter(q => q.medals)
    if (med.length && spill(e, e.p, 4, '7 урона каждому врагу с медалью')) hitAll(e, med, 7)
  },
  // 44 Урожайный
  [at(44)]: e => {
    seize(e.s, e.p)
    const dead = e.s.players.filter(q => !q.alive).length
    if (dead) hitAll(e, foes(e), dead)
    else gainBlood(e.s, e.p, 2)
  },
  // 45 Шлангующий
  [at(45)]: e => { const r = die(e, e.p); gainBlood(e.s, e.p, r); if (r <= 4) heal(e, weakest(e, e.p), r) },
  // 46 Фейханальный
  [at(46)]: e => {
    let n = 0
    for (; n < 3; n++) {
      const id = chooseHandCard(e, e.p, `Сбросить карту без знака травы? (${n} из 3)`, e.p.hand.filter(id => { const c = spellOf(id); return c.school !== 'grass' && c.school2 !== 'grass' }), true)
      if (id == null) break
      e.p.hand = e.p.hand.filter(x => x !== id); e.s.discard.push(id)
    }
    heal(e, e.p, n)
  },
  // 47 Тычиночный
  [at(47)]: e => { for (let i = holds(e.s, e.p) ? 2 : 1; i > 0; i--) addCreatureFromDeck(e) },
  // 48 От Маши-Доминяши
  [at(48)]: e => {
    const q = chooseFoe(e)
    if (!q) return
    const cr = q.hand.filter(isCreature)
    const id = cr.length ? chooseHandCard(e, q, `Отдать ${e.p.name} тварь с руки? (иначе — кубик урона)`, cr, true) : null
    if (id == null) return damage(e, q, die(e, e.p))
    q.hand = q.hand.filter(x => x !== id)
    log(e.s, `${q.name} отдаёт тварь ${cardName(id)}.`)
    addToSpell(e, e.p, id, 'added')
  },
  // 49 От Дохлопатры
  [at(49)]: e => hitAll(e, foes(e).filter(q => q.acted), 2),
  // 50 От Запальничка
  [at(50)]: e => {
    const both = spill(e, e.p, 3, 'сделать и то и другое')
    const pick = both ? 'both' : ask(e, { player: e.p.id, prompt: 'Запальничек:', options: [{ v: 'castle', label: 'Захватить замок и 1 урон каждому' }, { v: 'hit', label: '3 урона врагу без замка' }] })
    if (pick !== 'hit') { seize(e.s, e.p); hitAll(e, foes(e), 1) }
    if (pick !== 'castle') damage(e, chooseFoe(e, foes(e).filter(q => !holds(e.s, q)), 'Кому 3 урона?'), 3)
  },
  // 51 От Пендальфа Сизого
  [at(51)]: e => damage(e, chooseFoe(e), 1),
  // 52 От Труполюба
  [at(52)]: e => { seize(e.s, e.p); const m = medalsInPlay(e.s); if (m && spill(e, e.p, 1, `${2 * m} урона каждому врагу`)) hitAll(e, foes(e), 2 * m) },
  // 53 Кубодемон
  [at(53)]: e => { const v = victims(e, () => [strongest(e, e.p)]), t = M(e); hitC(e, v, t === 2 ? die(e, e.p) : [1, 2][t]) },
  // 54 Мочальник
  [at(54)]: e => { const v = victims(e, () => [mostBlood(e)]), t = M(e); hitC(e, v, [0, 1, 4][t]); for (const q of v) giveBlood(e.s, q, e.p, 1) },
  // 55 Жракула
  [at(55)]: e => {
    const h = holder(e.s)
    const v = victims(e, () => [h && h !== e.p && h.alive ? h : null]), t = M(e)
    hitC(e, v, [1, 2, 5][t])
    if (t) seize(e.s, e.p)
  },
  // 56 Кулак БОГА
  [at(56)]: e => {
    const list = foes(e), m = Math.max(0, ...list.map(q => q.treasures.length))
    const v = victims(e, () => [chooseFoe(e, list.filter(q => q.treasures.length === m))]), t = M(e)
    hitC(e, v, [1, 3, 7][t])
    if (t === 1) for (const q of v) discardOwnTreasure(e, q)
  },
  // 57 Спрутобой
  [at(57)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => !creatureCount(q)))]), t = M(e)
    hitC(e, v, [1, 2, 3][t])
    if (t === 2) for (const q of v) { const tr = chooseTreasure(e, e.p, q, 'Какое сокровище отжать?'); if (tr != null) moveTreasure(e.s, q, e.p, tr) }
  },
  // 58 Беломор-Дракон
  [at(58)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => q.acted))]), t = M(e)
    hitC(e, v, [1, 3, 3][t])
    if (t === 2) hitAll(e, foes(e).filter(q => q.medals), 3)
  },
  // 59 Архаровец
  [at(59)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => !holds(e.s, q)))]), t = M(e)
    hitC(e, v, t === 2 ? (foes(e).length === 1 ? 6 : 3) : [1, 2][t])
  },
}
Object.assign(EFFECTS, CASTLE_EFFECTS)

// ---------- нежданчики замка ----------
const CASTLE_SURPRISE: Record<number, (ctx: Ctx, p: PlayerState) => void> = {
  // Кидала: сокровище — в начале следующей игры
  [at(31)]: (ctx, p) => { const t = drawFrom(ctx.s, ctx.s.treasureDeck, ctx.s.treasureDiscard); if (t != null) { (p.later ??= []).push(t); log(ctx.s, `${p.name} припрятал сокровище на следующую игру.`) } },
  // Грибуль Дюк: ровно 1 жизнь
  [at(36)]: (ctx, p) => { p.life = 1; ev(ctx.s, { k: 'heal', p: p.id, n: 1, before: 0, after: 1 }); log(ctx.s, `🍄 ${p.name} выживает с 1 жизнью!`) },
  // Ядрочист: кубик урона убийце
  [at(40)]: (ctx, p) => {
    const k = ctx.s.turn && ctx.s.turn.actor !== p.id ? ctx.s.players[ctx.s.turn.actor] : null
    if (k?.alive) damage(ctx, k, die(ctx, p, 'Ядрочист'))
  },
  // Дохлопатра: ещё 2 карты дохлых колдунов
  [at(49)]: (ctx, p) => { drawDead(ctx, p); drawDead(ctx, p) },
  // Пендальф: тварь из заклинания принимает урон
  [at(51)]: (ctx, p) => {
    const c = p.spell?.find(c => !c.done && !c.on && isCreature(c.id))
    if (!c) return
    let life = 1
    for (let i = ctx.s.ev.length - 1; i >= 0; i--) { const x = ctx.s.ev[i]; if (x.k === 'dmg' && x.p === p.id) { life = x.before; break } }
    c.done = true
    p.life = life
    log(ctx.s, `🛡 ${cardName(c.id)} принимает удар на себя — ${p.name} жив!`)
  },
}
const swampSurprise = hooks.surprise
hooks.surprise = (ctx, p) => {
  for (const c of p.spell ?? []) {
    if (c.done || c.on || c.id < 0) continue
    const f = spellOf(c.id).surprise ? CASTLE_SURPRISE[Math.floor(c.id / 10)] : undefined
    if (!f) continue
    log(ctx.s, `💥 Нежданчик ${p.name}: ${cardName(c.id)}!`)
    c.done = true
    f(ctx, p)
    if (p.life > 0) return
  }
  if (p.spell?.some(c => !c.done && !c.on && c.id >= 0 && spellOf(c.id).surprise && spellOf(c.id).set !== 'castle')) swampSurprise?.(ctx, p)
}

// ---------- дохлые колдуны ----------
const swampDead = hooks.deadNow
hooks.deadNow = (ctx, p, c) => {
  const { s } = ctx
  const k = Math.floor(c / 10)
  if (k === CD.tomb) { seize(s, p); return false } // держим: кровь за замок в конце раунда
  if (k === CD.joys) { gainBlood(s, p, medalsInPlay(s), '«Простые радости»'); return false }
  if (k === CD.squeeze) { for (const q of alive(s)) if (q !== p) giveBlood(s, q, p, 1); return true }
  if (k === CD.erosion) { gainBlood(s, p, s.firstDead === p.id ? 4 : 2, '«Эрозия металла»'); return true }
  return swampDead?.(ctx, p, c) ?? false
}
hooks.deadDrawn = (ctx, p) => {
  for (const q of alive(ctx.s)) if (q !== p && has(q, CT.shield) && die(ctx, q, 'Полный щит') >= 5) heal(ctx, q, 1)
}

// Начало игры (после раздачи, до сброса карт дохлых колдунов)
export function castleStartGame(ctx: Ctx) {
  const { s } = ctx
  if (!castleOn(s)) return
  s.castle = null
  s.firstDead = undefined
  s.bets = undefined
  for (const p of s.players) {
    if (p.tucked != null && !has(p, CT.regalia)) { s.discard.push(p.tucked); p.tucked = undefined }
    p.storm = undefined
    for (const t of p.later ?? []) { giveTreasure(s, p, t); hooks.gained?.(ctx, p, t) }
    p.later = undefined
    for (const c of p.deadCards) {
      const k = Math.floor(c / 10)
      if (k === CD.cub) {
        const id = revealUntil(ctx, isCreature)
        if (id != null) { (p.creatures ??= []).push(id); log(s, `🐾 ${p.name} начинает с тварью ${cardName(id)}.`) }
      }
      if (k === CD.joys && !p.medals) gainTreasure(ctx, p)
      if (k === CD.curse && s.lastWinner != null && s.lastWinner >= 0) {
        const w = s.players[s.lastWinner]
        for (let i = 0; i < 2 && w.hand.length; i++) s.discard.push(w.hand.pop()!)
        log(s, `🌩 «Оттянутое проклятие»: у ${w.name} на 2 карты меньше.`)
      }
      if (k === CD.storm) p.storm = true
      if (k === CD.whip) p.whip = (p.whip ?? 0) + 1
    }
  }
}

// Конец раунда: кровь за замок, «Смогинг»
export function castleRoundEnd(ctx: Ctx) {
  const { s } = ctx
  if (!castleOn(s)) return
  const h = holder(s)
  if (h) {
    const tomb = !h.alive && h.deadCards.some(c => Math.floor(c / 10) === CD.tomb)
    gainBlood(s, h, (tomb ? 4 : 1) + (has(h, CT.idol) ? 1 : 0), 'замок')
  }
  const live = alive(s), min = Math.min(...live.map(p => p.life))
  for (const p of live) if (p.life === min && has(p, CT.smog)) { log(s, `${p.name}: «Смогинг».`); heal(ctx, p, 2); gainTreasure(ctx, p) }
}

// Начало хода
export function castleTurnStart(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!castleOn(s)) return
  if (has(p, CT.shackles) && isLast(s, p)) gainTreasure(ctx, p)
  if (has(p, CT.gutter)) {
    const q = choosePlayer(ctx, p, enemies(s, p).filter(q => bloodOf(q)), '«Культовый кишкодав»: кто сдаёт тебе 1 литр крови?')
    if (q) giveBlood(s, q, p, 1)
  }
  if (has(p, CT.perch) && s.turn?.first) {
    const opts = enemies(s, p).flatMap(q => q.treasures.map(t => ({ v: q.id * 1000 + t, label: `${q.name}: ${TREASURES[t].name}`, card: { deck: 'treasures' as const, index: t } })))
    const v = ask(ctx, { player: p.id, prompt: '«Руки-окуни»: поменять на сокровище врага?', options: opts, optional: true }) as number | null
    if (v != null) { const q = s.players[Math.floor(v / 1000)]; moveTreasure(s, q, p, v % 1000); moveTreasure(s, p, q, CT.perch) }
  }
  if (has(p, CT.triple)) {
    const cnt: Record<string, number> = {}
    for (const c of p.spell ?? []) if (c.id >= 0) for (const sc of [spellOf(c.id).school, spellOf(c.id).school2]) if (sc) cnt[sc] = (cnt[sc] ?? 0) + 1
    const n = Object.values(cnt).reduce((a, x) => a + Math.floor(x / 3), 0)
    if (n) gainBlood(s, p, n, '«Трёхстволка»')
  }
}

// Открытие заклинания: «Грозовой беспредел»
export function castleReveal(ctx: Ctx, p: PlayerState) {
  if (!p.storm) return
  p.storm = undefined
  for (let i = 0; i < 20; i++) {
    const id = drawSpell(ctx.s)
    if (id == null) return
    if (spellOf(id).type === 'wild') { p.hand.push(id); log(ctx.s, `🌩 ${p.name}: «Шальная магия» — на руку.`); continue }
    log(ctx.s, `🌩 «Грозовой беспредел»: ${cardName(id)} — в заклинание ${p.name}.`)
    addToSpell(ctx, p, id, 'added')
    return
  }
}
// «Диван д-ра Ширинкина»: «Шальная магия» даёт ещё одну карту нужного типа
export function castleWild(ctx: Ctx, p: PlayerState, slot: Slot) {
  if (!has(p, CT.divan)) return
  const id = revealUntil(ctx, x => spellOf(x).type === slot)
  if (id != null) { log(ctx.s, `«Диван д-ра Ширинкина»: ещё ${cardName(id)}.`); addToSpell(ctx, p, id, 'added') }
}
// Ничья по очерёдности: «Пятиконечная глиста» — слить 1 литр и пойти раньше
export function castleTie(s: GameState, top: PlayerState[]): PlayerState | null {
  const done = top.find(p => p.tieRoll === 99) // уже слил на этом раунде
  if (done) return done
  const w = top.filter(p => has(p, CT.worm) && bloodOf(p))
  if (w.length !== 1) return null
  loseBlood(s, w[0], 1, '«Пятиконечная глиста» — ходит раньше')
  w[0].tieRoll = 99
  return w[0]
}

// ---------- хуки ядра ----------
hooks.died = (ctx, p, killer) => {
  const { s } = ctx
  if (!castleOn(s)) return
  if (s.firstDead == null) s.firstDead = p.id
  if (s.bets?.length) { for (const b of s.bets) if (b.q === p.id) gainBlood(s, s.players[b.p], 2, '«Копейки судьбы»'); s.bets = undefined }
  if (killer) {
    gainBlood(s, killer, 3 + (has(killer, CT.villains) ? 1 : 0), `убил ${p.name}`)
    if (s.bounty) { s.bounty = undefined; gainBlood(s, killer, 3, '«Их разыскивает милиция»') }
    if (holds(s, p)) seize(s, killer)
  }
  if (has(p, CT.whipboy) && alive(s).length <= 1) gainBlood(s, p, 3, '«Гран-при мальчика для битья»')
}
hooks.gained = (ctx, p, t) => {
  const { s } = ctx
  if (t === CT.idol) seize(s, p)
  if (t === CT.wanted) {
    loseTreasure(s, p, t)
    s.bounty = true
    log(s, '🚨 «Их разыскивает милиция»: первый, кто убьёт врага, получит 3 литра крови.')
    gainTreasure(ctx, p)
  }
  if (t === CT.scope) {
    hitAll(ctx, alive(s), 1)
    const n = alive(s).filter(q => q.life <= 5).length
    if (n && p.alive) gainBlood(s, p, 2 * n, '«Демонический прицел»')
  }
  if (t === CT.regalia && p.hand.length) {
    const id = chooseHandCard(ctx, p, '«Рыгалия Живоглота»: какую карту подложить (её знак будет считаться)?')!
    p.hand = p.hand.filter(x => x !== id)
    if (p.tucked != null) s.discard.push(p.tucked)
    p.tucked = id
    log(s, `${p.name} подкладывает под «Рыгалию» ${cardName(id)}.`)
  }
  if (t === CT.coins) {
    const q = choosePlayer(ctx, p, alive(s), '«Копейки судьбы»: кто подохнет следующим?')
    if (q) { (s.bets ??= []).push({ p: p.id, q: q.id }); log(s, `${p.name} ставит на смерть ${q.name}.`) }
  }
}
hooks.redirect = (ctx, foe, p, n) => {
  if (!has(p, CT.brake) || bloodOf(p) < 3) return null
  const list = alive(ctx.s).filter(q => q !== foe && q !== p)
  if (!list.length || !spill(ctx, p, 3, `«Аварийный тормоз»: ${n} ур. — другому`)) return null
  const q = choosePlayer(ctx, p, list, 'Кому достанется удар?')
  if (q) log(ctx.s, `🛑 ${p.name} переводит удар на ${q.name}!`)
  return q
}
const creatureRoll = (card: { index?: number }) => card.index != null && !!SPELLS[card.index]?.creature
hooks.moreDice = (ctx, p, card) => {
  if (!creatureRoll(card)) return 0
  let n = ctx.s.turn?.actor === p.id ? ctx.s.turn.creatureDice ?? 0 : 0
  if (p.whip) { p.whip--; n++; log(ctx.s, `${p.name}: «Плётка госпожи» — +1 кубик.`) }
  return n
}
hooks.dice = (ctx, p, dice, card) => {
  const { s } = ctx
  if (has(p, CT.five) && dice.includes(1)) {
    for (let i = 0; i < dice.length; i++) if (dice[i] === 1) dice[i] = d6(s)
    log(s, `«Пятерня шестерней»: единицы переброшены — ${dice.join('+')}.`)
  }
  const t = s.turn
  if (has(p, CT.necro) && creatureRoll(card) && t && !t.usedT?.includes(CT.necro)
    && yesNo(ctx, p, `«${card.name}»: ${dice.join('+')}. «Нехреномикон»: перебросить весь бросок?`, 'Перебросить', 'Оставить')) {
    ;(t.usedT ??= []).push(CT.necro)
    for (let i = 0; i < dice.length; i++) dice[i] = d6(s)
    log(s, `${p.name} перебрасывает (Нехреномикон): ${dice.join('+')}.`)
  }
  if (has(p, CT.sphere) && bloodOf(p) >= 2) {
    const v = ask(ctx, { player: p.id, prompt: `Бросок: ${dice.join('+')}. «Кусачая сфера»: слить 2 литра и перебросить кубик?`, optional: true, options: dice.map((d, i) => ({ v: i, label: `Кубик ${d}` })) })
    if (v != null) { loseBlood(s, p, 2, '«Кусачая сфера»'); dice[v as number] = d6(s); log(s, `${p.name} перебрасывает кубик: ${dice.join('+')}.`) }
  }
}
hooks.rolled = (ctx, p, total) => { if (total >= 13 && has(p, CT.sausage)) gainBlood(ctx.s, p, 1, '«Сосиска-бурка»') }
hooks.afterCard = (ctx, p, cur) => {
  if (!cur || cur.stay || !p.alive || !isCreature(cur.id) || !has(p, CT.doping)) return
  if (spill(ctx, p, 3, `«Допинггангер»: ${cardName(cur.id)} — СТОЯТЬ!`)) cur.stay = true
}
// Сокровища «слей кровь» — раз в свой ход
hooks.acts = (s, p): TreasureAct[] => {
  if (!castleOn(s)) return []
  const b = bloodOf(p), out: TreasureAct[] = []
  if (b >= 3 && p.life < 25) out.push({ t: CT.pendant, label: 'Слить 3 🩸 → накрутить 2 жизни', run: (e, p) => { loseBlood(e.s, p, 3); heal(e, p, 2) } })
  if (b >= 4) out.push({ t: CT.scope, label: 'Слить 4 🩸 → 2 урона врагу', run: (e, p) => { loseBlood(e.s, p, 4); damage(e, choosePlayer(e, p, enemies(e.s, p), 'Кому 2 урона?'), 2) } })
  if (b >= 1 && p.life < 25) out.push({ t: CT.whipboy, label: 'Слить 1 🩸 → накрутить 1 жизнь', run: (e, p) => { loseBlood(e.s, p, 1); heal(e, p, 1) } })
  if (b >= 2 && enemies(s, p).some(q => q.life >= 5)) out.push({ t: CT.gong, label: 'Слить 2 🩸 → враг: 1 урон за каждые 5 жизней', run: (e, p) => { loseBlood(e.s, p, 2); const q = choosePlayer(e, p, enemies(e.s, p), 'Кого?'); if (q) damage(e, q, Math.floor(q.life / 5)) } })
  return out
}
