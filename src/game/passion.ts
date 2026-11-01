// «Переполох в хоромах страсти»: ЗПМП (жутко передающиеся магические приколы) из мешонки, замок,
// эффекты заклинаний 229–273, нежданчики страсти, сокровища 101–125 и карты дохлых колдунов 33–40.
// Тексты — transcript/passion-*.md.
import './school.ts' // хуки замка и школы ставятся раньше: страсть их дополняет
import { SPELLS, TREASURES } from '../data/cards.ts'
import {
  ab, alive, ask, cardName, choosePlayer, chooseHandCard, chooseTreasure, d6, damage, drawSpell, enemies, ev, gainTreasure, heal,
  hitAll, hooks, kill, leftEnemy, log, loseTreasure, mightyRoll, moveTreasure, rand, rightEnemy, rollEv, spellOf, strongest, tier,
  uniqueSigns, weakest, yesNo, type Ctx, type TreasureAct,
} from './core.ts'
import { EFFECTS, addToSpell, type E } from './effects.ts'
import { holds } from './castle.ts'
import type { CardId, GameState, PlayerState } from './types.ts'

const OFF = 229
const at = (n: number) => OFF + n
export const PT = {
  yog: 101, sado: 102, boots: 103, peak: 104, legs: 105, eye: 106, dildo: 107, egg: 108, hat: 109, clav: 110,
  cock: 111, seal: 112, burner: 113, liver: 114, club: 115, colon: 116, sword: 117, trah: 118, lake: 119, cave: 120,
  bed: 121, pimple: 122, syringe: 123, rocket: 124, bust: 125,
} as const
export const PD = { relief: 33, glued: 34, cult: 35, razor: 36, swan: 37, necro: 38, bake: 39, ass: 40 } as const
export const passionOn = (s: GameState) => !!s.sets?.includes('passion')

// ---------- ЗПМП ----------
export const ZP = [
  ['Ведьмины бородавки', 'эффекты всех твоих карт воздействуют только на одного врага'],
  ['Гнилой пень', 'ты не можешь получать и иметь сокровища'],
  ['Жуткая дырень', 'в конце своего хода потеряй 1 жизнь за каждое своё ЗПМП'],
  ['Трындецит', 'немедленно потеряй 3 жизни и сбрось это ЗПМП'],
  ['Горгонорея', 'ты не можешь накручивать жизни'],
  ['Лобковые кракены', 'убирай все «Шальные магии» из своих заклинаний'],
  ['Генитальные гарпии', 'в конце своего хода потеряй 1 жизнь. Вечное'],
  ['Гепатит Ы', 'твоё заклинание — на 1 карту меньше'],
  ['Гномошонка', 'твой предел руки снижен на 2'],
  ['Оккультифилис', 'в конце своего хода потеряй 2 жизни'],
] as const
export const zpName = (z: number) => `«${ZP[z >> 1][0]}»`
const HARPY = 6
const kind = (p: PlayerState, k: number) => (p.zp ?? []).filter(z => z >> 1 === k).length
export const zc = (p: PlayerState) => (p.zp?.length ?? 0) + (p.treasures.includes(PT.seal) ? 1 : 0)
const has = (p: PlayerState, t: number) => p.treasures.includes(t)
// мешонка заводится лениво: всё, что ни у кого не на руках и не отжато «Бритвой»
const bag = (s: GameState) => (s.zpBag ??= Array.from({ length: 20 }, (_, i) => i).filter(z => !s.players.some(p => p.zp?.includes(z) || p.zpKeep?.includes(z))))
// вернуть в мешонку (если её ещё не завели, жетон и так в неё попадёт)
const toBag = (s: GameState, zs: number[]) => { const b = bag(s); for (const z of zs) if (!b.includes(z)) b.push(z) }
const myTurn = (s: GameState, p: PlayerState) => s.turn?.actor === p.id


// Потеря жизней от ЗПМП: не урон (твари не заслоняют), убийце медаль/добыча не положены
function lose(ctx: Ctx, p: PlayerState, n: number, why: string) {
  if (!p.alive || n <= 0) return
  if (has(p, PT.clav)) n = Math.min(n, p.life - 1)
  if (n <= 0) { log(ctx.s, `🎸 «Золотая клавитара» держит ${p.name} на 1 жизни.`); return }
  const before = p.life
  p.life -= n
  ev(ctx.s, { k: 'dmg', p: p.id, n, from: null, before, after: Math.max(p.life, 0) })
  log(ctx.s, `💋 ${p.name}: ${why} — минус ${n} ж. (${before}→${Math.max(p.life, 0)}).`)
  if (p.life > 0) return
  const t = ctx.s.turn, was = t?.actor
  if (t) t.actor = p.id
  try { kill(ctx, p) } finally { if (t && t.actor === p.id && was != null) t.actor = was }
}

// Получить жетон (из мешонки или от врага): немедленные эффекты
function take(ctx: Ctx, p: PlayerState, z: number, by: PlayerState | null) {
  const { s } = ctx
  ;(p.zp ??= []).push(z)
  log(s, `💋 ${p.name} подхватывает ${zpName(z)}: ${ZP[z >> 1][1]}.`)
  if (has(p, PT.eye)) heal(ctx, p, 1)
  const k = z >> 1
  if (k === 1 && p.treasures.length) {
    log(s, `🍄 «Гнилой пень»: ${p.name} теряет все сокровища.`)
    for (const t of [...p.treasures]) loseTreasure(s, p, t)
  }
  if (by && by !== p && by.alive && myTurn(s, by) && has(by, PT.sword) && !s.turn!.usedT?.includes(PT.sword)) {
    ;(s.turn!.usedT ??= []).push(PT.sword)
    fromHand(ctx, by, '«Меч капитана Хрюка»: какую карту с руки добавить к заклинанию?')
  }
  if (k === 3) { p.zp = p.zp!.filter(x => x !== z); toBag(s, [z]); lose(ctx, p, 3, '«Трындецит»') }
}
// Заразить из мешонки; by — кто заражает (владельца замка враги заразить не могут)
export function infect(ctx: Ctx, p: PlayerState | null, by: PlayerState | null, n = 1) {
  const { s } = ctx
  if (!p || !p.alive) return
  for (let i = 0; i < n; i++) {
    if (by && by !== p && holds(s, p)) { log(s, `🏰 ${p.name} за стенами замка — ЗПМП не пристаёт.`); return }
    const b = bag(s)
    if (!b.length) { log(s, '💋 Мешонка ЗПМП пуста.'); return }
    const z = b.splice(rand(s, b.length), 1)[0]
    take(ctx, p, z, by)
    if (!p.alive) return
  }
}
// Передать своё ЗПМП (выбор жетона — за отдающим)
function pass(ctx: Ctx, from: PlayerState, to: PlayerState | null, steal = false) {
  const { s } = ctx
  if (!to || !to.alive || !from.zp?.length) return
  const src = steal ? to : from, dst = steal ? from : to
  if (!src.zp?.length) return
  if (!steal && holds(s, to)) { log(s, `🏰 ${to.name} за стенами замка — ЗПМП не передать.`); return }
  const z = pickZp(ctx, from, src, steal ? `Какое ЗПМП забрать у ${to.name}?` : `Какое ЗПМП передать ${to.name}?`)
  src.zp = src.zp.filter(x => x !== z)
  log(s, `💋 ${src.name} → ${dst.name}: ${zpName(z)}.`)
  take(ctx, dst, z, steal ? null : from)
}
function pickZp(ctx: Ctx, who: PlayerState, owner: PlayerState, prompt: string): number {
  const list = owner.zp ?? []
  if (list.length === 1) return list[0]
  return ask(ctx, { player: who.id, prompt, options: list.map(z => ({ v: z, label: ZP[z >> 1][0] })) }) as number
}
// Вылечить n своих ЗПМП (Infinity — все); возвращает число вылеченных
export function cure(ctx: Ctx, p: PlayerState, n: number, who = p): number {
  const { s } = ctx
  let done = 0
  while (done < n && p.zp?.length) {
    const z = n >= p.zp.length ? p.zp[0] : pickZp(ctx, who, p, 'Какое ЗПМП вылечить?')
    p.zp = p.zp.filter(x => x !== z)
    toBag(s, [z])
    log(s, `💊 ${p.name} вылечивает ${zpName(z)}.`)
    done++
  }
  if (done && myTurn(s, p) && has(p, PT.liver) && p.spell) fromHand(ctx, p, '«Храбрая печень»: какую карту с руки добавить к заклинанию?')
  return done
}
// Эффекты ЗПМП «в конце своего хода»
export function zpEnd(ctx: Ctx, p: PlayerState) {
  if (!p.alive) return
  if (kind(p, 2)) lose(ctx, p, zc(p) * kind(p, 2), '«Жуткая дырень»')
  if (kind(p, 6)) lose(ctx, p, kind(p, 6), '«Генитальные гарпии»')
  if (kind(p, 9)) lose(ctx, p, 2 * kind(p, 9), '«Оккультифилис»')
}

// ---------- замок ----------
function seize(ctx: Ctx, p: PlayerState): PlayerState | null {
  const { s } = ctx
  const prev = s.castle != null ? s.players[s.castle] : null
  if (prev === p) { log(s, `🏰 Замок и так у ${p.name}.`); return null }
  s.castle = p.id
  log(s, `🏰 ${p.name} захватывает замок${prev ? ` у ${prev.name}` : ''}!`)
  if (has(p, PT.burner) && p.alive) damage(ctx, choosePlayer(ctx, p, enemies(s, p), '«Отжигалка»: кому 2 урона?'), 2)
  return prev
}
const holder = (s: GameState) => (s.castle != null ? s.players[s.castle] : null)

// ---------- помощники ----------
const uniq = (list: (PlayerState | null)[]) => [...new Set(list.filter((q): q is PlayerState => !!q))]
const foes = (e: E) => enemies(e.s, e.p)
const chooseFoe = (e: Ctx & { p: PlayerState }, list = enemies(e.s, e.p), prompt = 'Выбери врага') => choosePlayer(e, e.p, list, prompt)
const victims = (e: E, pick: () => (PlayerState | null)[]) => (e.card.type === 'delivery' && e.s.turn?.deliveryAll ? foes(e) : uniq(pick()))
const castleAll = (e: E, pick: () => (PlayerState | null)[]) => victims(e, () => { if (!holds(e.s, e.p)) return pick(); log(e.s, `🏰 Замок у ${e.p.name}: жертвы — все враги.`); return foes(e) })
const weaker = (e: E) => foes(e).filter(q => q.life < e.p.life)
const tougher = (e: E) => foes(e).filter(q => q.life > e.p.life)
function fromHand(ctx: Ctx, p: PlayerState, prompt: string, ok: (id: CardId) => boolean = () => true): CardId | null {
  if (!p.spell) return null
  const list = p.hand.filter(ok)
  const id = list.length ? chooseHandCard(ctx, p, prompt, list) : null
  if (id == null) return null
  p.hand = p.hand.filter(x => x !== id)
  addToSpell(ctx, p, id, 'added')
  return id
}
// Открыть n карт: подходящие — в заклинание, остальные в сброс
function revealSome(e: Ctx, p: PlayerState, n: number, ok: (id: CardId) => boolean) {
  const shown: CardId[] = []
  for (let i = 0; i < n; i++) {
    const id = drawSpell(e.s)
    if (id == null) break
    if (ok(id)) addToSpell(e, p, id, 'added')
    else shown.push(id)
  }
  e.s.discard.push(...shown)
}
function revealUntil(e: Ctx, p: PlayerState, ok: (id: CardId) => boolean) {
  const shown: CardId[] = []
  for (let i = 0; i < 300; i++) {
    const id = drawSpell(e.s)
    if (id == null) break
    if (ok(id)) { addToSpell(e, p, id, 'added'); break }
    shown.push(id)
  }
  e.s.discard.push(...shown)
}
// Могучий бросок с «СТОЯТЬ!» для тварей
function M(e: E): number {
  const t = tier(mightyRoll(e, e.p, e.card))
  const d = SPELLS[e.card.index]
  if (d.creature && e.cur && d.mighty?.[t].text.includes('СТОЯТЬ')) { e.cur.stay = true; log(e.s, `🐾 ${d.name}: СТОЯТЬ!`) }
  return t
}
const infectAll = (e: E, list: PlayerState[]) => { for (const q of list) infect(e, q, e.p) }

// ---------- эффекты заклинаний ----------
export const PASSION_EFFECTS: Record<number, (e: E) => void> = {
  // 0 От Железной Бабищи
  [at(0)]: e => { infect(e, chooseFoe(e, foes(e), 'Кому передать ЗПМП?'), e.p); infect(e, e.p, e.p) },
  // 1 Нажопистый
  [at(1)]: e => hitAll(e, foes(e).filter(q => q.acted), uniqueSigns(e.p)),
  // 2 Мерзопакостный
  [at(2)]: e => hitAll(e, alive(e.s).filter(q => zc(q) >= 2), 4),
  // 3 Целибатный
  [at(3)]: e => hitAll(e, alive(e.s).filter(q => !zc(q)), uniqueSigns(e.p)),
  // 4 Трупоядный
  [at(4)]: e => {
    const q = chooseFoe(e), dead = e.s.players.filter(x => !x.alive).length
    if (dead) infect(e, q, e.p, dead)
    else damage(e, q, 3)
  },
  // 5 Волнительный
  [at(5)]: e => { fromHand(e, e.p, 'Какую карту с руки добавить к заклинанию?'); if (!zc(e.p)) fromHand(e, e.p, 'И ещё одну карту:') },
  // 6 Шаловливый
  [at(6)]: e => revealSome(e, e.p, zc(e.p), id => spellOf(id).type === 'quality'),
  // 7 Трахторный
  [at(7)]: e => (zc(e.p) ? damage(e, chooseFoe(e), 2) : hitAll(e, foes(e), 2)),
  // 8 Бомбический
  [at(8)]: e => { const h = holder(e.s); if (h) damage(e, h, 3); else hitAll(e, foes(e), 1) },
  // 9 Струнный
  [at(9)]: e => { const q = weakest(e, e.p); if (q && zc(q)) damage(e, q, zc(q)); else infect(e, q, e.p) },
  // 10 Поддатенький
  [at(10)]: e => { heal(e, e.p, 3); if (!zc(e.p)) seize(e, e.p) },
  // 11 Рукокрючный
  [at(11)]: e => {
    const h = holder(e.s)
    if (!h) return
    e.s.castle = null
    log(e.s, `🏰 ${h.name} ставит замок в центр стола.`)
    infect(e, h, e.p)
  },
  // 12 Рукастый
  [at(12)]: e => {
    const id = fromHand(e, e.p, 'Какую тварь с руки добавить к заклинанию?', id => !!spellOf(id).creature)
    const c = id != null && !zc(e.p) ? e.p.spell?.find(c => c.id === id) : null
    if (c) { c.stay = true; log(e.s, `🐾 ${cardName(id!)}: СТОЯТЬ!`) }
  },
  // 13 Слямзенный
  [at(13)]: e => {
    const prev = seize(e, e.p)
    if (!prev || prev.acted || !prev.spell?.length) return
    const list = prev.spell.filter(c => c.id >= 0 && !c.on && !c.done)
    if (!list.length) return
    const c = list[rand(e.s, list.length)]
    prev.spell = prev.spell.filter(x => x !== c)
    e.s.discard.push(c.id)
    log(e.s, `🏰 ${e.p.name} убирает карту из заклинания ${prev.name}.`)
  },
  // 14 Приматерный
  [at(14)]: e => {
    const two = uniq([leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)])
    hitAll(e, two, zc(e.p))
    if (holds(e.s, e.p)) pass(e, e.p, chooseFoe(e, two.filter(q => q.alive), 'Кому передать ЗПМП?'))
  },
  // 15 Аналгилятор
  [at(15)]: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e); hitAll(e, v, [2, 3, 2 * zc(e.p)][t]); if (t === 1) gainTreasure(e, e.p) },
  // 16 Пылкий оргазм
  [at(16)]: e => { const v = castleAll(e, () => [rightEnemy(e.s, e.p)]), t = M(e); hitAll(e, v, [2, 3, 2][t]); if (t === 2) infectAll(e, v) },
  // 17 Потрошок за пятачок
  [at(17)]: e => {
    const v = castleAll(e, () => [chooseFoe(e, weaker(e))]), t = M(e)
    if (t === 0) { hitAll(e, v, 2); infect(e, e.p, e.p) }
    if (t === 1) infectAll(e, v)
    if (t === 2) hitAll(e, v, 2 * zc(e.p))
  },
  // 18 Злак-маньяк (тварь)
  [at(18)]: e => {
    const v = victims(e, () => foes(e)), t = M(e)
    if (t === 0) damage(e, e.p, 2)
    if (t === 1) hitAll(e, v, 2)
    if (t === 2) infectAll(e, v)
  },
  // 19 Членоморф
  [at(19)]: e => {
    const v = victims(e, () => [rightEnemy(e.s, e.p)]), t = M(e)
    if (t === 1) hitAll(e, v, 2)
    else for (const q of v) infect(e, q, e.p, t ? 2 : 1)
  },
  // 20 Елдовзрыв
  [at(20)]: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e); hitAll(e, v, [1, 1, 2 * zc(e.p)][t]); if (t === 1) infectAll(e, v) },
  // 21 Эрогриль
  [at(21)]: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e); if (t === 0) gainTreasure(e, e.p); else hitAll(e, v, t === 1 ? 2 : 2 * zc(e.p)) },
  // 22 Раскулятор
  [at(22)]: e => { const v = castleAll(e, () => foes(e).filter(q => q.life >= 10)), t = M(e); hitAll(e, v, [1, 2, 2][t]); if (t === 2) infectAll(e, v) },
  // 23 Чревонегодник (тварь)
  [at(23)]: e => { const v = victims(e, () => foes(e).filter(q => q.life <= 10)), t = M(e); if (t) hitAll(e, v, 2); if (t === 2) infectAll(e, v) },
  // 24 Гигацып (тварь)
  [at(24)]: e => {
    const v = victims(e, () => [rightEnemy(e.s, e.p)]), t = M(e)
    if (t === 1) for (const q of v) infect(e, q, e.p, 2)
    else hitAll(e, v, t ? 3 : 2)
  },
  // 25 Котоклизм: жертва — ты сам
  [at(25)]: e => { const t = M(e); if (t === 1) heal(e, e.p, 3); else cure(e, e.p, t ? Infinity : 1) },
  // 26 Токсичный дождик (тварь)
  [at(26)]: e => { const v = victims(e, () => foes(e).filter(q => !q.acted)), t = M(e); if (t === 1) infectAll(e, v); else hitAll(e, v, t ? 3 : 1) },
  // 27 Золотой душ
  [at(27)]: e => { const v = castleAll(e, () => [chooseFoe(e, tougher(e))]), t = M(e); if (t) hitAll(e, v, 3); if (t !== 1) infectAll(e, v) },
  // 28 Гетерогенератор (тварь)
  [at(28)]: e => { const v = victims(e, () => [strongest(e, e.p)]), t = M(e); hitAll(e, v, [2, 3, 3][t]); if (t === 1) infectAll(e, v) },
  // 29 Досуг с асфиксией
  [at(29)]: e => {
    const v = castleAll(e, () => [chooseFoe(e, foes(e).filter(q => q.treasures.length))]), t = M(e)
    if (t === 0) seize(e, e.p)
    else hitAll(e, v, 2)
    if (t === 2) infectAll(e, v)
  },
  // 30 От Членовредителя
  [at(30)]: e => { if (!cure(e, e.p, 2)) heal(e, e.p, 3) },
  // 31 От Лобкороля и его киски
  [at(31)]: e => { const h = holder(e.s); if (h) damage(e, h, uniqueSigns(e.p)); else heal(e, e.p, 2) },
  // 32 Алчущий
  [at(32)]: e => { gainTreasure(e, e.p); if (holds(e.s, e.p)) gainTreasure(e, e.p) },
  // 33 От Шнобгоблина
  [at(33)]: e => {
    damage(e, chooseFoe(e, tougher(e), 'Кому из тех, кто живучее тебя?'), uniqueSigns(e.p))
    if (holds(e.s, e.p)) damage(e, chooseFoe(e, weaker(e), 'Кому из тех, кто хилее тебя, 2 урона?'), 2)
  },
  // 34 От Гондуяна Ребристого
  [at(34)]: e => { pass(e, e.p, chooseFoe(e, uniq([leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)]), 'Кому передать ЗПМП?')); if (!zc(e.p)) gainTreasure(e, e.p) },
  // 35 От Бельчонка с мешонкой
  [at(35)]: e => { seize(e, e.p); heal(e, e.p, 2 * zc(e.p)) },
  // 36 От Сенатора Сыченгтона
  [at(36)]: e => revealSome(e, e.p, uniqueSigns(e.p), id => spellOf(id).type === 'source'),
  // 37 От Мага-консерватора
  [at(37)]: e => {
    infect(e, choosePlayer(e, e.p, alive(e.s), 'Кого заразить ЗПМП (можно себя)?'), e.p)
    if (!holds(e.s, e.p)) return
    const q = chooseFoe(e, foes(e).filter(q => q.treasures.length), 'У кого отжать сокровище?')
    const t = q && chooseTreasure(e, e.p, q, 'Какое сокровище отжать?')
    if (q && t != null) moveTreasure(e.s, q, e.p, t)
  },
  // 38 От Инколдуньи
  [at(38)]: e => {
    if (!alive(e.s).some(q => q.treasures.length)) { gainTreasure(e, e.p); return }
    for (const q of foes(e)) infect(e, q, e.p, q.treasures.length)
  },
  // 39 От Отсос-они
  [at(39)]: e => {
    const q = chooseFoe(e, foes(e).filter(q => q.zp?.length), 'У кого забрать ЗПМП?')
    if (!q) return
    pass(e, e.p, q, true)
    if (e.p.alive) damage(e, q, 2 * zc(e.p))
  },
  // 40 От Нефертитьки
  [at(40)]: e => { if (cure(e, e.p, 1)) gainTreasure(e, e.p) },
  // 41 От Набухшего Херомантa
  [at(41)]: e => { const prev = seize(e, e.p); if (prev) pass(e, e.p, prev) },
  // 42 От Шлюхопряда
  [at(42)]: e => {
    if (e.s.turn) e.s.turn.plus1 = true
    const r = new Map(alive(e.s).map(q => { const x = d6(e.s) + (q === e.p ? 1 : 0); rollEv(e.s, q, [x], x, 'Шлюхопряд'); return [q, x] }))
    const min = Math.min(...r.values())
    for (const [q, x] of r) if (x === min) infect(e, q, e.p)
  },
  // 43 От Фистингового Прыща
  [at(43)]: e => { hitAll(e, alive(e.s), 2); if (holds(e.s, e.p) && e.p.alive && e.p.life > 0) heal(e, e.p, 4) },
  // 44 От Воспалённого Нарывочника
  [at(44)]: e => { cure(e, e.p, 1); if (!zc(e.p)) hitAll(e, foes(e), 2) },
}
Object.assign(EFFECTS, PASSION_EFFECTS)

// ---------- нежданчики: вылечить все ЗПМП и накрутить столько же ----------
const prevSurprise = hooks.surprise
hooks.surprise = (ctx, p) => {
  for (const c of p.spell ?? []) {
    if (c.done || c.on || c.id < 0 || spellOf(c.id).set !== 'passion' || !spellOf(c.id).surprise) continue
    c.done = true
    const n = p.zp?.length ?? 0
    log(ctx.s, `💥 Нежданчик ${p.name}: ${cardName(c.id)} — лечит ЗПМП (${n}).`)
    if (!n) continue
    cure(ctx, p, Infinity)
    const before = p.life
    p.life = Math.min(25, p.life + n)
    ev(ctx.s, { k: 'heal', p: p.id, n: p.life - before, before, after: p.life })
  }
  if (p.life <= 0 && p.spell?.some(c => !c.done && !c.on && c.id >= 0 && spellOf(c.id).surprise)) prevSurprise?.(ctx, p)
}

// ---------- дохлые колдуны ----------
const prevDead = hooks.deadNow
hooks.deadNow = (ctx, p, c) => {
  const { s } = ctx
  const k = Math.floor(c / 10)
  if (k === PD.cult) { const q = choosePlayer(ctx, p, alive(s), '«Культовый срез»: кому урон по числу его ЗПМП?'); if (q) damage(ctx, q, zc(q)); return true }
  if (k === PD.swan) { hitAll(ctx, alive(s).filter(q => !zc(q)), 2); return true }
  if (k === PD.ass) { infect(ctx, choosePlayer(ctx, p, alive(s), '«Запредельная жопа»: кого заразить?'), p); return true }
  if (k === PD.necro) { seize(ctx, p); p.necro = true; return true }
  if (k === PD.razor) {
    const q = choosePlayer(ctx, p, alive(s).filter(q => q.zp?.length), '«Смертельная бритва»: у кого отжать ЗПМП?')
    if (q) {
      const z = pickZp(ctx, p, q, 'Какое ЗПМП отжать?')
      q.zp = q.zp!.filter(x => x !== z)
      ;(p.zpKeep ??= []).push(z)
      q.razor = (q.razor ?? 0) + 4
      log(s, `🪒 ${p.name} отжимает ${zpName(z)} у ${q.name}: в следующей игре у ${q.name} на 4 жизни меньше.`)
    }
    return true
  }
  return prevDead?.(ctx, p, c) ?? false
}
const prevDied = hooks.died
hooks.died = (ctx, p, killer) => {
  prevDied?.(ctx, p, killer)
  if (!passionOn(ctx.s)) return
  const drop = (p.zp ?? []).filter(z => z >> 1 !== HARPY)
  if (drop.length) { p.zp = p.zp!.filter(z => !drop.includes(z)); toBag(ctx.s, drop) }
}

// ---------- начало игры ----------
export function passionStartGame(ctx: Ctx) {
  const { s } = ctx
  if (!passionOn(s)) return
  // замок возвращается в центр, если его не держит мертвец с «Некроконтролем»
  const h = holder(s)
  if (!h?.necro) s.castle = null
  for (const p of s.players) {
    p.zp = (p.zp ?? []).filter(z => z >> 1 === HARPY)
    if (h === p && p.necro) { log(s, `🏰 ${p.name} начинает игру с замком («Некроконтроль»).`); heal(ctx, p, 3) }
    p.necro = undefined
  }
  s.zpBag = undefined
  for (const p of s.players) {
    for (const z of p.zpKeep ?? []) if (!s.players.some(q => q.zp?.includes(z))) take(ctx, p, z, null)
    p.zpKeep = undefined
    if (p.razor) { log(s, `🪒 ${p.name}: на ${p.razor} жизни меньше («Смертельная бритва»).`); p.life = Math.max(1, p.life - p.razor); p.razor = undefined }
  }
  for (const p of s.players) {
    p.pd = p.deadCards.map(c => Math.floor(c / 10)).filter(k => k === PD.relief || k === PD.bake)
    for (const c of p.deadCards) if (Math.floor(c / 10) === PD.glued) infect(ctx, choosePlayer(ctx, p, alive(s), '«Склеил палки»: кого заразить ЗПМП?'), p)
  }
}

// ---------- начало хода ----------
export function passionTurnStart(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  if (!passionOn(s)) return
  if (has(p, PT.dildo) && zc(p)) heal(ctx, p, 1)
  const pd = p.pd ?? []
  if (pd.includes(PD.relief) && p.zp?.length && yesNo(ctx, p, '«Отходняк»: сбросить и вылечить одно ЗПМП?', 'Вылечить', 'Позже')) {
    pd.splice(pd.indexOf(PD.relief), 1)
    cure(ctx, p, 1)
  }
  const sick = enemies(s, p).filter(q => q.zp?.length)
  if (pd.includes(PD.bake) && sick.length && enemies(s, p).length > 1 && yesNo(ctx, p, '«Запечёнка»: передать ЗПМП от одного врага другому?', 'Передать', 'Позже')) {
    pd.splice(pd.indexOf(PD.bake), 1)
    const a = choosePlayer(ctx, p, sick, 'У кого забрать ЗПМП?')!
    const b = choosePlayer(ctx, p, enemies(s, p).filter(q => q !== a), 'Кому отдать?')
    if (b) {
      const z = pickZp(ctx, p, a, 'Какое ЗПМП?')
      a.zp = a.zp!.filter(x => x !== z)
      take(ctx, b, z, p)
    }
  }
}
// Открытие заклинания: «Лобковые кракены» (до замены «Шальной магии»)
export function passionPreReveal(ctx: Ctx, p: PlayerState) {
  if (!passionOn(ctx.s) || !kind(p, 5) || !p.spell) return
  const w = p.spell.filter(c => c.id >= 0 && spellOf(c.id).type === 'wild')
  if (!w.length) return
  p.spell = p.spell.filter(c => !w.includes(c))
  ctx.s.discard.push(...w.map(c => c.id))
  log(ctx.s, `🦑 «Лобковые кракены»: ${p.name} убирает «Шальную магию» из заклинания.`)
}
// «Гепатит Ы»: заклинание на 1 карту меньше за каждый жетон
export function passionReveal(ctx: Ctx, p: PlayerState) {
  const n = kind(p, 7)
  if (!passionOn(ctx.s) || !n || !p.spell) return
  const max = Math.max(1, 3 - n)
  while (p.spell.filter(c => c.id >= 0 && !c.done && !c.on).length > max) {
    const list: CardId[] = p.spell.filter(c => c.id >= 0 && !c.done && !c.on).map(c => c.id)
    const id: CardId = chooseHandCard(ctx, p, '«Гепатит Ы»: какую карту убрать из заклинания?', list)!
    p.spell = p.spell.filter(c => c.id !== id)
    ctx.s.discard.push(id)
    log(ctx.s, `🦠 «Гепатит Ы»: ${p.name} убирает ${cardName(id)}.`)
  }
}
export function passionEndTurn(ctx: Ctx, p: PlayerState) {
  if (passionOn(ctx.s)) zpEnd(ctx, p)
}

// ---------- хуки ядра ----------
const prevHand = ab.hand
ab.hand = p => (prevHand?.(p) ?? 0) - 2 * kind(p, 8)
hooks.noHeal = (_ctx, p) => kind(p, 4) > 0
hooks.noTreasure = p => kind(p, 1) > 0
const prevGained = hooks.gained
hooks.gained = (ctx, p, t) => {
  prevGained?.(ctx, p, t)
  if (kind(p, 1) && p.treasures.includes(t)) { log(ctx.s, `🍄 «Гнилой пень»: ${p.name} не может иметь сокровища.`); loseTreasure(ctx.s, p, t) }
}
// «Шлюхопряд»: +1 к броскам в этот ход
const prevBonus = ab.bonus
ab.bonus = (ctx, p) => (prevBonus?.(ctx, p) ?? 0) + (ctx.s.turn?.plus1 && myTurn(ctx.s, p) ? 1 : 0)
// «Ведьмины бородавки»: каждая карта бьёт только одного врага
const prevDmg = ab.dmg
ab.dmg = (ctx, foe, p, n) => {
  n = prevDmg ? prevDmg(ctx, foe, p, n) : n
  const t = ctx.s.turn
  if (n <= 0 || !t || !kind(foe, 0)) return n
  if (t.one == null) t.one = p.id
  return t.one === p.id ? n : 0
}
const prevAfter = hooks.afterCard
hooks.afterCard = (ctx, p, cur) => {
  if (ctx.s.turn) ctx.s.turn.one = undefined
  prevAfter?.(ctx, p, cur)
}

// ---------- сокровища «в свой ход» ----------
const SELF_INFECT: number[] = [PT.yog, PT.peak, PT.lake, PT.cave, PT.bed]
const CURE_DISCARD: Record<number, [string, string, number]> = {
  [PT.pimple]: ['source', 'заводилу', 2], [PT.syringe]: ['quality', 'наворот', 2], [PT.rocket]: ['delivery', 'приход', 2], [PT.bust]: ['wild', '«Шальную магию»', 4],
}
const prevActs = hooks.acts
hooks.acts = (s, p): TreasureAct[] => {
  const out = prevActs?.(s, p) ?? []
  if (!passionOn(s) || !s.turn) return out
  const used = (t: number) => !!s.turn?.usedT?.includes(t)
  const once = (e: Ctx, t: number) => { (e.s.turn!.usedT ??= []).push(t) }
  for (const t of SELF_INFECT) {
    if (!has(p, t) || used(t) || !bag(s).length || (t === PT.cave && !p.spell?.some(c => c.id >= 0 && spellOf(c.id).creature && !c.stay))) continue
    const what = { [PT.yog]: 'заразить ещё до 2 врагов', [PT.peak]: '3 урона врагу', [PT.lake]: 'захватить замок', [PT.cave]: 'тварь получает «СТОЯТЬ!»', [PT.bed]: 'накрутить 4 ж.' }[t]
    out.push({ t, label: `Заразиться ЗПМП → ${what}`, run: (e, p) => {
      once(e, t)
      const n = zc(p)
      infect(e, p, p)
      if (zc(p) <= n || !p.alive) return
      if (t === PT.yog) for (let i = 0; i < 2; i++) { const q = choosePlayer(e, p, enemies(e.s, p), `«Йог-Гондот»: кого заразить (${i + 1}/2)?`); if (!q) break; infect(e, q, p) }
      if (t === PT.peak) damage(e, choosePlayer(e, p, enemies(e.s, p), '«Вершина бытия»: кому 3 урона?'), 3)
      if (t === PT.lake) seize(e, p)
      if (t === PT.bed) heal(e, p, 4)
      if (t === PT.cave) { const c = p.spell?.find(c => c.id >= 0 && spellOf(c.id).creature && !c.stay); if (c) { c.stay = true; log(e.s, `🐾 ${cardName(c.id)}: СТОЯТЬ!`) } }
    } })
  }
  if (has(p, PT.sado) && enemies(s, p).some(q => q.zp?.length))
    out.push({ t: PT.sado, label: 'Сбросить → враг терпит свои ЗПМП как в конце хода', run: (e, p) => {
      loseTreasure(e.s, p, PT.sado)
      const q = choosePlayer(e, p, enemies(e.s, p).filter(q => q.zp?.length), '«Садомазожезл»: кто?')
      if (q) zpEnd(e, q)
    } })
  if (has(p, PT.boots) && p.life < 25) out.push({ t: PT.boots, label: 'Сбросить → накрутить 5 ж.', run: (e, p) => { loseTreasure(e.s, p, PT.boots); heal(e, p, 5) } })
  if (has(p, PT.legs) && !used(PT.legs) && zc(p) && p.spell)
    out.push({ t: PT.legs, label: `Взять ${zc(p)} карт., одну — в заклинание`, run: (e, p) => {
      once(e, PT.legs)
      const got: CardId[] = []
      for (let i = 0; i < zc(p); i++) { const id = drawSpell(e.s); if (id != null) got.push(id) }
      if (!got.length) return
      p.hand.push(...got)
      fromHand(e, p, '«Острые ножки»: какую из взятых карт добавить к заклинанию?', id => got.includes(id))
    } })
  if (has(p, PT.egg) && p.spell) out.push({ t: PT.egg, label: 'Сбросить → найти тварь в колоде', run: (e, p) => { loseTreasure(e.s, p, PT.egg); revealUntil(e, p, id => !!spellOf(id).creature) } })
  if (has(p, PT.hat) && !holds(s, p)) out.push({ t: PT.hat, label: 'Сбросить → захватить замок и 2 ж.', run: (e, p) => { loseTreasure(e.s, p, PT.hat); seize(e, p); heal(e, p, 2) } })
  if (has(p, PT.cock) && p.zp?.length) out.push({ t: PT.cock, label: 'Сбросить → вылечить все ЗПМП', run: (e, p) => { loseTreasure(e.s, p, PT.cock); cure(e, p, Infinity) } })
  const same = enemies(s, p).filter(q => q.hand.length && q.zp?.some(z => kind(p, z >> 1)))
  if (has(p, PT.club) && !used(PT.club) && same.length && p.spell)
    out.push({ t: PT.club, label: 'Отжать карту у врага с таким же ЗПМП', run: (e, p) => {
      once(e, PT.club)
      const q = choosePlayer(e, p, enemies(e.s, p).filter(q => q.hand.length && q.zp?.some(z => kind(p, z >> 1))), '«Дубина в колено»: у кого?')
      if (!q) return
      const id = q.hand[rand(e.s, q.hand.length)]
      q.hand = q.hand.filter(x => x !== id)
      log(e.s, `🦵 ${p.name} отжимает карту у ${q.name}.`)
      addToSpell(e, p, id, 'added')
    } })
  if (has(p, PT.colon) && !used(PT.colon) && p.spell && enemies(s, p).some(q => q.zp?.length))
    out.push({ t: PT.colon, label: 'Вылечить ЗПМП врага → он даёт карту в твоё заклинание', run: (e, p) => {
      once(e, PT.colon)
      const q = choosePlayer(e, p, enemies(e.s, p).filter(q => q.zp?.length), '«Колонополия»: кого лечить?')
      if (!q || !cure(e, q, 1, p) || !q.hand.length) return
      const id = chooseHandCard(e, q, `«Колонополия»: какую карту отдать в заклинание ${p.name}?`)!
      q.hand = q.hand.filter(x => x !== id)
      addToSpell(e, p, id, 'added')
    } })
  if (has(p, PT.trah) && !used(PT.trah) && p.zp?.length)
    out.push({ t: PT.trah, label: 'Сбросить сокровище → вылечить 2 ЗПМП и 5 ж.', run: (e, p) => {
      once(e, PT.trah)
      const t = chooseTreasure(e, p, p, 'Какое сокровище сбросить?')
      if (t == null) return
      loseTreasure(e.s, p, t)
      if (cure(e, p, 2)) heal(e, p, 5)
    } })
  for (const [k, [ty, what, n]] of Object.entries(CURE_DISCARD)) {
    const t = +k
    if (!has(p, t) || used(t) || !p.zp?.length || !p.hand.some(id => spellOf(id).type === ty)) continue
    out.push({ t, label: `Сбросить ${what} → вылечить ЗПМП и ${n} урона`, run: (e, p) => {
      once(e, t)
      const id = chooseHandCard(e, p, 'Какую карту сбросить?', p.hand.filter(id => spellOf(id).type === ty))!
      p.hand = p.hand.filter(x => x !== id); e.s.discard.push(id)
      if (cure(e, p, 1)) damage(e, choosePlayer(e, p, enemies(e.s, p), `${TREASURES[t].name}: кому ${n} урона?`), n)
    } })
  }
  return out
}
export const zpSummary = (p: PlayerState) => (p.zp ?? []).map(z => ZP[z >> 1][0])
