// Движок: reduce(state, action) — чистая функция. Ход партии идёт шагами; шаг, которому нужен ответ игрока,
// останавливается (pending) и при ответе перезапускается с начала с накопленными ответами (RNG — в состоянии).
import { DEAD, SPELLS, TREASURES } from '../data/cards.ts'
import {
  D, GameOver, NeedInput, START_LIFE, T, alive, ask, cardName, choosePlayer, d6, damage, deadOf, drawDead, drawSpell, enemies, fillHand,
  ev, gainTreasure, heal, isWild, leftEnemy, log, rand, rollEv, rightEnemy, shuffle, spellOf, treasureName, chooseHandCard, type Ctx,
} from './core.ts'
import { EFFECTS, addToSpell, cardInfo, replaceWild } from './effects.ts'
import { TRAP, type Action, type CardId, type GameState, type PlayerState, type SetupPlayer, type SpellCard } from './types.ts'

const RANK = { source: 0, quality: 1, delivery: 2 } as const

export function create(setup: SetupPlayer[], seed: number, medalsToWin = 2): GameState {
  const s: GameState = {
    rng: seed | 0, tid: seed | 0, phase: 'start', game: 0, round: 0, medalsToWin,
    players: setup.map((p, id) => ({
      id, name: p.name, portrait: p.portrait, ...(p.bot ? { bot: p.bot } : {}), ...(p.uid ? { uid: p.uid } : {}),
      life: START_LIFE, alive: true, hand: [], treasures: [], deadCards: [], medals: 0,
      spell: null, acted: false, extraDice: 0,
    })),
    deck: SPELLS.flatMap(c => Array.from({ length: c.copies }, (_, k) => c.index * 10 + k)),
    discard: [],
    treasureDeck: TREASURES.map(t => t.index),
    treasureDiscard: [],
    deadDeck: DEAD.flatMap(c => Array.from({ length: c.copies }, (_, k) => c.index * 10 + k)),
    deadDiscard: [],
    turn: null, pending: null, lastWinner: null, lastRoll: null, log: [], logBase: 0, ev: [], evBase: 0, turns: [], seq: 0,
  }
  shuffle(s, s.deck); shuffle(s, s.treasureDeck); shuffle(s, s.deadDeck)
  return advance(s, [])
}

// ---------- шаги ----------

// Начало игры турнира: жизни, руки, применение карт дохлых колдунов прошлой игры.
function startGame(ctx: Ctx) {
  const { s } = ctx
  s.game++
  s.round = 1
  ev(s, { k: 'game', n: s.game })
  log(s, `══ Игра ${s.game} ══`)
  for (const p of s.players) {
    Object.assign(p, { life: START_LIFE, alive: true, spell: null, acted: false, extraDice: 0, goLast: undefined, tieRoll: undefined, firstTurnDie: undefined })
    fillHand(s, p)
  }
  for (const p of s.players) {
    for (const c of p.deadCards) {
      const k = Math.floor(c / 10)
      if (k === D.saint) p.life += 3
      if (k === D.cosmic) p.life += 2
      if (k === D.small) for (let i = 0; i < 2; i++) { const x = drawSpell(s); if (x != null) p.hand.push(x) }
      if (k === D.artifact) gainTreasure(ctx, p)
      if (k === D.shangri) p.firstTurnDie = true
      if (k === D.payback) damage(ctx, choosePlayer(ctx, p, enemies(s, p), '«Ответочка из преисподней»: кому нанести 2 урона?'), 2)
      if (k !== D.nirvana) log(s, `${p.name}: «${deadOf(c).name}».`)
    }
    p.life = Math.min(p.life, 25)
    if (p.reservedWild) { p.hand.push(...p.reservedWild); p.reservedWild = undefined }
  }
  for (const p of s.players) { s.deadDiscard.push(...p.deadCards); p.deadCards = [] }
  s.phase = 'build'
}

// Ключ очерёдности: ранец «последним» → Нетерпеливый → меньше карт → больше инициатива → бросок кубика.
function orderKey(p: PlayerState): number[] {
  const sp = p.spell ?? []
  const impatient = sp.some(c => c.id >= 0 && Math.floor(c.id / 10) === 25)
  const del = sp.find(c => c.slot === 'delivery')
  let init = del && del.id >= 0 && !isWild(del.id) ? spellOf(del.id).initiative ?? 0 : 0
  if (p.treasures.includes(T.jetpack)) init += 10
  return [p.goLast ? 1 : 0, impatient ? 0 : 1, sp.length, -init]
}
const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }

function nextActor(ctx: Ctx): PlayerState | null {
  const { s } = ctx
  const cand = alive(s).filter(p => !p.acted && p.spell)
  if (!cand.length) return null
  cand.sort((a, b) => cmp(orderKey(a), orderKey(b)))
  const top = cand.filter(p => cmp(orderKey(p), orderKey(cand[0])) === 0)
  if (top.length === 1) return top[0]
  for (;;) {
    for (const p of top) if (p.tieRoll == null) { p.tieRoll = d6(s); rollEv(s, p, [p.tieRoll], p.tieRoll, 'очерёдность') }
    const max = Math.max(...top.map(p => p.tieRoll!))
    const best = top.filter(p => p.tieRoll === max)
    if (best.length === 1) return best[0]
    for (const p of best) p.tieRoll = undefined
  }
}

function endRound(ctx: Ctx) {
  const { s } = ctx
  s.round++
  for (const p of s.players) {
    Object.assign(p, { spell: null, acted: false, extraDice: 0, goLast: undefined, tieRoll: undefined })
    if (p.alive) fillHand(s, p)
    else drawDead(s, p)
  }
  s.phase = 'build'
  ev(s, { k: 'round', n: s.round })
  log(s, `— Раунд ${s.round} —`)
}

function startTurn(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  s.turn = { actor: p.id, stage: 'start', hadWild: false, deliveryAll: false }
  ev(s, { k: 'turn', p: p.id, n: p.spell!.length })
  log(s, `▶ Ходит ${p.name} (${p.spell!.length} карт.).`)
  if (p.treasures.includes(T.cannonLeft)) damage(ctx, leftEnemy(s, p), 1)
  if (p.treasures.includes(T.cannonRight)) damage(ctx, rightEnemy(s, p), 1)
  s.turn.stage = 'reveal'
}

function reveal(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  const turn = s.turn!
  const sp = p.spell!
  const count = sp.length
  ev(s, { k: 'reveal', p: p.id, cards: sp.map(c => c.id) })
  log(s, `${p.name} открывает: ${sp.map(c => cardName(c.id)).join(' + ')}.`)
  s.turns.push({ game: s.game, round: s.round, actor: p.id, cards: sp.map(c => c.id), at: s.logBase + s.log.length - 1 })
  if (s.turns.length > 12) s.turns.shift()
  for (const c of sp.filter(c => c.id === TRAP || isWild(c.id))) {
    turn.hadWild = true
    p.spell = p.spell!.filter(x => x !== c)
    if (c.id === TRAP) p.treasures.push(T.trap)
    else s.discard.push(c.id)
    replaceWild(ctx, p, c.slot, c.id)
  }
  if (count <= 2 && p.treasures.includes(T.garters) && p.hand.length) {
    const id = p.hand[rand(s, p.hand.length)]
    p.hand = p.hand.filter(x => x !== id)
    addToSpell(ctx, p, id, 'added')
  }
  if (turn.hadWild && p.treasures.includes(T.codpiece)) { heal(ctx, p, 2); gainTreasure(ctx, p) }
  // «50 оттенков свинофермы»: такая же карта на руке у владельца
  for (const q of enemies(s, p).filter(q => q.treasures.includes(T.pigs))) {
    for (;;) {
      const idx = new Set(p.spell!.filter(c => c.id >= 0).map(c => Math.floor(c.id / 10)))
      const same = q.hand.filter(id => idx.has(Math.floor(id / 10)))
      const id = chooseHandCard(ctx, q, `«50 оттенков свинофермы»: сбросить такую же карту, чтобы нанести ${p.name} 2 урона и накрутить 2 жизни?`, same, true)
      if (id == null) break
      q.hand = q.hand.filter(x => x !== id)
      s.discard.push(id)
      damage(ctx, p, 2); heal(ctx, q, 2)
      if (!p.alive) return
    }
  }
  turn.stage = 'cards'
}

// Применить следующую карту заклинания (несколько карт одного типа — в выбранном порядке).
function resolveNext(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!p.alive) { s.turn!.stage = 'end'; return }
  // карта уже объявлена — применяем её эффект (отдельный шаг: вопросы эффекта не откатывают объявление)
  const cur = p.spell!.find(c => c.on && !c.done)
  if (cur) {
    cur.done = true
    const info = cardInfo(cur.id)
    if (info.school === 'dark') for (const q of enemies(s, p)) if (q.treasures.includes(T.crown)) damage(ctx, p, 1)
    if (!p.alive) return
    EFFECTS[info.index]?.(Object.assign(ctx, { p, card: info, depth: 0 }))
    return
  }
  const left = p.spell!.filter(c => !c.done)
  if (!left.length) { s.turn!.stage = 'end'; return }
  const r = Math.min(...left.map(c => RANK[c.slot]))
  const cand = left.filter(c => RANK[c.slot] === r)
  const v = ask(ctx, {
    player: p.id, prompt: 'Какую карту применить первой?',
    options: cand.map(c => ({ v: c.id, label: spellOf(c.id).name, card: { deck: 'spells', index: Math.floor(c.id / 10) } })),
  })
  const c = cand.find(c => c.id === v)!
  c.on = true
  ev(s, { k: 'card', p: p.id, id: c.id })
  log(s, `✦ ${p.name}: ${cardName(c.id)}.`)
}

function endTurn(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  const rec = s.turns.at(-1)
  if (rec && rec.actor === p.id && p.spell?.length) rec.cards = p.spell.map(c => c.id) // с добавленными картами
  s.discard.push(...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id))
  if ((p.spell ?? []).some(c => c.id === TRAP)) (p.alive ? p.treasures : s.treasureDiscard).push(T.trap)
  p.spell = []
  ev(s, { k: 'end', p: p.id })
  p.acted = true
  p.firstTurnDie = undefined
  s.turn = null
}

function endGame(s: GameState) {
  const live = alive(s)
  const w = live.length === 1 ? live[0] : s.turn ? s.players[s.turn.actor] : null
  s.lastWinner = w ? w.id : -1
  if (w) { w.medals++; log(s, `🏅 ${w.name} — недобитый колдун! Медалей: ${w.medals}.`) }
  else log(s, 'Все погибли — медали никому.')
  // «Пастбище шальных сердиторогов»: отложить «Шальную магию» на следующую игру
  for (const p of s.players) {
    for (const c of p.deadCards) if (Math.floor(c / 10) === D.pasture) {
      for (const pile of [s.deck, s.discard, ...s.players.map(q => q.hand)]) {
        const i = pile.findIndex(isWild)
        if (i >= 0) { (p.reservedWild ??= []).push(pile.splice(i, 1)[0]); break }
      }
    }
  }
  for (const p of s.players) {
    s.discard.push(...p.hand, ...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id))
    if (p.spell?.some(c => c.id === TRAP)) p.treasures.push(T.trap)
    s.treasureDiscard.push(...p.treasures)
    Object.assign(p, { hand: [], treasures: [], spell: null, acted: false })
  }
  s.turn = null
  s.phase = w && w.medals >= s.medalsToWin ? 'tournament' : 'gameover'
  ev(s, { k: 'over', winner: w ? w.id : -1, champion: s.phase === 'tournament' })
  if (s.phase === 'tournament') log(s, `🏆 ${w!.name} выигрывает турнир!`)
}

// Один шаг. Возвращает false, если нужно ждать действий игроков.
function step(ctx: Ctx): boolean {
  const { s } = ctx
  if (s.phase === 'start') { startGame(ctx); return true }
  if (s.phase === 'build') {
    // у кого нечего выложить — пустое заклинание
    for (const p of alive(s)) if (!p.spell && !p.hand.length && !p.treasures.includes(T.trap)) p.spell = []
    if (alive(s).some(p => !p.spell)) return false
    s.phase = 'resolve'
    ev(s, { k: 'built', counts: s.players.map(p => (p.alive ? p.spell!.length : -1)) })
    log(s, 'Заклинания выложены: ' + alive(s).map(p => `${p.name} — ${p.spell!.length}`).join(', ') + '.')
    return true
  }
  if (s.phase !== 'resolve') return false
  if (!s.turn) {
    const p = nextActor(ctx)
    if (!p) endRound(ctx)
    else startTurn(ctx, p)
    return true
  }
  const p = s.players[s.turn.actor]
  if (!p.alive) { endTurn(ctx, p); return true }
  if (s.turn.stage === 'reveal') reveal(ctx, p)
  else if (s.turn.stage === 'cards') resolveNext(ctx, p)
  else if (s.turn.stage === 'end') endTurn(ctx, p)
  return true
}

function advance(s: GameState, answers: (number | string | null)[]): GameState {
  for (let guard = 0; guard < 2000; guard++) {
    const before = JSON.stringify(s)
    const ctx: Ctx = { s, answers, next: 0 }
    answers = []
    try {
      if (!step(ctx)) return s
    } catch (e) {
      if (e instanceof NeedInput) {
        const base = JSON.parse(before) as GameState
        base.pending = { ...e.q, answers: ctx.answers, base: before }
        return base
      }
      if (e instanceof GameOver) { endGame(s); continue }
      throw e
    }
  }
  throw new Error('движок зациклился')
}

// ---------- действия ----------
export function reduce(state: GameState, a: Action): GameState {
  const s = JSON.parse(JSON.stringify(state)) as GameState
  s.seq++
  if (a.type === 'choose') {
    const pd = s.pending
    if (!pd) throw new Error('Сейчас ничего не спрашивают')
    if (pd.player !== a.player) throw new Error('Отвечает другой игрок')
    if (a.value == null ? !pd.optional : !pd.options.some(o => o.v === a.value)) throw new Error('Нет такого варианта')
    const base = JSON.parse(pd.base) as GameState
    base.seq = s.seq
    if (base.players[a.player].skips) base.players[a.player].skips = 0
    return advance(base, [...pd.answers, a.value])
  }
  if (a.type === 'seat' || a.type === 'skip') return seatAction(s, a)
  if (s.pending) throw new Error('Сначала ответьте на вопрос')
  if (a.type === 'nextGame') {
    if (s.phase !== 'gameover') throw new Error('Игра ещё идёт')
    s.phase = 'start'
    return advance(s, [])
  }
  if (a.type === 'submit') {
    const p = s.players[a.player]
    if (s.phase !== 'build') throw new Error('Сейчас не время выкладывать заклинание')
    if (!p?.alive) throw new Error('Дохлые колдуны не колдуют')
    if (p.spell) throw new Error('Заклинание уже выложено')
    if (a.cards.length < 1 || a.cards.length > 3) throw new Error('В заклинании от 1 до 3 карт')
    if (new Set(a.cards.map(c => c.slot)).size !== a.cards.length) throw new Error('Не больше одной карты каждого типа')
    if (new Set(a.cards.map(c => c.id)).size !== a.cards.length) throw new Error('Карта указана дважды')
    for (const c of a.cards) {
      if (c.id === TRAP) { if (!p.treasures.includes(T.trap)) throw new Error('Нет «Протонной ловушки»'); continue }
      if (!p.hand.includes(c.id)) throw new Error('Такой карты нет на руке')
      const t = spellOf(c.id).type
      if (t !== 'wild' && t !== c.slot) throw new Error(`${cardName(c.id)} — не на своём месте`)
    }
    if (a.goLast && !p.treasures.includes(T.jetpack)) throw new Error('Нет «Ранца отрыва»')
    const spell: SpellCard[] = [...a.cards].sort((x, y) => RANK[x.slot] - RANK[y.slot]).map(c => ({ id: c.id, slot: c.slot }))
    p.hand = p.hand.filter(id => !a.cards.some(c => c.id === id))
    if (a.cards.some(c => c.id === TRAP)) p.treasures = p.treasures.filter(t => t !== T.trap)
    if (a.goLast) {
      p.treasures = p.treasures.filter(t => t !== T.jetpack)
      s.treasureDiscard.push(T.jetpack)
      p.goLast = true
      log(s, `${p.name} сбрасывает ${treasureName(T.jetpack)}, чтобы ходить последним.`)
    }
    p.spell = spell
    if (p.skips) p.skips = 0
    log(s, `${p.name} выкладывает заклинание.`)
    return advance(s, [])
  }
  throw new Error('Неизвестное действие')
}

// Сетевая игра: пропуск хода по таймеру и смена хозяина места. Меняет и игрока, и состояние «до шага» (pending.base),
// иначе ответ на вопрос перезапустит шаг со старыми данными.
const SKIPS_TO_BOT = 3
function seatAction(s: GameState, a: Extract<Action, { type: 'seat' | 'skip' }>): GameState {
  const p = s.players[a.player]
  if (!p) throw new Error('Нет такого места')
  const patch = (f: (q: PlayerState, g: GameState) => void) => {
    f(p, s)
    if (s.pending) {
      const base = JSON.parse(s.pending.base) as GameState
      f(base.players[a.player], base)
      s.pending.base = JSON.stringify(base)
    }
  }
  if (a.type === 'seat') {
    if (a.bot) {
      patch((q, g) => { q.bot = a.bot!; q.away = a.away ?? 'left'; q.skips = 0; log(g, q.away === 'left' ? `${q.name} уходит — за него играет бот.` : `${q.name} пропал — за него играет бот.`) })
    } else {
      if (!p.away) throw new Error('Место и так твоё')
      if (p.away === 'left') throw new Error('Ты покинул эту партию')
      patch((q, g) => { delete q.bot; delete q.away; q.skips = 0; log(g, `${q.name} вернулся в игру.`) })
    }
    return s
  }
  // skip: время вышло
  const pd = s.pending
  const asked = pd?.player === a.player
  if (!asked && !(s.phase === 'build' && p.alive && !p.spell)) throw new Error('Этот игрок сейчас не ходит')
  const n = (p.skips ?? 0) + 1
  patch((q, g) => {
    q.skips = n
    log(g, `⏳ ${q.name} не успел — ход пропущен.`)
    if (n >= SKIPS_TO_BOT) { q.bot = 2; q.away = 'afk'; q.skips = 0; log(g, `${q.name} пропустил ${SKIPS_TO_BOT} хода подряд — за него играет бот.`) }
  })
  if (asked) {
    // ответ за игрока: отказ, если можно, иначе случайный вариант
    const value = pd!.optional ? null : pd!.options[rand(s, pd!.options.length)].v
    const base = JSON.parse(pd!.base) as GameState
    base.seq = s.seq
    return advance(base, [...pd!.answers, value])
  }
  p.spell = [] // заклинание не выложено — в этом раунде колдун не ходит
  p.acted = true
  return advance(s, [])
}

export function tryReduce(s: GameState, a: Action): { state: GameState } | { error: string } {
  try { return { state: reduce(s, a) } } catch (e) { return { error: e instanceof Error ? e.message : String(e) } }
}

// Кто сейчас должен действовать: отвечающий на вопрос или те, кто ещё не выложил заклинание.
export function waitingFor(s: GameState): number[] {
  if (s.pending) return [s.pending.player]
  if (s.phase === 'build') return alive(s).filter(p => !p.spell).map(p => p.id)
  return []
}
export type { CardId }
