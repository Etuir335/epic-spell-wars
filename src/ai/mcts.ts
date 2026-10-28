// Бот: Монте-Карло с детерминизацией. Для каждого кандидата-хода многократно разыгрываем раунд до конца
// быстрой случайной стратегией (руки соперников и колоды перетасованы — бот не видит чужих карт) и берём ход
// с лучшей средней оценкой. Уровень = время на раздумье.
import { SPELLS } from '../data/cards.ts'
import { reduce, waitingFor } from '../game/engine.ts'
import { legalActions } from '../game/legal.ts'
import { TRAP, type Action, type CardId, type GameState } from '../game/types.ts'

const BUDGET_MS = [0, 250, 700, 1500]
const TOP_SPELLS = [0, 6, 10, 14]

const clone = (s: GameState) => JSON.parse(JSON.stringify(s)) as GameState
const shuffle = <X>(a: X[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const sp = (id: CardId) => SPELLS[Math.floor(id / 10)]

// Лёгкая копия для розыгрышей: без журнала и событий, своя случайность.
function lighten(s: GameState): GameState {
  s.log = []; s.ev = []; s.turns = []; s.logBase = 0; s.evBase = 0
  s.rng = (Math.random() * 2 ** 31) | 0
  if (s.pending) {
    const base = JSON.parse(s.pending.base) as GameState
    base.log = []; base.ev = []; base.turns = []
    base.rng = s.rng
    s.pending.base = JSON.stringify(base)
  }
  return s
}

// Детерминизация на этапе сбора заклинаний: чужие руки, чужие (закрытые) заклинания и колоды перемешаны.
function determinize(src: GameState, me: number): GameState {
  const s = lighten(clone(src))
  if (s.phase !== 'build' || s.pending) return s
  const pool: CardId[] = [...s.deck]
  const need: { p: number; n: number }[] = []
  for (const p of s.players) {
    if (p.id === me || !p.alive) continue
    let n = p.hand.length
    if (p.spell) {
      for (const c of p.spell) { if (c.id === TRAP) p.treasures.push(2); else { pool.push(c.id); n++ } }
      p.spell = null
    }
    pool.push(...p.hand)
    need.push({ p: p.id, n })
  }
  shuffle(pool)
  for (const { p, n } of need) s.players[p].hand = pool.splice(0, n)
  s.deck = pool
  shuffle(s.treasureDeck); shuffle(s.deadDeck)
  return s
}

// Эвристика заклинания: больше карт, одна школа (больше кубиков), есть приход.
export function spellScore(cards: { id: CardId }[]): number {
  const cs = cards.map(c => (c.id < 0 ? null : sp(c.id)))
  const schools = cs.flatMap(c => [c?.school, c?.school2]).filter(Boolean)
  const same = Math.max(0, ...schools.map(x => schools.filter(y => y === x).length))
  return cards.length * 3 + same * 2 + (cs.some(c => c?.type === 'delivery') ? 2 : 0)
}

// Быстрая стратегия для розыгрышей.
export function fastMove(s: GameState, p: number): Action | null {
  if (s.pending) {
    if (s.pending.player !== p) return null
    const o = s.pending.options
    if (s.pending.optional && Math.random() < 0.4) return { type: 'choose', player: p, value: null }
    if (o.every(x => x.player != null) && Math.random() < 0.7) {
      const foes = o.filter(x => x.player !== p)
      const pool = foes.length ? foes : o
      const best = pool.reduce((a, b) => (s.players[a.player!].life <= s.players[b.player!].life ? a : b))
      return { type: 'choose', player: p, value: best.v }
    }
    return { type: 'choose', player: p, value: o[Math.floor(Math.random() * o.length)].v }
  }
  if (s.phase !== 'build') return null
  const pl = s.players[p]
  if (!pl.alive || pl.spell) return null
  const by = (t: string) => pl.hand.filter(id => sp(id).type === t)
  const wild = by('wild')
  const cards: { id: CardId; slot: 'source' | 'quality' | 'delivery' }[] = []
  for (const t of ['source', 'quality', 'delivery'] as const) {
    if (Math.random() > 0.85) continue
    const g = by(t)
    const id = g.length ? g[Math.floor(Math.random() * g.length)] : wild.shift()
    if (id != null) cards.push({ id, slot: t })
  }
  if (!cards.length) {
    const id = pl.hand[0]
    if (id == null) return null
    const t = sp(id).type
    cards.push({ id, slot: t === 'wild' ? 'delivery' : t })
  }
  return { type: 'submit', player: p, cards }
}

// Разыграть до конца раунда (или игры).
function rollout(s: GameState): GameState {
  const game = s.game, round = s.round
  for (let i = 0; i < 400; i++) {
    if (s.phase !== 'build' && s.phase !== 'resolve') break
    if (s.game !== game || s.round !== round) break
    const who = waitingFor(s)
    if (!who.length) break
    const a = fastMove(s, who[0])
    if (!a) break
    try { s = reduce(s, a) } catch { break }
  }
  return s
}

// Оценка позиции для игрока me: 0..1.
function evaluate(s: GameState, me: number, game: number): number {
  if (s.game !== game || s.phase === 'gameover' || s.phase === 'tournament' || s.phase === 'start') {
    return s.lastWinner === me ? 1 : s.lastWinner === -1 ? 0.3 : 0
  }
  const p = s.players[me]
  if (!p.alive) return 0.05
  const foes = s.players.filter(q => q.id !== me)
  const live = foes.filter(q => q.alive)
  const avg = live.length ? live.reduce((a, q) => a + q.life, 0) / live.length : 0
  const v = 0.5 + 0.022 * (p.life - avg) + 0.12 * (1 - live.length / Math.max(1, foes.length)) + 0.02 * p.treasures.length + 0.03 * (p.creatures?.length ?? 0)
  return Math.max(0.06, Math.min(0.95, v))
}

// Кандидаты: при выборе — все варианты; при сборе — лучшие по эвристике (+ пара случайных).
function candidates(s: GameState, me: number, level: number): Action[] {
  const all = legalActions(s, me)
  if (s.pending || all.length <= TOP_SPELLS[level]) return all
  const scored = all.map(a => ({ a, v: a.type === 'submit' ? spellScore(a.cards) - (a.goLast ? 1.5 : 0) : 0 })).sort((x, y) => y.v - x.v)
  const top = scored.slice(0, TOP_SPELLS[level]).map(x => x.a)
  const rest = scored.slice(TOP_SPELLS[level]).map(x => x.a)
  return [...top, ...shuffle(rest).slice(0, 2)]
}

export function think(src: GameState, me: number, level = 2, budgetMs?: number): Action | null {
  const cand = candidates(src, me, level)
  if (cand.length <= 1) return cand[0] ?? null
  const sum = new Array(cand.length).fill(0), cnt = new Array(cand.length).fill(0)
  const until = Date.now() + (budgetMs ?? BUDGET_MS[Math.max(1, Math.min(3, level))])
  const game = src.game
  let i = 0
  do {
    const k = i++ % cand.length
    let s = determinize(src, me)
    try { s = reduce(s, cand[k]) } catch { sum[k] -= 1; cnt[k]++; continue }
    s = rollout(s)
    sum[k] += evaluate(s, me, game); cnt[k]++
  } while (Date.now() < until || i < cand.length)
  let best = 0
  for (let k = 1; k < cand.length; k++) if (sum[k] / cnt[k] > sum[best] / cnt[best]) best = k
  return cand[best]
}
