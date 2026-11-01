// «Лютый дебош в адской школе»: социальный статус (планшет 1–8), роли статуса в начале раунда, задиры,
// эффекты заклинаний 184–228, нежданчики школы, сокровища 76–100 и карты дохлых колдунов 24–32.
// Тексты — transcript/school-*.md.
import './castle.ts' // хуки замка ставятся раньше: школа их дополняет
import './abilities.ts'
import { SCHOOL_NAMES, SPELLS, TREASURES, type School } from '../data/cards.ts'
import {
  ab, alive, ask, cardName, choosePlayer, chooseHandCard, chooseTreasure, d6, damage, drawDead, drawSpell, enemies, gainTreasure,
  heal, hitAll, hooks, leftEnemy, log, loseTreasure, mightyRoll, rightEnemy, rollEv, signs, spellOf, strongest, tier, weakest, yesNo,
  type Ctx, type TreasureAct,
} from './core.ts'
import { EFFECTS, addToSpell, type E } from './effects.ts'
import type { CardId, GameState, PlayerState } from './types.ts'

const OFF = 184
const at = (n: number) => OFF + n
export const SCT = {
  shaggy: 76, sister: 77, tech: 78, quaker: 79, botany: 80, dance: 81, wipe: 82, affair: 83, jelly: 84, album: 85,
  troll: 86, bus: 87, journal: 88, bro: 89, crybaby: 90, classmates: 91, terror: 92, le: 93, chess: 94, three: 95,
  gourmet: 96, carton: 97, milkman: 98, buddy: 99, golden: 100,
} as const
export const SCD = { joke: 24, busted: 25, mince: 26, spent: 27, sucked: 28, rolled: 29, ranOut: 30, banned: 31, overdone: 32 } as const
export const schoolOn = (s: GameState) => !!s.sets?.includes('school')
export const ROLES: Record<number, [string, string]> = {
  8: ['🎖', 'Староста: в начале раунда берёт карту и выбирает знак — всем +1 кубик к могучим броскам с ним'],
  7: ['💪', 'Качок: в начале раунда требует у младшего карту выбранного типа, иначе 3 урона'],
  6: ['📣', 'Чирлидерша: в начале раунда накручивает 2 жизни себе и 2 — старосте или качку'],
  5: ['💅', 'Стерва: в начале раунда берёт сокровище, если их у неё не больше всех'],
  4: ['🤓', 'Ботан: когда его жизни — простое число, его урон +1'],
  3: ['💊', 'Торчок: в начале раунда бьёт старшего уроном по числу его медалей'],
  2: ['🦨', 'Изгой: если в заклинании 1 карта — открывает 2 и добавляет те, что другого типа'],
  1: ['🥲', 'Лузер: способностей нет'],
}

// ---------- социальный статус ----------
export const rank = (p: PlayerState) => p.rank ?? 0
const onBoard = (s: GameState) => alive(s).filter(q => q.rank != null)
const at8 = (s: GameState, r: number) => onBoard(s).find(q => q.rank === r) ?? null
// Сдвинуть статус: занятые клетки сдвигаются цепочкой навстречу. by — враг, чей эффект понизил статус («Забанен»).
export function moveRank(e: Ctx, p: PlayerState | null, d: number, by?: PlayerState) {
  const { s } = e
  if (!p || !p.alive || p.rank == null || !d || !schoolOn(s)) return
  const from = p.rank, to = Math.max(1, Math.min(8, from + d))
  if (to === from) return
  const dir = to > from ? -1 : 1
  const moved: [PlayerState, number][] = []
  let cur = to, q = at8(s, cur)
  p.rank = -1
  while (q && q !== p) {
    const nx = at8(s, cur + dir)
    moved.push([q, cur + dir])
    q.rank = -1
    cur += dir
    q = nx
  }
  p.rank = to
  for (const [x, r] of moved) x.rank = r
  log(s, `🏫 ${p.name}: статус ${from}→${to}${moved.length ? ` (${moved.map(([x, r]) => `${x.name}→${r}`).join(', ')})` : ''}.`)
  // «Забанен»: враг понизил статус — 2 урона за каждую позицию
  const ban = (x: PlayerState, lost: number) => {
    if (!by || by === x || lost <= 0 || !x.sd?.includes(SCD.banned) || !by.alive) return
    x.sd = x.sd.filter(k => k !== SCD.banned)
    log(s, `🚫 ${x.name}: «Забанен» — ${by.name} получает за унижение.`)
    damage(e, by, 2 * lost)
  }
  if (to < from) ban(p, from - to)
  for (const [x, r] of moved) if (dir === -1) ban(x, 1); else void r
}
// Ближайшие занятые клетки сверху и снизу
function boardNeighbors(s: GameState, p: PlayerState): PlayerState[] {
  const list = onBoard(s).filter(q => q !== p).sort((a, b) => rank(a) - rank(b))
  const up = list.find(q => rank(q) > rank(p)), down = [...list].reverse().find(q => rank(q) < rank(p))
  return [up, down].filter((q): q is PlayerState => !!q)
}

// ---------- помощники ----------
const uniq = (list: (PlayerState | null)[]) => [...new Set(list.filter((q): q is PlayerState => !!q))]
const foes = (e: E) => enemies(e.s, e.p)
const chooseFoe = (e: E, list = foes(e), prompt = 'Выбери врага') => choosePlayer(e, e.p, list, prompt)
const has = (p: PlayerState, t: number) => p.treasures.includes(t)
const spellLen = (p: PlayerState) => p.spell?.length ?? 0
const lower = (e: E) => foes(e).filter(q => rank(q) < rank(e.p))
const higher = (e: E) => foes(e).filter(q => rank(q) > rank(e.p))
const weaker = (e: E) => foes(e).filter(q => q.life < e.p.life)
const tougher = (e: E) => foes(e).filter(q => q.life > e.p.life)
function mostTreasures(e: E): PlayerState | null {
  const list = foes(e)
  if (!list.length) return null
  const m = Math.max(...list.map(q => q.treasures.length))
  return chooseFoe(e, list.filter(q => q.treasures.length === m), 'Ничья: у кого больше всех сокровищ?')
}
// Одна жертва; «Кровопускной альбом» — любой враг при заклинании из 2 карт и меньше
function one(e: E, pick: () => PlayerState | null): PlayerState | null {
  if (has(e.p, SCT.album) && spellLen(e.p) <= 2 && foes(e).length > 1 && yesNo(e, e.p, '«Кровопускной альбом»: выбрать жертву самому?', 'Выбрать', 'Нет')) return chooseFoe(e)
  return pick()
}
const victims = (e: E, pick: () => (PlayerState | null)[]) => (e.card.type === 'delivery' && e.s.turn?.deliveryAll ? foes(e) : uniq(pick()))
// Могучий бросок: «СТОЯТЬ!», «Шашни с училкой», «Мохнатки» (ещё жертвы), «Адоклассники» (статус жертвы −1 за шестёрку)
function M(e: E, v: PlayerState[]): number {
  const t = tier(mightyRoll(e, e.p, e.card))
  const d = SPELLS[e.card.index]
  if (d.creature && e.cur) {
    if (d.mighty?.[t].text.includes('СТОЯТЬ')) { e.cur.stay = true; log(e.s, `🐾 ${d.name}: СТОЯТЬ!`) }
    else if (has(e.p, SCT.affair) && yesNo(e, e.p, `«Шашни с училкой»: сбросить и оставить ${d.name} в игре?`, 'СТОЯТЬ!', 'Нет')) {
      loseTreasure(e.s, e.p, SCT.affair); e.cur.stay = true; log(e.s, `🐾 ${d.name}: СТОЯТЬ! (Шашни)`)
    }
  }
  const sixes = (e.s.lastRoll?.dice ?? []).filter(x => x === 6).length
  if (sixes && has(e.p, SCT.shaggy)) for (let i = 0; i < sixes; i++) {
    const q = chooseFoe(e, foes(e).filter(q => !v.includes(q)), '«Мохнатки»: ещё одна жертва')
    if (q) v.push(q)
  }
  if (sixes && has(e.p, SCT.classmates)) for (const q of v) moveRank(e, q, -sixes, e.p)
  return t
}
// Задира: только если статус врага ниже
const bully = (e: E, q: PlayerState | null) => !!q && rank(q) < rank(e.p)
const bullyHit = (e: E, q: PlayerState | null, n: number) => damage(e, q, q && has(e.p, SCT.golden) && rank(q) <= 4 ? n + 1 : n)
function addTop(e: E, q: PlayerState | null) {
  if (!bully(e, q)) return
  const id = drawSpell(e.s)
  if (id == null) return
  log(e.s, `😈 Задира: ${e.p.name} добавляет верхнюю карту колоды.`)
  addToSpell(e, e.p, id, 'added')
}
function removeOne(e: E, q: PlayerState | null) {
  if (!q || !bully(e, q) || !q.alive || q.acted || !q.spell || q.spell.length < 2) return
  const list = q.spell.filter(c => c.id >= 0 && !c.done && !c.on).map(c => c.id)
  const id = chooseHandCard(e, q, `Задира ${e.p.name}: какую карту убрать из своего заклинания?`, list)
  if (id == null) return
  q.spell = q.spell.filter(c => c.id !== id)
  e.s.discard.push(id)
  log(e.s, `😈 Задира: ${q.name} убирает из заклинания ${cardName(id)}.`)
}
function die1(e: Ctx, p: PlayerState, label = ''): number { const r = d6(e.s); rollEv(e.s, p, [r], r, label); return r }

// ---------- эффекты заклинаний ----------
export const SCHOOL_EFFECTS: Record<number, (e: E) => void> = {
  // 0 Грустнявый
  [at(0)]: e => {
    const v = victims(e, () => [one(e, () => weakest(e, e.p))]), t = M(e, v)
    hitAll(e, v, [1, 2, 4][t])
    if (t < 2) for (const q of v) moveRank(e, q, t ? -3 : -2, e.p)
  },
  // 1 От Кожаного Музрика
  [at(1)]: e => hitAll(e, weaker(e), 2),
  // 2 От Сына Маминой Подруги
  [at(2)]: e => { moveRank(e, e.p, 1); damage(e, chooseFoe(e, boardNeighbors(e.s, e.p), 'Кому из соседей по статусу 4 урона?'), 4) },
  // 3 От Модного Трусотяга
  [at(3)]: e => { const q = one(e, () => leftEnemy(e.s, e.p)); bullyHit(e, q, 2); addTop(e, q) },
  // 4 От Небритого Жиртяньяна
  [at(4)]: e => { moveRank(e, e.p, -2); hitAll(e, higher(e), 3) },
  // 5 От Эмочки Заточкиной
  [at(5)]: e => { const q = one(e, () => weakest(e, e.p)); bullyHit(e, q, 2); addTop(e, q) },
  // 6 От Обдолбанного Обжешника
  [at(6)]: e => gainTreasure(e, e.p),
  // 7 От Двоечника Впискина
  [at(7)]: e => { moveRank(e, e.p, 1); hitAll(e, lower(e), 2) },
  // 8 От Хмурого Тазовода
  [at(8)]: e => { const q = one(e, () => rightEnemy(e.s, e.p)); bullyHit(e, q, 2); addTop(e, q) },
  // 9 От Месье Колбасье
  [at(9)]: e => {
    const q = chooseFoe(e, foes(e).filter(q => q.treasures.length), 'Кто сбрасывает сокровище?')
    const t = q && chooseTreasure(e, q, q, 'Сбрось своё сокровище')
    if (q && t != null) { loseTreasure(e.s, q, t); log(e.s, `${q.name} сбрасывает сокровище.`) }
  },
  // 10 От Вонючего Дергунчика
  [at(10)]: e => { moveRank(e, e.p, 1); hitAll(e, boardNeighbors(e.s, e.p), 2) },
  // 11 От Альфасамки
  [at(11)]: e => { const q = one(e, () => mostTreasures(e)); bullyHit(e, q, 2); addTop(e, q) },
  // 12 От Водного Пыхфессора
  [at(12)]: e => heal(e, e.p, 2),
  // 13 От Учителя Языков
  [at(13)]: e => hitAll(e, foes(e), 1),
  // 14 От Верки Тря-сучки
  [at(14)]: e => {
    const q = chooseFoe(e, foes(e).filter(q => q.rank != null), 'С кем поменяться статусом?')
    if (!q || e.p.rank == null) return
    const mine = rank(e.p)
    ;[e.p.rank, q.rank] = [q.rank!, e.p.rank]
    log(e.s, `🏫 ${e.p.name} и ${q.name} меняются статусом (${mine}↔${rank(e.p)}).`)
    damage(e, q, rank(e.p) < mine ? 4 : 2)
  },
  // 15 От Владика-Видика
  [at(15)]: e => { const q = one(e, () => strongest(e, e.p)); bullyHit(e, q, 2); addTop(e, q) },
  // 16 Драговнейший
  [at(16)]: e => { gainTreasure(e, e.p); if (rank(e.p) >= 6) gainTreasure(e, e.p) },
  // 17 Слюнявый
  [at(17)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, lower(e)))]), t = M(e, v)
    if (t === 0) for (const q of v) moveRank(e, q, 1)
    else hitAll(e, v, t === 1 ? 3 : 4)
    if (t === 2) gainTreasure(e, e.p)
  },
  // 18 Неуважительный
  [at(18)]: e => { const q = one(e, () => rightEnemy(e.s, e.p)); bullyHit(e, q, 2); removeOne(e, q) },
  // 19 Дикий предок (тварь)
  [at(19)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, foes(e).filter(q => q.acted)))]), t = M(e, v)
    hitAll(e, v, [2, 2, 3][t])
    if (t === 1) for (const q of v) moveRank(e, q, -2, e.p)
  },
  // 20 Ветеран труда
  [at(20)]: e => { const v = victims(e, () => [chooseFoe(e)]); hitAll(e, v, [1, 2, 5][M(e, v)]) },
  // 21 Дизлайк
  [at(21)]: e => { const v = victims(e, () => [one(e, () => leftEnemy(e.s, e.p))]); hitAll(e, v, [2, 3, 2 * spellLen(e.p)][M(e, v)]) },
  // 22 Бессердечный Френдзонер
  [at(22)]: e => {
    const v = victims(e, () => [one(e, () => rightEnemy(e.s, e.p))]), t = M(e, v)
    hitAll(e, v, [1, 2, 2][t])
    if (t === 0) moveRank(e, e.p, 1)
    else for (const q of v) moveRank(e, q, -t, e.p)
  },
  // 23 Запрет Абортов (тварь)
  [at(23)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, weaker(e)))]), t = M(e, v)
    hitAll(e, v, [1, 2, 3][t])
    if (t < 2) moveRank(e, e.p, 1)
  },
  // 24 Дерьмосмерч
  [at(24)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, foes(e).filter(q => !q.acted)))]), t = M(e, v)
    hitAll(e, v, [1, 1, 2 * spellLen(e.p)][t])
    if (t === 1) moveRank(e, e.p, 2)
  },
  // 25 Академический угар
  [at(25)]: e => {
    const v = victims(e, () => [chooseFoe(e)]), t = M(e, v)
    hitAll(e, v, [1, 2, 3][t])
    if (t) for (const q of v) moveRank(e, q, -t, e.p)
  },
  // 26 Пёс-Крышеснос (тварь): каждый враг хилее тебя
  [at(26)]: e => { const v = victims(e, () => weaker(e)); hitAll(e, v, [1, 2, 2][M(e, v)]) },
  // 27 Инстакиллер
  [at(27)]: e => {
    const v = victims(e, () => [one(e, () => leftEnemy(e.s, e.p))]), t = M(e, v)
    hitAll(e, v, [1, 3, 2 * spellLen(e.p)][t])
    if (t === 0) gainTreasure(e, e.p)
  },
  // 28 Господин Дыректор (тварь): каждый враг со статусом выше
  [at(28)]: e => {
    const v = victims(e, () => higher(e)), t = M(e, v)
    if (t === 0) damage(e, e.p, 1)
    else hitAll(e, v, 2)
  },
  // 29 Сатанальный Тест
  [at(29)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, weaker(e)))]), t = M(e, v)
    hitAll(e, v, [2, 2, 2 * spellLen(e.p)][t])
    if (t === 1) for (const q of v) moveRank(e, q, -2, e.p)
  },
  // 30 Пивной Экзорцизм
  [at(30)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, higher(e)))]), t = M(e, v)
    hitAll(e, v, [1, 2, 3][t])
    if (t === 1) for (const q of v) moveRank(e, q, -3, e.p)
    if (t === 2) moveRank(e, e.p, 2)
  },
  // 31 Шкафчик боли
  [at(31)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, lower(e)))]), t = M(e, v)
    hitAll(e, v, [1, 2, 3][t])
    if (t === 1) for (const q of v) moveRank(e, q, -2, e.p)
    if (t === 2) gainTreasure(e, e.p)
  },
  // 32 Люсяфер (тварь)
  [at(32)]: e => { const v = victims(e, () => [one(e, () => chooseFoe(e, tougher(e)))]); hitAll(e, v, [2, 3, 3][M(e, v)]) },
  // 33 Единый Госэкзамен
  [at(33)]: e => {
    const v = victims(e, () => [one(e, () => rightEnemy(e.s, e.p))]), t = M(e, v)
    hitAll(e, v, [1, 2, 2 * spellLen(e.p)][t])
    if (t === 0) for (const q of v) moveRank(e, q, -2, e.p)
  },
  // 34 Петушарный
  [at(34)]: e => { hitAll(e, foes(e).filter(q => q.life >= 10), 2); if (rank(e.p) >= 6) heal(e, e.p, 3) },
  // 35 Зачётный
  [at(35)]: e => { const q = one(e, () => mostTreasures(e)); bullyHit(e, q, 2); removeOne(e, q) },
  // 36 Освежающий
  [at(36)]: e => { const v = victims(e, () => [one(e, () => rightEnemy(e.s, e.p))]), t = M(e, v); hitAll(e, v, t + 1); heal(e, e.p, t + 1) },
  // 37 Чирлидерский
  [at(37)]: e => { const q = chooseFoe(e, boardNeighbors(e.s, e.p), 'Кому из соседей по статусу 2 урона?'); bullyHit(e, q, 2); removeOne(e, q) },
  // 38 Подлизный
  [at(38)]: e => { damage(e, one(e, () => rightEnemy(e.s, e.p)), 2); if (rank(e.p) >= 6) hitAll(e, foes(e).filter(q => q.medals), 3) },
  // 39 Дымонутый
  [at(39)]: e => {
    const v = victims(e, () => [one(e, () => chooseFoe(e, tougher(e)))]), t = M(e, v)
    hitAll(e, v, [2, 2, 4][t])
    if (t === 1) gainTreasure(e, e.p)
  },
  // 40 Герпесный
  [at(40)]: e => { const q = one(e, () => leftEnemy(e.s, e.p)); bullyHit(e, q, 2); removeOne(e, q) },
  // 41 Прожаренный
  [at(41)]: e => {
    const v = victims(e, () => [chooseFoe(e)]), t = M(e, v)
    hitAll(e, v, [1, 3, 4][t])
    if (t === 0) for (const q of v) moveRank(e, q, -2, e.p)
  },
  // 42 Ложнотревожный
  [at(42)]: e => (rank(e.p) >= 6 ? hitAll(e, foes(e), 2) : damage(e, one(e, () => strongest(e, e.p)), 2)),
  // 43 Бафомётный: кубик ниже статуса — 3 урона
  [at(43)]: e => {
    const hurt = alive(e.s).filter(q => die1(e, q, 'Бафомётный') < rank(q))
    hitAll(e, hurt, 3)
  },
  // 44 Негодующий
  [at(44)]: e => { const q = one(e, () => chooseFoe(e, foes(e).filter(q => q.life <= 10))); bullyHit(e, q, 2); removeOne(e, q) },
}
Object.assign(EFFECTS, SCHOOL_EFFECTS)

// ---------- нежданчики: 2 урона убийце за каждый знак школы ----------
const SURPRISE_SIGN: Record<number, School> = { [at(1)]: 'dark', [at(6)]: 'hex', [at(9)]: 'fire', [at(12)]: 'grass', [at(13)]: 'haze' }
const prevSurprise = hooks.surprise
hooks.surprise = (ctx, p) => {
  const k = ctx.s.turn && ctx.s.turn.actor !== p.id ? ctx.s.players[ctx.s.turn.actor] : null
  for (const c of p.spell ?? []) {
    if (c.done || c.on || c.id < 0) continue
    const sc = SURPRISE_SIGN[Math.floor(c.id / 10)]
    if (!sc) continue
    c.done = true
    const n = signs(p)[sc]
    log(ctx.s, `💥 Нежданчик ${p.name}: ${cardName(c.id)} — ${SCHOOL_NAMES[sc]} ×${n}!`)
    if (k?.alive) damage(ctx, k, 2 * n)
  }
  if (p.spell?.some(c => !c.done && !c.on && c.id >= 0 && spellOf(c.id).surprise && spellOf(c.id).set !== 'school')) prevSurprise?.(ctx, p)
}

// ---------- дохлые колдуны ----------
const prevDead = hooks.deadNow
hooks.deadNow = (ctx, p, c) => {
  const { s } = ctx
  const k = Math.floor(c / 10)
  if (k === SCD.joke) { drawDead(ctx, p); drawDead(ctx, p); return true }
  if (k === SCD.mince) {
    const q = choosePlayer(ctx, p, alive(s), '«Пущен на фарш»: кому?')
    if (q) {
      const sc = ask(ctx, { player: p.id, prompt: '«Пущен на фарш»: какой знак?', options: (Object.keys(SCHOOL_NAMES) as School[]).map(v => ({ v, label: SCHOOL_NAMES[v] })) }) as School
      const n = q.hand.filter(id => spellOf(id).school === sc || spellOf(id).school2 === sc).length
      log(s, `${q.name} открывает руку: карт со знаком ${SCHOOL_NAMES[sc]} — ${n}.`)
      damage(ctx, q, n)
    }
    return true
  }
  if (k === SCD.ranOut) {
    if (s.players.filter(q => !q.alive).length === 1) { p.medals++; log(s, `🏅 ${p.name}: «Добегался» — медаль!`) }
    return true
  }
  return prevDead?.(ctx, p, c) ?? false
}

// ---------- начало игры ----------
export function schoolStartGame(ctx: Ctx) {
  const { s } = ctx
  if (!schoolOn(s)) return
  const fresh = s.game <= 1 || s.players.some(p => p.rank == null)
  let order: PlayerState[]
  if (fresh) {
    const r = new Map(s.players.map(p => { const a = d6(s), b = d6(s); rollEv(s, p, [a, b], a + b, 'статус'); return [p, a + b + Math.random() / 10] }))
    order = [...s.players].sort((a, b) => r.get(b)! - r.get(a)!)
  } else {
    const dead = s.deaths ?? []
    const w = s.lastWinner != null && s.lastWinner >= 0 ? s.players[s.lastWinner] : null
    const rest = s.players.filter(p => p !== w).sort((a, b) => dead.indexOf(b.id) - dead.indexOf(a.id))
    order = [...(w ? [w] : []), ...rest]
  }
  order.forEach((p, i) => { p.rank = 8 - i })
  s.deaths = []
  s.head = undefined
  log(s, `🏫 Социальный статус: ${order.map(p => `${p.name} ${p.rank}`).join(', ')}.`)
  for (const p of s.players) {
    p.sd = p.deadCards.map(c => Math.floor(c / 10)).filter(k => k >= SCD.busted && k <= SCD.overdone && k !== SCD.mince && k !== SCD.ranOut)
    if (p.sd.includes(SCD.spent)) gainTreasure(ctx, p)
  }
}
// Порядок смертей — для статуса в следующей игре
const prevDied = hooks.died
hooks.died = (ctx, p, killer) => {
  prevDied?.(ctx, p, killer)
  if (schoolOn(ctx.s)) (ctx.s.deaths ??= []).push(p.id)
}

// ---------- начало раунда: способности статуса (от 8 к 1) ----------
export function schoolRound(ctx: Ctx) {
  const { s } = ctx
  if (!schoolOn(s)) return
  s.head = undefined
  const who = (r: number) => { const q = at8(s, r); return q?.alive ? q : null }
  const st = who(8)
  if (st) {
    const c = drawSpell(s)
    if (c != null) st.hand.push(c)
    const sc = ask(ctx, { player: st.id, prompt: '🎖 Староста: какой знак получит +1 кубик в этом раунде?', options: (Object.keys(SCHOOL_NAMES) as School[]).map(v => ({ v, label: SCHOOL_NAMES[v] })) }) as School
    s.head = sc
    log(s, `🎖 Староста ${st.name}: в этом раунде +1 кубик к могучим броскам со знаком ${SCHOOL_NAMES[sc]}.`)
  }
  const jock = who(7)
  if (jock) {
    const q = choosePlayer(ctx, jock, enemies(s, jock).filter(q => rank(q) < 7), '💪 Качок: у кого отжать карту?')
    if (q) {
      const ty = ask(ctx, { player: jock.id, prompt: '💪 Какого типа карту требовать?', options: [{ v: 'source', label: 'Заводилу' }, { v: 'quality', label: 'Наворот' }, { v: 'delivery', label: 'Приход' }] })
      const list = q.hand.filter(id => spellOf(id).type === ty)
      const id = list.length ? chooseHandCard(ctx, q, `💪 ${jock.name} требует карту — отдать? (иначе 3 урона)`, list, true) : null
      if (id != null) { q.hand = q.hand.filter(x => x !== id); jock.hand.push(id); log(s, `💪 ${q.name} отдаёт карту качку ${jock.name}.`) }
      else { log(s, `💪 ${q.name} не отдаёт карту — получает от качка.`); damage(ctx, q, 3) }
    }
  }
  const cheer = who(6)
  if (cheer) {
    heal(ctx, cheer, 2)
    heal(ctx, choosePlayer(ctx, cheer, [who(8), who(7)].filter((q): q is PlayerState => !!q), '📣 Кому ещё 2 жизни?'), 2)
  }
  const b = who(5)
  if (b && b.treasures.length < Math.max(...alive(s).map(q => q.treasures.length))) { log(s, `💅 Стерва ${b.name} берёт сокровище.`); gainTreasure(ctx, b) }
  const junk = who(3)
  if (junk) {
    const q = choosePlayer(ctx, junk, enemies(s, junk).filter(q => rank(q) > 3 && q.medals), '💊 Торчок: кого бить (урон = его медали)?')
    if (q) {
      damage(ctx, q, q.medals)
      if (!q.alive && junk.alive) { junk.medals++; log(s, `💊 ${junk.name} получает медаль!`); moveRank(ctx, junk, 1) }
    }
  }
}

// ---------- начало хода ----------
export function schoolTurnStart(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!schoolOn(s)) return
  if (has(p, SCT.bus)) hitAll(ctx, enemies(s, p).filter(q => rank(q) >= rank(p) + 3), 3)
  const sd = p.sd ?? []
  if (sd.includes(SCD.busted) && s.turn) {
    const sg = signs(p), best = (Object.keys(sg) as School[]).sort((a, b) => sg[b] - sg[a])[0]
    s.turn.spal = best
    p.sd = sd.filter(k => k !== SCD.busted)
    log(s, `🔥 ${p.name}: «Спалился» — +1 кубик к броскам со знаком ${SCHOOL_NAMES[best]} в этом ходу.`)
  }
  if (sd.includes(SCD.sucked) && rank(p) < 8) { p.sd = p.sd!.filter(k => k !== SCD.sucked); log(s, `${p.name}: «Засосало».`); moveRank(ctx, p, 2) }
  if (sd.includes(SCD.overdone) && higher({ ...ctx, p } as E).length) {
    const n = ask(ctx, { player: p.id, prompt: '«Довыступался»: понизить статус и ударить старших (2 урона каждому)?', optional: true, options: [1, 2, 3].map(v => ({ v, label: `−${v}` })) }) as number | null
    if (n) {
      p.sd = p.sd!.filter(k => k !== SCD.overdone)
      moveRank(ctx, p, -n)
      hitAll(ctx, enemies(s, p).filter(q => rank(q) > rank(p)), 2)
    }
  }
}
// Открытие заклинания: Изгой (статус 2) с одной картой — открыть 2 и добавить другого типа
export function schoolReveal(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!schoolOn(s) || rank(p) !== 2 || (p.spell?.length ?? 0) > 1) return
  const mine = p.spell?.[0]?.slot
  for (let i = 0; i < 2; i++) {
    const id = drawSpell(s)
    if (id == null) break
    const ty = spellOf(id).type
    if (ty === 'wild' || ty === mine) { s.discard.push(id); continue }
    log(s, `🦨 Изгой ${p.name} добавляет ${cardName(id)}.`)
    addToSpell(ctx, p, id, 'added')
  }
}
// Инициатива: +5 от сокровищ-друзей, +8 «Скатился» (первый раунд)
const FRIENDS = [SCT.sister, SCT.troll, SCT.bro, SCT.crybaby, SCT.buddy]
export function schoolInit(s: GameState, p: PlayerState): number {
  if (!schoolOn(s)) return 0
  return 5 * FRIENDS.filter(t => has(p, t)).length + (s.round === 1 && p.sd?.includes(SCD.rolled) ? 8 : 0)
}

// ---------- хуки ядра ----------
const prevMore = hooks.moreDice
hooks.moreDice = (ctx, p, card) => {
  let n = prevMore?.(ctx, p, card) ?? 0
  const { s } = ctx
  if (!schoolOn(s)) return n
  const sc = [card.school, card.school2]
  if (s.head && sc.includes(s.head as School)) n++
  if (s.turn?.spal && s.turn.actor === p.id && sc.includes(s.turn.spal as School)) n++
  if (has(p, SCT.wipe) && spellLen(p) <= 2) n++
  return n
}
const prevHand = ab.hand
ab.hand = p => (prevHand?.(p) ?? 0) + (has(p, SCT.journal) ? 1 : 0)
const isPrime = (n: number) => n > 1 && [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)
const prevDmg = ab.dmg
ab.dmg = (ctx, foe, p, n) => {
  n = prevDmg ? prevDmg(ctx, foe, p, n) : n
  if (n > 0 && schoolOn(ctx.s) && rank(foe) === 4 && isPrime(foe.life)) n++
  return n
}
// Друзья (+5 к инициативе): при 5 жизнях и меньше — повторить карту своего знака (раз в ход)
const FRIEND_SIGN: Record<number, School> = { [SCT.sister]: 'haze', [SCT.troll]: 'grass', [SCT.bro]: 'fire', [SCT.crybaby]: 'dark', [SCT.buddy]: 'hex' }
const prevAfter = hooks.afterCard
hooks.afterCard = (ctx, p, cur) => {
  prevAfter?.(ctx, p, cur)
  const t = ctx.s.turn
  if (!cur || cur.id < 0 || !p.alive || p.life > 5 || !t || t.actor !== p.id) return
  const c = spellOf(cur.id), idx = Math.floor(cur.id / 10)
  for (const tr of FRIENDS) {
    const sc = FRIEND_SIGN[tr]
    if (!has(p, tr) || t.usedT?.includes(tr) || (c.school !== sc && c.school2 !== sc) || !EFFECTS[idx]) continue
    if (!yesNo(ctx, p, `${TREASURES[tr].name}: применить ${cardName(cur.id)} ещё раз?`, 'Повторить', 'Нет')) continue
    ;(t.usedT ??= []).push(tr)
    log(ctx.s, `${p.name}: ${TREASURES[tr].name} — ${cardName(cur.id)} ещё раз!`)
    EFFECTS[idx](Object.assign(ctx, { p, card: { ...(ctx as E).card, index: idx, type: c.type }, depth: 1, cur }) as E)
    return
  }
}
// Сокровища «в свой ход»
const CLUBS: Record<number, School> = { [SCT.tech]: 'fire', [SCT.botany]: 'grass', [SCT.dance]: 'dark', [SCT.le]: 'haze', [SCT.chess]: 'hex' }
const FINDS: Record<number, School> = { [SCT.terror]: 'fire', [SCT.three]: 'hex', [SCT.gourmet]: 'grass', [SCT.carton]: 'haze', [SCT.milkman]: 'dark' }
const withSign = (p: PlayerState, sc: School) => p.hand.filter(id => spellOf(id).school === sc || spellOf(id).school2 === sc)
const prevActs = hooks.acts
hooks.acts = (s, p): TreasureAct[] => {
  const out = prevActs?.(s, p) ?? []
  if (!schoolOn(s)) return out
  for (const [k, sc] of Object.entries(CLUBS)) {
    const t = +k
    if (!has(p, t) || !withSign(p, sc).length) continue
    out.push({ t, label: `Сбросить карту (${SCHOOL_NAMES[sc]}) → статус ±1`, run: (e, p) => {
      const id = chooseHandCard(e, p, 'Какую карту сбросить?', withSign(p, sc))!
      p.hand = p.hand.filter(x => x !== id); e.s.discard.push(id)
      const d = ask(e, { player: p.id, prompt: 'Статус:', options: [{ v: 1, label: 'Повысить' }, { v: -1, label: 'Понизить' }] }) as number
      moveRank(e, p, d)
    } })
  }
  for (const [k, sc] of Object.entries(FINDS)) {
    const t = +k
    if (!has(p, t) || !p.spell) continue
    out.push({ t, label: `Сбросить → найти в колоде карту (${SCHOOL_NAMES[sc]}) в заклинание`, run: (e, p) => {
      loseTreasure(e.s, p, t)
      const shown: CardId[] = []
      for (let i = 0; i < 300; i++) {
        const x = drawSpell(e.s)
        if (x == null) break
        if (spellOf(x).school === sc || spellOf(x).school2 === sc) { addToSpell(e, p, x, 'added'); break }
        shown.push(x)
      }
      e.s.discard.push(...shown)
    } })
  }
  if (has(p, SCT.quaker) && enemies(s, p).some(q => q.life <= 2))
    out.push({ t: SCT.quaker, label: 'Сбросить → убить каждого врага с 2 жизнями и меньше', run: (e, p) => { loseTreasure(e.s, p, SCT.quaker); for (const q of enemies(e.s, p).filter(q => q.life <= 2)) damage(e, q, q.life) } })
  if (has(p, SCT.jelly) && p.life < 25 && rank(p))
    out.push({ t: SCT.jelly, label: `Сбросить → накрутить ${rank(p)} ж.`, run: (e, p) => { loseTreasure(e.s, p, SCT.jelly); heal(e, p, rank(p)) } })
  return out
}
