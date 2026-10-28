// «Мессиво на грибучем болоте»: эффекты заклинаний 64–123, твари, колдунство, пережор, нежданчик,
// сокровища «раз в свой ход» и сокровища-твари, карты дохлых колдунов «прямо сейчас».
// Тексты — transcript/swamp-*.md.
import { SPELLS, TREASURES, type School, type SpellType } from '../data/cards.ts'
import {
  ST, SD, alive, ask, cardName, choosePlayer, chooseHandCard, chooseTreasure, creatureTreasures, d6, damage, drawDead, drawSpell,
  enemies, ev, gainTreasure, heal, hooks, isWild, leftEnemy, log, loseTreasure, mightyRoll, moveTreasure, rand, randomEnemy,
  rightEnemy, rollEv, signs, spellOf, strongest, tier, treasureName, uniqueSigns, weakest, yesNo, type Ctx,
} from './core.ts'
import { EFFECTS, addToSpell, cardInfo, type E } from './effects.ts'
import type { CardId, PlayerState, SpellCard } from './types.ts'

type Slot = Exclude<SpellType, 'wild'>
const OFF = 64
const at = (n: number) => OFF + n

// ---------- помощники ----------
const uniq = (list: (PlayerState | null)[]) => [...new Set(list.filter((q): q is PlayerState => !!q))]
const hitAll = (e: Ctx, list: PlayerState[], n: number) => { for (const q of list) damage(e, q, n) }
const foes = (e: E) => enemies(e.s, e.p)
const chooseFoe = (e: E, list = foes(e), prompt = 'Выбери врага') => choosePlayer(e, e.p, list, prompt)
const twoLeft = (e: E) => foes(e).slice(0, 2)
const twoRight = (e: E) => [...foes(e)].reverse().slice(0, 2)
// Жертвы прихода (при «Шерочке с Машерочкой» из базы — все враги)
const victims = (e: E, pick: () => (PlayerState | null)[]) => (e.card.type === 'delivery' && e.s.turn?.deliveryAll ? foes(e) : uniq(pick()))
const cardSchools = (id: CardId): School[] => { const c = spellOf(id); return [c.school, c.school2].filter((x): x is School => !!x) }
const triples = (p: PlayerState) => Object.values(signs(p)).reduce((a, n) => a + Math.floor(n / 3), 0)
const draw = (e: Ctx, p: PlayerState, n = 1) => { for (let i = 0; i < n; i++) { const c = drawSpell(e.s); if (c != null) p.hand.push(c) } }
// Сброс карт с руки: выбирает владелец
function discardN(e: Ctx, q: PlayerState, n: number) {
  for (let i = 0; i < n && q.hand.length; i++) {
    const id = chooseHandCard(e, q, `Сбрось карту с руки (${i + 1} из ${n})`)!
    q.hand = q.hand.filter(x => x !== id)
    e.s.discard.push(id)
  }
}
function discardRandom(e: Ctx, q: PlayerState) {
  if (!q.hand.length) return
  const id = q.hand[rand(e.s, q.hand.length)]
  q.hand = q.hand.filter(x => x !== id)
  e.s.discard.push(id)
  log(e.s, `${q.name} сбрасывает случайную карту.`)
}
// Взять карту и показать всем; сколько знаков заклинания совпадает с её знаком
function showDraw(e: E): number {
  const c = drawSpell(e.s)
  if (c == null) return 0
  e.p.hand.push(c)
  const sg = signs(e.p), m = cardSchools(c).reduce((a, sc) => a + sg[sc], 0)
  log(e.s, `${e.p.name} берёт и показывает ${cardName(c)}: совпадений по знаку — ${m}.`)
  return m
}
// Могучий бросок; у твари — «СТОЯТЬ!» по тексту выпавшей строки
function M(e: E): number {
  const t = tier(mightyRoll(e, e.p, e.card))
  const d = SPELLS[e.card.index]
  if (d.creature && e.cur && d.mighty?.[t].text.includes('СТОЯТЬ')) { e.cur.stay = true; log(e.s, `🐾 ${d.name}: СТОЯТЬ!`) }
  return t
}
// Закрытые карты перед врагом (заклинание ещё не открыто) и его твари
const closedCards = (q: PlayerState) => (q.acted ? 0 : (q.spell ?? []).filter(c => !c.done && !c.on).length)
const creatureCount = (q: PlayerState) => (q.creatures?.length ?? 0) + creatureTreasures(q).length
// Выбрать тварь колдуна q (карта-тварь или сокровище-тварь); выбирает who (по умолчанию владелец)
function pickCreature(e: Ctx, q: PlayerState, prompt: string, optional = false, who = q): CardId | string | null {
  const own = q.creatures ?? [], tr = creatureTreasures(q)
  if (!own.length && !tr.length) return null
  return ask(e, {
    player: who.id, prompt, optional,
    options: [
      ...own.map(id => ({ v: id, label: spellOf(id).name, card: { deck: 'spells' as const, index: Math.floor(id / 10) } })),
      ...tr.map(t => ({ v: `t${t}`, label: TREASURES[t].name, card: { deck: 'treasures' as const, index: t } })),
    ],
  })
}
function takeCreature(e: Ctx, from: PlayerState, to: PlayerState | null, v: CardId | string) {
  if (typeof v === 'string') {
    const t = +v.slice(1)
    if (to) moveTreasure(e.s, from, to, t)
    else { loseTreasure(e.s, from, t); log(e.s, `${from.name} теряет ${treasureName(t)}.`) }
    return
  }
  from.creatures = (from.creatures ?? []).filter(x => x !== v)
  if (to) { (to.creatures ??= []).push(v); log(e.s, `${to.name} отжимает у ${from.name} тварь ${cardName(v)}.`) }
  else { e.s.discard.push(v); log(e.s, `${from.name} сбрасывает тварь ${cardName(v)}.`) }
}
function stealTreasure(e: Ctx, p: PlayerState, list: PlayerState[], prompt = 'У кого отжать сокровище?') {
  const q = choosePlayer(e, p, list.filter(q => q.treasures.length), prompt)
  if (!q) return log(e.s, 'Отжимать нечего.')
  const t = chooseTreasure(e, p, q, 'Какое сокровище отжать?')!
  moveTreasure(e.s, q, p, t)
  return t
}
// Бросок кубика эффекта (не могучий)
function die(e: Ctx, p: PlayerState, label = ''): number { const r = d6(e.s); rollEv(e.s, p, [r], r, label); return r }

// ---------- эффекты заклинаний ----------
export const SWAMP_EFFECTS: Record<number, (e: E) => void> = {
  // 0 Перегруз ответственности
  [at(0)]: e => { const v = victims(e, () => [strongest(e, e.p)]), t = M(e); hitAll(e, v, [1, 3, 6][t]); if (t === 2) damage(e, e.p, 2) },
  // 1 Суши-повар (тварь)
  [at(1)]: e => { const v = victims(e, () => [chooseFoe(e)]); hitAll(e, v, [1, 2, 5][M(e)]) },
  // 2 Многозначный
  [at(2)]: e => draw(e, e.p, uniqueSigns(e.p)),
  // 3 Нефартовый
  [at(3)]: e => damage(e, rightEnemy(e.s, e.p), 2),
  // 4 От Мага Олдфага: перед уроном любой может сбросить сокровище — переброс
  [at(4)]: e => {
    const q = chooseFoe(e)
    let r = die(e, e.p)
    for (const w of alive(e.s).filter(w => w.treasures.length)) {
      if (!yesNo(e, w, `Маг Олдфаг: выпало ${r}. Сбросить сокровище, чтобы перебросить?`, 'Сбросить и перебросить', 'Нет')) continue
      loseTreasure(e.s, w, chooseTreasure(e, w, w, 'Какое сокровище сбросить?')!)
      log(e.s, `${w.name} сбрасывает сокровище — переброс!`)
      r = die(e, e.p)
    }
    damage(e, q, r)
  },
  // 5 От Бэбимиксера
  [at(5)]: e => hitAll(e, [...foes(e), e.p], 2),
  // 6 От Чумовой девки
  [at(6)]: e => { const r = die(e, e.p); if (r % 2 === 0) heal(e, e.p, r); else { const q = chooseFoe(e); damage(e, e.p, r); damage(e, q, r) } },
  // 7 От Рюмкенштильцхена: все твари этого хода — «СТОЯТЬ!»
  [at(7)]: e => { if (e.s.turn) e.s.turn.allStay = true; log(e.s, '🐾 Все твари этого хода остаются в игре!') },
  // 8 От Балбесов из Хрюгвартса
  [at(8)]: e => damage(e, randomEnemy(e, e.p), e.p.treasures.length),
  // 9 Попкорновый
  [at(9)]: e => {
    const q = chooseFoe(e)
    if (!q) return
    const v = creatureCount(q) ? pickCreature(e, q, `Попкорновый: отдай ${e.p.name} тварь — или сбросишь закрытых заводил и навороты`, true) : null
    if (v != null) return takeCreature(e, q, e.p, v)
    if (q.acted || !q.spell) return log(e.s, `${q.name}: закрытых карт нет.`)
    const out = q.spell.filter(c => !c.done && !c.on && (c.slot === 'source' || c.slot === 'quality'))
    q.spell = q.spell.filter(c => !out.includes(c))
    e.s.discard.push(...out.filter(c => c.id >= 0).map(c => c.id))
    log(e.s, `${q.name} сбрасывает из заклинания ${out.length} карт.`)
  },
  // 10 Травмоопасный: каждый может сбросить сокровище, чтобы не получать урон
  [at(10)]: e => {
    const r = die(e, e.p)
    for (const q of alive(e.s)) {
      if (q.treasures.length && yesNo(e, q, `Травмоопасный: ${r} урона. Сбросить сокровище, чтобы увернуться?`, 'Сбросить', 'Отхватить')) {
        loseTreasure(e.s, q, chooseTreasure(e, q, q, 'Какое сокровище сбросить?')!)
        log(e.s, `${q.name} откупается сокровищем.`)
      } else damage(e, q, r)
    }
  },
  // 11 Течный
  [at(11)]: e => damage(e, rightEnemy(e.s, e.p), 2 * showDraw(e)),
  // 12 Призрачный
  [at(12)]: e => { const q = chooseFoe(e); if (!q) return; e.s.discard.push(...q.hand); q.hand = []; log(e.s, `${q.name} сбрасывает всю руку.`) },
  // 13 Верблюжелапный: левый — 2 карты, следующий — 3 и т. д.
  [at(13)]: e => foes(e).forEach((q, i) => discardN(e, q, i + 2)),
  // 14 Прожжённый
  [at(14)]: e => { const l = leftEnemy(e.s, e.p), r = rightEnemy(e.s, e.p); damage(e, l, l?.treasures.length ?? 0); if (r !== l) damage(e, r, r?.treasures.length ?? 0) },
  // 15 Психоделичный
  [at(15)]: e => { const n = showDraw(e); damage(e, weakest(e, e.p), n) },
  // 16 Чистилищный
  [at(16)]: e => drawDead(e, e.p),
  // 17 Страдающий
  [at(17)]: e => damage(e, leftEnemy(e.s, e.p), 2),
  // 18 Скальпосъёмный: случайный колдун, может и ты
  [at(18)]: e => { const all = alive(e.s), q = all[rand(e.s, all.length)]; log(e.s, `Случайный колдун — ${q.name}.`); damage(e, q, 4) },
  // 19 Тырящий
  [at(19)]: e => {
    const q = chooseFoe(e, foes(e).filter(q => q.treasures.length), 'У кого отжать сокровище?')
    if (q) moveTreasure(e.s, q, e.p, chooseTreasure(e, e.p, q, 'Какое сокровище отжать?')!)
    hitAll(e, foes(e).filter(x => x !== q), 1)
  },
  // 20 Волканический
  [at(20)]: e => hitAll(e, foes(e), uniqueSigns(e.p)),
  // 21 Ароматный
  [at(21)]: e => damage(e, leftEnemy(e.s, e.p), 2 * showDraw(e)),
  // 22 Премиальный
  [at(22)]: e => gainTreasure(e, e.p),
  // 23 Людоедский
  [at(23)]: e => {
    const n = ask(e, { player: e.p.id, prompt: 'Людоедский: сколько карт взять (столько же жизней потеряешь)?', options: [1, 2, 3].map(k => ({ v: k, label: `${k}` })) }) as number
    const got: CardId[] = []
    for (let i = 0; i < n; i++) { const c = drawSpell(e.s); if (c != null) { got.push(c); e.p.hand.push(c) } }
    damage(e, e.p, got.length)
    heal(e, e.p, 2 * got.filter(c => cardSchools(c).includes('dark')).length)
  },
  // 24 Бингональный
  [at(24)]: e => {
    let n = 0
    for (let i = 0; i < 2; i++) { const c = drawSpell(e.s); if (c != null) { e.p.hand.push(c); n += cardSchools(c).length; log(e.s, `${e.p.name} показывает ${cardName(c)}.`) } }
    damage(e, chooseFoe(e), n)
  },
  // 25 Лобкоубийца
  [at(25)]: e => { const v = victims(e, () => twoLeft(e)), t = M(e); hitAll(e, v, [1, 2, 2 * uniqueSigns(e.p)][t]) },
  // 26 Глазной разбег
  [at(26)]: e => { const v = victims(e, () => foes(e)), t = M(e); hitAll(e, v, [1, 3, 3][t]); if (t === 2) draw(e, e.p) },
  // 27 Лютобомж (тварь)
  [at(27)]: e => { const v = victims(e, () => [strongest(e, e.p)]); hitAll(e, v, [1, 3, 3][M(e)]) },
  // 28 Вынос мозга: враг живучее тебя
  [at(28)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => q.life > e.p.life), 'Кто живучее тебя?')]), t = M(e)
    hitAll(e, v, [2, 3, 2 * uniqueSigns(e.p)][t]); if (t === 1) gainTreasure(e, e.p)
  },
  // 29 Летучий Синюшный Дельфин (тварь)
  [at(29)]: e => { const v = victims(e, () => [weakest(e, e.p)]); hitAll(e, v, [2, 3, 3][M(e)]) },
  // 30 От Хипстерских хиппи
  [at(30)]: e => { const q = chooseFoe(e, foes(e).filter(q => q.life > e.p.life), 'Кто живучее тебя?'); if (q) damage(e, q, creatureCount(q) + closedCards(q)) },
  // 31 От Ручного диктатора
  [at(31)]: e => {
    const max = Math.min(4, e.p.treasures.length)
    const n = max ? ask(e, { player: e.p.id, prompt: 'Сколько сокровищ сбросить (2 урона каждому врагу за каждое)?', options: Array.from({ length: max + 1 }, (_, k) => ({ v: k, label: `${k}` })) }) as number : 0
    for (let i = 0; i < n; i++) loseTreasure(e.s, e.p, chooseTreasure(e, e.p, e.p, `Сбрось сокровище (${i + 1} из ${n})`)!)
    if (n) hitAll(e, foes(e), 2 * n)
  },
  // 32 От Дерьмонстра
  [at(32)]: e => heal(e, e.p, 3),
  // 33 От Гномиков-шалунишек
  [at(33)]: e => {
    const list = foes(e).filter(q => q.life < e.p.life)
    hitAll(e, list, 1)
    const died = list.filter(q => !q.alive).length
    if (died) heal(e, e.p, died); else draw(e, e.p)
  },
  // 34 От Академика Мухожука
  [at(34)]: e => { const c = drawSpell(e.s); if (c != null) addToSpell(e, e.p, c, 'added') },
  // 35 От Леди Силиконии
  [at(35)]: e => {
    const id = chooseHandCard(e, e.p, 'Какую карту положить на верх колоды?')
    if (id == null) return
    e.p.hand = e.p.hand.filter(x => x !== id); e.s.deck.push(id); log(e.s, `${e.p.name} кладёт карту на верх колоды.`)
  },
  // 36 От Зажимничка
  [at(36)]: e => hitAll(e, foes(e), showDraw(e)),
  // 37 От Гольфараона Клюшкомона
  [at(37)]: e => gainTreasure(e, e.p),
  // 38 От Копьенатирателя
  [at(38)]: e => { stealTreasure(e, e.p, uniq([leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)])) },
  // 39 От Горячей киски
  [at(39)]: e => {
    const q = chooseFoe(e, foes(e).filter(creatureCount), 'У кого отжать тварь?')
    if (!q) return log(e.s, 'Отжимать некого.')
    takeCreature(e, q, e.p, pickCreature(e, q, 'Какую тварь отжать?', false, e.p)!)
  },
  // 40 От Пучеглаза
  [at(40)]: e => { const n = showDraw(e); damage(e, strongest(e, e.p), 2 * n) },
  // 41 От Трансгендракона
  [at(41)]: e => damage(e, strongest(e, e.p), 3),
  // 42 От Горелого конкистадора
  [at(42)]: e => {
    if (!e.p.treasures.length || !yesNo(e, e.p, 'Сбросить сокровище, чтобы каждый враг сбросил тварь?', 'Сбросить', 'Нет')) return
    loseTreasure(e.s, e.p, chooseTreasure(e, e.p, e.p, 'Какое сокровище сбросить?')!)
    for (const q of foes(e)) { const v = pickCreature(e, q, 'Сбрось свою тварь'); if (v != null) takeCreature(e, q, null, v) }
  },
  // 43 От Развратино
  [at(43)]: e => { e.p.extraDice += 1 },
  // 44 От Самогонного деда
  [at(44)]: e => {
    const q = chooseFoe(e)
    if (!q) return
    damage(e, q, 1)
    if (q.alive) damage(e, choosePlayer(e, q, enemies(e.s, q).filter(x => x !== e.p), `${q.name}: кому нанести 2 урона?`), 2)
  },
  // 45 Окрыляющий
  [at(45)]: e => { heal(e, e.p, 5); damage(e, e.p, e.p.hand.length) },
  // 46 Ссыкотный
  [at(46)]: e => damage(e, weakest(e, e.p), 2),
  // 47 Смертный одр (тварь)
  [at(47)]: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e); if (t === 0) draw(e, e.p); else hitAll(e, v, t === 1 ? 2 : 3) },
  // 48 Байкер Драматург (тварь)
  [at(48)]: e => { const v = victims(e, () => foes(e).filter(q => q.life >= 10)), t = M(e); hitAll(e, v, [2, 3, 4][t]); if (t === 2) damage(e, e.p, 1) },
  // 49 Шлюхобот (тварь): враги, ещё не сходившие в этом раунде
  [at(49)]: e => {
    const v = victims(e, () => foes(e).filter(q => !q.acted)), t = M(e)
    hitAll(e, v, [1, 1, 3][t]); if (t === 1) for (const q of v.filter(q => q.alive)) discardN(e, q, 2)
  },
  // 50 Битриклоп (тварь)
  [at(50)]: e => { const v = victims(e, () => twoRight(e)), t = M(e); if (t) hitAll(e, v, t === 1 ? 2 : 3) },
  // 51 Пах-бабах
  [at(51)]: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e); if (t) hitAll(e, v, t === 1 ? 2 : 2 * uniqueSigns(e.p)) },
  // 52 Рванувший пукан
  [at(52)]: e => {
    const v = victims(e, () => foes(e).filter(q => q.treasures.length)), t = M(e)
    hitAll(e, v, [1, 2, 4][t]); if (t === 2) for (const q of v.filter(q => q.alive)) discardRandom(e, q)
  },
  // 53 Главный засранец (тварь)
  [at(53)]: e => { const v = victims(e, () => [rightEnemy(e.s, e.p)]); hitAll(e, v, [1, 2, 4][M(e)]) },
  // 54 Адский фуршет: враг хилее тебя
  [at(54)]: e => {
    const v = victims(e, () => [chooseFoe(e, foes(e).filter(q => q.life < e.p.life), 'Кто хилее тебя?')]), t = M(e)
    hitAll(e, v, [2, 3, 2 * uniqueSigns(e.p)][t]); if (t === 0) damage(e, e.p, 1)
  },
  // 55 Доктор Раптор (тварь)
  [at(55)]: e => heal(e, e.p, [1, 2, 3][M(e)]),
  // 56 Срыв покрова
  [at(56)]: e => { const v = victims(e, () => [chooseFoe(e)]), t = M(e); hitAll(e, v, [1, 2, 2 * uniqueSigns(e.p)][t]); if (t === 1) draw(e, e.p) },
  // 57 Могучий пердёж
  [at(57)]: e => { const v = victims(e, () => twoRight(e)), t = M(e); hitAll(e, v, [2, 3, 4][t]); if (t === 2) heal(e, e.p, 2) },
  // 58 Сосочный ниндзя (тварь)
  [at(58)]: e => { const v = victims(e, () => [chooseFoe(e)]), t = M(e); hitAll(e, v, [1, 2, 3][t]); if (t === 2) draw(e, e.p) },
  // 59 Сиськокрут
  [at(59)]: e => { const v = victims(e, () => [chooseFoe(e)]), t = M(e); if (t === 0) discardRandom(e, e.p); else hitAll(e, v, t === 1 ? 2 : 3) },
}

// Эффект карты по индексу (база или болото), с пережором
export function applyCard(ctx: Ctx, p: PlayerState, id: CardId, cur?: SpellCard) {
  const info = cardInfo(id)
  const e = Object.assign(ctx, { p, card: info, depth: 0, cur }) as E
  const f = EFFECTS[info.index] ?? SWAMP_EFFECTS[info.index]
  f?.(e)
  if (SPELLS[info.index].overdose && p.alive && uniqueSigns(p) >= 4) {
    log(ctx.s, `🍄 Пережор! ${cardName(id)} — ещё раз.`)
    f?.(e)
  }
}

// ---------- колдунство ----------
const payable = (p: PlayerState, type: Slot, except: CardId) =>
  p.hand.filter(id => id !== except && (spellOf(id).type === type || isWild(id)))
export const sorceries = (p: PlayerState, hand = p.hand) =>
  hand.filter(id => { const c = spellOf(id); return c.sorcery && payable(p, c.sorcery, id).length >= 2 })
const SORC_NAME: Record<Slot, string> = { source: 'заводил', quality: 'наворота', delivery: 'прихода' }
// Сбросить 2 карты нужного типа и сыграть колдунство: в заклинание или сразу (нежданчик, щупальца)
function playSorcery(ctx: Ctx, p: PlayerState, id: CardId, now: boolean) {
  const type = spellOf(id).sorcery!
  p.hand = p.hand.filter(x => x !== id)
  for (let i = 0; i < 2; i++) {
    const c = chooseHandCard(ctx, p, `Колдунство: сбрось ${SORC_NAME[type]} (${i + 1} из 2)`, payable(p, type, id))!
    p.hand = p.hand.filter(x => x !== c)
    ctx.s.discard.push(c)
  }
  log(ctx.s, `✨ ${p.name}: колдунство ${cardName(id)}!`)
  if (p.treasures.includes(ST.poopHelm)) draw(ctx, p)
  if (now) { ev(ctx.s, { k: 'card', p: p.id, id }); ctx.s.discard.push(id); applyCard(ctx, p, id) }
  else addToSpell(ctx, p, id, 'added')
}

// ---------- сокровища «раз в свой ход» ----------
interface Act { t: number; label: string; run: (e: Ctx, p: PlayerState) => void }
const withSign = (p: PlayerState, sc: School) => p.hand.filter(id => cardSchools(id).includes(sc))
function discardSign(e: Ctx, p: PlayerState, sc: School | 'wild') {
  const list = sc === 'wild' ? p.hand.filter(isWild) : withSign(p, sc)
  const id = chooseHandCard(e, p, 'Какую карту сбросить?', list)!
  p.hand = p.hand.filter(x => x !== id); e.s.discard.push(id)
}
function treasureActs(s: Ctx['s'], p: PlayerState): Act[] {
  const has = (t: number) => p.treasures.includes(t) && !s.turn?.usedT?.includes(t)
  const out: Act[] = []
  const tri = triples(p)
  if (has(ST.burroughs) && withSign(p, 'hex').length && p.treasures.length <= 3) out.push({ t: ST.burroughs, label: 'Сбросить карту порчи → сокровище', run: (e, p) => { discardSign(e, p, 'hex'); gainTreasure(e, p) } })
  if (has(ST.pushkin) && p.hand.some(isWild)) out.push({ t: ST.pushkin, label: 'Сбросить «Шальную магию» → 3 урона каждому врагу', run: (e, p) => { discardSign(e, p, 'wild'); hitAll(e, enemies(e.s, p), 3) } })
  if (has(ST.freud) && withSign(p, 'fire').length) out.push({ t: ST.freud, label: 'Сбросить карту угара → 2 урона самому хилому', run: (e, p) => { discardSign(e, p, 'fire'); damage(e, weakest(e, p), 2) } })
  if (has(ST.shakespeare) && withSign(p, 'haze').length) out.push({ t: ST.shakespeare, label: 'Сбросить карту кумара → 3 урона самому живучему', run: (e, p) => { discardSign(e, p, 'haze'); damage(e, strongest(e, p), 3) } })
  if (has(ST.poe) && withSign(p, 'dark').length) out.push({ t: ST.poe, label: 'Сбросить карту мрака → 1 урон каждому (и себе)', run: (e, p) => { discardSign(e, p, 'dark'); hitAll(e, alive(e.s), 1) } })
  if (has(ST.marley) && withSign(p, 'grass').length && p.life < 25) out.push({ t: ST.marley, label: 'Сбросить карту травы → накрутить 1 жизнь', run: (e, p) => { discardSign(e, p, 'grass'); heal(e, p, 1) } })
  if (tri && has(ST.nipple)) out.push({ t: ST.nipple, label: `Взять ${tri} карт.`, run: (e, p) => draw(e, p, tri) })
  if (tri && has(ST.piglets) && p.life < 25) out.push({ t: ST.piglets, label: `Накрутить ${tri} ж.`, run: (e, p) => heal(e, p, tri) })
  if (tri && has(ST.bandit)) out.push({ t: ST.bandit, label: `${tri} урона врагу по выбору`, run: (e, p) => damage(e, choosePlayer(e, p, enemies(e.s, p), 'Кому?'), tri) })
  return out
}

// Перед очередной картой: предложить колдунство и сокровища (один раз на каждое новое положение дел).
// Возвращает true, если что-то сыграно (шаг закончен).
export function offers(ctx: Ctx, p: PlayerState): boolean {
  const { s } = ctx
  const turn = s.turn!
  const sorc = sorceries(p), acts = treasureActs(s, p)
  if (!sorc.length && !acts.length) return false
  const sig = JSON.stringify([p.hand, p.treasures, turn.usedT, uniqueSigns(p)])
  if (turn.sorcHand === sig) return false
  const v = ask(ctx, {
    player: p.id, prompt: 'Перед следующей картой можно:', optional: true,
    options: [
      ...sorc.map(id => ({ v: id, label: `Колдунство: ${spellOf(id).name} (сбросить 2 ${SORC_NAME[spellOf(id).sorcery!]})`, card: { deck: 'spells' as const, index: Math.floor(id / 10) } })),
      ...acts.map(a => ({ v: `t${a.t}`, label: `${TREASURES[a.t].name}: ${a.label}`, card: { deck: 'treasures' as const, index: a.t } })),
    ],
  })
  if (v == null) { turn.sorcHand = sig; return false }
  if (typeof v === 'string') {
    const a = acts.find(a => `t${a.t}` === v)!
    ;(turn.usedT ??= []).push(a.t)
    log(s, `${p.name} применяет ${treasureName(a.t)}.`)
    a.run(ctx, p)
  } else playSorcery(ctx, p, v, false)
  return true
}

// Сокровища-твари: срабатывают в конце хода владельца; без «СТОЯТЬ!» — сбрасываются
export function treasureCreatures(ctx: Ctx, p: PlayerState) {
  for (const t of creatureTreasures(p)) {
    if (!p.alive) return
    const d = TREASURES[t]
    ev(ctx.s, { k: 'treasure', p: p.id, t })
    const card = { school: d.creature!, type: 'delivery', name: d.name }
    const r = tier(mightyRoll(ctx, p, card))
    const q = choosePlayer(ctx, p, enemies(ctx.s, p), `${d.name}: кого бить?`)
    if (t === ST.golem && r === 2) hitAll(ctx, enemies(ctx.s, p), 3)
    else damage(ctx, q, [2, 4, t === ST.music ? 6 : 3][r])
    if (r === 2) {
      if (t === ST.music) damage(ctx, p, 2)
      if (t === ST.fluffy) gainTreasure(ctx, p)
      if (t === ST.gin) draw(ctx, p, 3)
      if (t === ST.pine) heal(ctx, p, 3)
    }
    if (r !== 2 && !ctx.s.turn?.allStay && p.treasures.includes(t)) { loseTreasure(ctx.s, p, t); log(ctx.s, `${d.name} уходит (не «СТОЯТЬ!»).`) }
  }
}

// ---------- хуки ядра ----------
// Нежданчик: подыхая, сыграть колдунства с руки (эффекты — сразу)
hooks.surprise = (ctx, p) => {
  log(ctx.s, `💥 Нежданчик ${p.name}!`)
  for (;;) {
    const list = sorceries(p)
    const id = list.length ? chooseHandCard(ctx, p, 'Нежданчик: какое колдунство сыграть?', list, true) : null
    if (id == null) return
    playSorcery(ctx, p, id, true)
  }
}
// Дохлые колдуны «прямо сейчас»: true — карта сыграна и сбрасывается
hooks.deadNow = (ctx, p, c) => {
  const k = Math.floor(c / 10)
  if (k === SD.shitq) {
    const t = stealTreasure(ctx, p, alive(ctx.s).filter(q => q !== p))
    if (t != null) (p.keep ??= []).push(t)
    return true
  }
  if (k === SD.tentacles) {
    const got: CardId[] = []
    for (let i = 0; i < 8; i++) { const x = drawSpell(ctx.s); if (x != null) got.push(x) }
    const saved = p.hand
    p.hand = got
    try {
      for (;;) {
        const list = sorceries(p)
        if (!list.length) break
        playSorcery(ctx, p, chooseHandCard(ctx, p, 'Щупальца: какое колдунство сыграть?', list)!, true)
      }
    } finally {
      // эффект мог закончить игру — карты всё равно в сброс
      ctx.s.discard.push(...p.hand)
      p.hand = saved
    }
    return true
  }
  return false
}
