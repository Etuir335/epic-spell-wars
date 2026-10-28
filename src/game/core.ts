// Общие операции движка: случайность, колоды, урон и лечение, знаки, могучий бросок, вопросы игрокам.
import { DEAD, SPELLS, TREASURES, type School } from '../data/cards.ts'
import type { CardId, Ev, GameState, Mod, PlayerState, QOption, Question, SpellCard } from './types.ts'

export const START_LIFE = 20
export const MAX_LIFE = 25
export const HAND = 8
export const hasMod = (s: GameState, m: Mod) => !!s.mods?.includes(m)
export const BOSS_LIFE = { grandpa: 21, slime: 21, mirror: 24 } as const
export const maxLife = (p: PlayerState) => (p.boss ? 99 : MAX_LIFE)

// Сокровища по индексу (см. transcript/treasures.md)
export const T = {
  cannonLeft: 0, jetpack: 1, trap: 2, crown: 6, luckyPanties: 7, luckyBra: 8, cannonFist: 9, crownStoned: 10,
  garters: 11, guide: 12, foolsGold: 13, helmet: 14, embryo: 15, skullRing: 17, stick: 18, throne: 19,
  cheat: 20, pigs: 21, despair: 22, codpiece: 24, cannonRight: 25,
} as const
// Дохлые колдуны по индексу (см. transcript/dead.md)
export const D = { nirvana: 0, payback: 1, shangri: 2, saint: 3, small: 4, pasture: 5, cosmic: 6, artifact: 7 } as const

// ---------- случайность (детерминированная, состояние в s.rng) ----------
export function rand(s: GameState, n: number): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n)
}
export const d6 = (s: GameState) => rand(s, 6) + 1
export function shuffle<X>(s: GameState, a: X[]): X[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(s, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- карты ----------
export const spellOf = (id: CardId) => SPELLS[Math.floor(id / 10)]
export const deadOf = (id: CardId) => DEAD[Math.floor(id / 10)]
export const isWild = (id: CardId) => id >= 0 && spellOf(id).type === 'wild'
export function cardName(id: CardId): string {
  return id < 0 ? '«Протонная ловушка»' : `«${spellOf(id).name}»`
}
export const treasureName = (t: number) => `«${TREASURES[t].name}»`

export function ev(s: GameState, e: Ev) {
  s.ev.push(e)
  if (s.ev.length > 160) {
    const k = s.ev.length - 160
    s.ev.splice(0, k)
    s.evBase += k
  }
}
// Бросок, не являющийся могучим (кубики эффектов, ничья по очерёдности).
export function rollEv(s: GameState, p: PlayerState, dice: number[], total: number, label: string) {
  ev(s, { k: 'roll', p: p.id, dice, bonus: total - dice.reduce((a, b) => a + b, 0), total, label })
  log(s, `🎲 ${p.name}${label ? ` (${label})` : ''}: ${dice.join('+')}${dice.length > 1 || total !== dice[0] ? ` = ${total}` : ''}.`)
}

export function log(s: GameState, text: string) {
  ev(s, { k: 'log', t: text })
  s.log.push(text)
  if (s.log.length > 80) {
    const k = s.log.length - 80
    s.log.splice(0, k)
    s.logBase += k
  }
}

export function drawSpell(s: GameState): CardId | null {
  if (!s.deck.length) {
    if (!s.discard.length) return null
    s.deck = shuffle(s, s.discard)
    s.discard = []
    log(s, 'Колода заклинаний перемешана заново.')
  }
  return s.deck.pop()!
}
export const handSize = (p: PlayerState) => HAND + (p.treasures.includes(T.helmet) ? 1 : 0)
export function fillHand(s: GameState, p: PlayerState) {
  while (p.hand.length < handSize(p)) {
    const c = drawSpell(s)
    if (c == null) break
    p.hand.push(c)
  }
}

function drawFrom<X>(s: GameState, deck: X[], discard: X[]): X | null {
  if (!deck.length) {
    if (!discard.length) return null
    deck.push(...shuffle(s, discard.splice(0)))
  }
  return deck.pop()!
}
export function gainTreasure(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!p.alive) return
  const t = drawFrom(s, s.treasureDeck, s.treasureDiscard)
  if (t == null) return log(s, `${p.name}: сокровищ не осталось.`)
  p.treasures.push(t)
  ev(s, { k: 'treasure', p: p.id, t })
  log(s, `${p.name} получает сокровище ${treasureName(t)}.`)
  if (t === T.helmet) {
    const c = drawSpell(s)
    if (c != null) p.hand.push(c)
  }
}
export function loseTreasure(s: GameState, p: PlayerState, t: number) {
  p.treasures = p.treasures.filter(x => x !== t)
  s.treasureDiscard.push(t)
  ev(s, { k: 'lose', p: p.id, t })
}
export function moveTreasure(s: GameState, from: PlayerState, to: PlayerState, t: number) {
  from.treasures = from.treasures.filter(x => x !== t)
  to.treasures.push(t)
  ev(s, { k: 'treasure', p: to.id, t, from: from.id })
  log(s, `${to.name} отжимает у ${from.name} ${treasureName(t)}.`)
  if (t === T.helmet) {
    const c = drawSpell(s)
    if (c != null) to.hand.push(c)
  }
}
export function drawDead(s: GameState, p: PlayerState) {
  const c = drawFrom(s, s.deadDeck, s.deadDiscard)
  if (c == null) return
  p.deadCards.push(c)
  ev(s, { k: 'dead', p: p.id, c })
  log(s, `${p.name} берёт карту дохлого колдуна «${deadOf(c).name}».`)
}

// ---------- игроки и соседи ----------
export const alive = (s: GameState) => s.players.filter(p => p.alive)
// Живые враги по часовой стрелке, начиная с левого соседа. Последний — правый враг.
export function enemies(s: GameState, p: PlayerState): PlayerState[] {
  const n = s.players.length, out: PlayerState[] = []
  for (let k = 1; k < n; k++) {
    const q = s.players[(p.id + k) % n]
    if (q.alive) out.push(q)
  }
  return out
}
export const leftEnemy = (s: GameState, p: PlayerState) => enemies(s, p)[0] ?? null
export const rightEnemy = (s: GameState, p: PlayerState) => enemies(s, p).at(-1) ?? null
// Живые соседи колдуна (слева и справа), без повторов — для «Ядрёного синтеза».
export function neighborsOf(s: GameState, p: PlayerState): PlayerState[] {
  const all = alive(s).filter(q => q !== p)
  if (!all.length) return []
  const n = s.players.length
  const find = (dir: number) => {
    for (let k = 1; k < n; k++) {
      const q = s.players[(p.id + dir * k + n * k) % n]
      if (q.alive && q !== p) return q
    }
    return null
  }
  return [...new Set([find(1), find(-1)].filter((q): q is PlayerState => !!q))]
}

// ---------- вопросы (шаг перезапускается с накопленными ответами) ----------
export class NeedInput { q: Question; constructor(q: Question) { this.q = q } }
export class GameOver {}
export interface Ctx {
  s: GameState
  answers: (number | string | null)[]
  next: number
}
export function ask(ctx: Ctx, q: Question): number | string | null {
  if (q.options.length === 0) return null
  if (q.options.length === 1 && !q.optional) return q.options[0].v
  if (ctx.next < ctx.answers.length) return ctx.answers[ctx.next++]
  throw new NeedInput(q)
}
const pOpt = (p: PlayerState): QOption => ({ v: p.id, label: p.name, player: p.id })
export function choosePlayer(ctx: Ctx, who: PlayerState, list: PlayerState[], prompt: string): PlayerState | null {
  if (!list.length) return null
  const v = ask(ctx, { player: who.id, prompt, options: list.map(pOpt) })
  return ctx.s.players[v as number]
}
export function strongest(ctx: Ctx, who: PlayerState, list = enemies(ctx.s, who)): PlayerState | null {
  const m = Math.max(...list.map(p => p.life))
  return choosePlayer(ctx, who, list.filter(p => p.life === m), 'Ничья: кто самый живучий враг?')
}
export function weakest(ctx: Ctx, who: PlayerState, list = enemies(ctx.s, who)): PlayerState | null {
  const m = Math.min(...list.map(p => p.life))
  return choosePlayer(ctx, who, list.filter(p => p.life === m), 'Ничья: кто самый хилый враг?')
}
export function randomEnemy(ctx: Ctx, who: PlayerState): PlayerState | null {
  const list = enemies(ctx.s, who)
  if (!list.length) return null
  const p = list[rand(ctx.s, list.length)]
  log(ctx.s, `Случайный враг — ${p.name}.`)
  return p
}
export function chooseTreasure(ctx: Ctx, who: PlayerState, owner: PlayerState, prompt: string, optional = false): number | null {
  if (!owner.treasures.length) return null
  const v = ask(ctx, {
    player: who.id, prompt, optional,
    options: owner.treasures.map(t => ({ v: t, label: TREASURES[t].name, card: { deck: 'treasures', index: t } })),
  })
  return v == null ? null : (v as number)
}
export function chooseHandCard(ctx: Ctx, who: PlayerState, prompt: string, ids = who.hand, optional = false): CardId | null {
  if (!ids.length) return null
  const v = ask(ctx, {
    player: who.id, prompt, optional,
    options: ids.map(id => ({ v: id, label: spellOf(id).name, card: { deck: 'spells', index: Math.floor(id / 10) } })),
  })
  return v == null ? null : (v as number)
}
export function yesNo(ctx: Ctx, who: PlayerState, prompt: string, yes: string, no: string): boolean {
  return ask(ctx, { player: who.id, prompt, options: [{ v: 1, label: yes }, { v: 0, label: no }] }) === 1
}

// ---------- жизни ----------
export function heal(ctx: Ctx, p: PlayerState | null, n: number) {
  if (!p || !p.alive || n <= 0) return
  const before = p.life
  p.life = Math.min(maxLife(p), p.life + n)
  if (p.life > before) ev(ctx.s, { k: 'heal', p: p.id, n: p.life - before, before, after: p.life })
  if (p.life > before) log(ctx.s, `${p.name} накручивает ${p.life - before} ж. (${before}→${p.life}).`)
}
export function damage(ctx: Ctx, p: PlayerState | null, n: number) {
  if (!p || !p.alive || n <= 0) return
  const from = ctx.s.turn?.actor ?? null
  if (hasMod(ctx.s, 'mirror') && from != null && from !== p.id) {
    ctx.s.hits = (ctx.s.hits ?? 0) + 1
    const att = ctx.s.players[from]
    if (ctx.s.hits % 3 === 0 && att.alive) {
      log(ctx.s, `🪞 Отражающий щит! Удар по ${p.name} отлетает в ${att.name}.`)
      p = att
    }
  }
  const before = p.life
  p.life -= n
  ev(ctx.s, { k: 'dmg', p: p.id, n, from: ctx.s.turn?.actor ?? null, before, after: Math.max(p.life, 0) })
  log(ctx.s, `${p.name} отхватывает ${n} ур. (${before}→${Math.max(p.life, 0)}).`)
  if (p.life <= 0) kill(ctx, p)
  else if (p.boss === 'slime' && n >= 5) {
    p.slimes = (p.slimes ?? 0) + 1
    log(ctx.s, `🟢 ${p.name} отпочковывает слизняка! Слизняков: ${p.slimes}.`)
  }
}
export function kill(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  p.life = 0
  p.alive = false
  ev(s, { k: 'death', p: p.id })
  log(s, `☠ ${p.name} склеивает ласты!`)
  s.discard.push(...p.hand)
  p.hand = []
  for (const t of [...p.treasures]) loseTreasure(s, p, t)
  // невыложенное заклинание мертвеца — в сброс (своё заклинание ходящий доигрывает в конце хода)
  if (p.spell && s.turn?.actor !== p.id) {
    s.discard.push(...p.spell.filter(c => c.id >= 0).map(c => c.id))
    if (p.spell.some(c => c.id < 0)) s.treasureDiscard.push(T.trap)
    p.spell = null
  }
  drawDead(s, p)
  const killer = s.turn ? s.players[s.turn.actor] : null
  if (hasMod(s, 'blood') && killer && killer !== p && killer.alive) {
    log(s, `🩸 Кровавая луна: ${killer.name} пьёт силу жертвы.`)
    heal(ctx, killer, 5)
  }
  if (alive(s).length <= 1) throw new GameOver()
}

// ---------- знаки и броски ----------
export function signs(p: PlayerState): Record<School, number> {
  const r: Record<School, number> = { grass: 0, hex: 0, haze: 0, dark: 0, fire: 0 }
  for (const c of p.spell ?? []) {
    const sc = c.id >= 0 ? spellOf(c.id).school : null
    if (sc) r[sc]++
  }
  for (const t of p.treasures) {
    const sc = TREASURES[t].school
    if (sc) r[sc]++
  }
  return r
}
export const uniqueSigns = (p: PlayerState) => Object.values(signs(p)).filter(n => n > 0).length

// Бросок одного кубика игроком (с «Труселями госпожи удачи»: +2).
export function rollOne(ctx: Ctx, p: PlayerState): { raw: number; total: number } {
  const raw = d6(ctx.s)
  return { raw, total: raw + (p.treasures.includes(T.luckyPanties) ? 2 : 0) }
}

export const isLast = (s: GameState, p: PlayerState) => alive(s).every(q => q === p || q.acted)

// Могучий бросок карты (school/type — знак и тип карты, которая бросает). Возвращает итог.
export function mightyRoll(ctx: Ctx, p: PlayerState, card: { school: School | null; type: string; name: string; index?: number }): number {
  const { s } = ctx
  const has = (t: number) => p.treasures.includes(t)
  let n = Math.max(1, card.school ? signs(p)[card.school] : 1)
  n += p.extraDice + (p.firstTurnDie ? 1 : 0)
  if (card.type === 'delivery' && has(T.cannonFist)) n += 1
  if (card.type === 'quality' && has(T.skullRing)) n += 2
  if (has(T.throne) && isLast(s, p)) n += 1
  if (has(T.despair) && p.life <= 9) n += 1
  let dice = Array.from({ length: n }, () => d6(s))
  const show = () => dice.join('+')
  if (hasMod(s, 'dice')) {
    const alt = Array.from({ length: n }, () => d6(s))
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
    const full = s.round % 2 === 1 // нечётный раунд — полнолуние: лучший бросок
    const old = show()
    if (full ? sum(alt) > sum(dice) : sum(alt) < sum(dice)) dice = alt
    log(s, `🌕 Кубики сошли с ума (${full ? 'полнолуние — лучший' : 'новолуние — худший'}): ${old} и ${alt.join('+')} → ${show()}.`)
  }
  if (has(T.luckyBra) && yesNo(ctx, p, `Могучий бросок «${card.name}»: ${show()}. Сбросить «Лифчик госпожи удачи» и перебросить?`, 'Перебросить', 'Оставить')) {
    loseTreasure(s, p, T.luckyBra)
    dice = dice.map(() => d6(s))
    log(s, `${p.name} перебрасывает (Лифчик): ${show()}.`)
    gainTreasure(ctx, p)
  }
  if (has(T.cheat)) {
    const v = ask(ctx, {
      player: p.id, prompt: `Бросок: ${show()}. «Справочник читера»: перебросить один кубик?`, optional: true,
      options: dice.map((d, i) => ({ v: i, label: `Кубик ${d}` })),
    })
    if (v != null) {
      dice[v as number] = d6(s)
      log(s, `${p.name} перебрасывает кубик (Справочник): ${show()}.`)
    }
  }
  let bonus = 0
  if (has(T.guide)) bonus += 2
  if (has(T.crownStoned)) bonus += uniqueSigns(p)
  if (has(T.stick)) bonus += 2 * s.players.filter(q => !q.alive).length
  if (has(T.luckyPanties) && dice.length === 1) bonus += 2
  const total = dice.reduce((a, b) => a + b, 0) + bonus
  s.lastRoll = { player: p.id, dice, bonus, total, label: card.name }
  ev(s, { k: 'roll', p: p.id, dice: [...dice], bonus, total, label: card.name, card: card.index })
  log(s, `🎲 ${p.name}, «${card.name}»: ${show()}${bonus ? ` +${bonus}` : ''} = ${total}.`)
  if (has(T.embryo)) heal(ctx, p, dice.filter(d => d === 6).length)
  if (total <= 4) for (const q of alive(s)) if (q !== p && q.treasures.includes(T.foolsGold)) heal(ctx, q, 2)
  return total
}
export const tier = (total: number) => (total >= 10 ? 2 : total >= 5 ? 1 : 0)

export function spellCards(p: PlayerState): SpellCard[] {
  return p.spell ?? []
}
