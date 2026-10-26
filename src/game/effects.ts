// Эффекты карт заклинаний по индексу (тексты — transcript/spells.md, src/data/cards.ts).
import { SPELLS, type School, type SpellType } from '../data/cards.ts'
import {
  alive, ask, choosePlayer, chooseHandCard, chooseTreasure, damage, drawDead, drawSpell, enemies, gainTreasure, heal,
  ev, leftEnemy, log, loseTreasure, mightyRoll, moveTreasure, neighborsOf, rand, randomEnemy, rightEnemy, rollEv, rollOne, signs, spellOf,
  strongest, tier, uniqueSigns, weakest, yesNo, cardName, type Ctx,
} from './core.ts'
import { TRAP, type CardId, type PlayerState } from './types.ts'

export interface CardInfo { index: number; school: School | null; type: SpellType; name: string }
export interface E extends Ctx { p: PlayerState; card: CardInfo; depth: number }

const M = (e: E) => tier(mightyRoll(e, e.p, e.card))
const hitAll = (e: E, list: PlayerState[], n: number) => { for (const q of list) damage(e, q, n) }
const uniq = (list: (PlayerState | null)[]) => [...new Set(list.filter((q): q is PlayerState => !!q))]
const enemiesOf = (e: E) => enemies(e.s, e.p)
const chooseEnemy = (e: E, prompt = 'Выбери врага') => choosePlayer(e, e.p, enemiesOf(e), prompt)

// Жертвы прихода: при «Шерочке с Машерочкой» — все враги (кроме приходов на себя).
function victims(e: E, pick: () => (PlayerState | null)[]): PlayerState[] {
  if (e.card.type === 'delivery' && e.s.turn?.deliveryAll) return enemiesOf(e)
  return uniq(pick())
}

// Открывать карты из колоды, пока не найдётся карта нужного типа (для «Шальной магии»).
export function replaceWild(e: Ctx, p: PlayerState, slot: Exclude<SpellType, 'wild'>, fromId: CardId = -2) {
  const flipped: CardId[] = []
  for (;;) {
    const c = drawSpell(e.s)
    if (c == null) { ev(e.s, { k: 'wild', p: p.id, from: fromId, to: null }); break }
    if (spellOf(c).type === slot) {
      p.spell!.push({ id: c, slot, from: 'wild' })
      ev(e.s, { k: 'wild', p: p.id, from: fromId, to: c })
      log(e.s, `${p.name}: «Шальная магия» превращается в ${cardName(c)}.`)
      break
    }
    flipped.push(c)
  }
  e.s.discard.push(...flipped)
}

// Добавить карту к своему заклинанию (с руки, из колоды, отжатую).
export function addToSpell(e: Ctx, p: PlayerState, id: CardId, from: string) {
  const sp = spellOf(id)
  if (sp.type === 'wild') {
    const slot = ask(e, {
      player: p.id, prompt: 'Добавляется «Шальная магия». Какую карту она заменит?',
      options: [{ v: 'source', label: 'Заводилу' }, { v: 'quality', label: 'Наворот' }, { v: 'delivery', label: 'Приход' }],
    }) as Exclude<SpellType, 'wild'>
    e.s.discard.push(id)
    if (e.s.turn) e.s.turn.hadWild = true
    return replaceWild(e, p, slot, id)
  }
  p.spell!.push({ id, slot: sp.type as Exclude<SpellType, 'wild'>, from })
  ev(e.s, { k: 'add', p: p.id, id })
  log(e.s, `${p.name} добавляет к заклинанию ${cardName(id)}.`)
}
function addFromHand(e: E, id: CardId | null) {
  if (id == null) return
  e.p.hand = e.p.hand.filter(x => x !== id)
  addToSpell(e, e.p, id, 'added')
}
const randomHand = (e: E) => (e.p.hand.length ? e.p.hand[rand(e.s, e.p.hand.length)] : null)

function discardFromHand(e: E, n: number) {
  for (let i = 0; i < n && e.p.hand.length; i++) {
    const id = chooseHandCard(e, e.p, `Сбрось карту с руки (${i + 1} из ${n})`)!
    e.p.hand = e.p.hand.filter(x => x !== id)
    e.s.discard.push(id)
  }
}
// Враг выбирает: отдать/сбросить сокровище или отхватить урон.
function treasureOrDamage(e: E, q: PlayerState, give: boolean) {
  if (!q.alive) return
  const verb = give ? 'Отдать сокровище' : 'Сбросить сокровище'
  if (q.treasures.length && yesNo(e, q, `${e.p.name}: ${verb.toLowerCase()} или отхватить 3 урона?`, verb, 'Отхватить 3 урона')) {
    const t = chooseTreasure(e, q, q, give ? `Какое сокровище отдать ${e.p.name}?` : 'Какое сокровище сбросить?')!
    if (give) moveTreasure(e.s, q, e.p, t)
    else { loseTreasure(e.s, q, t); log(e.s, `${q.name} сбрасывает сокровище.`) }
  } else damage(e, q, 3)
}
// Открыть n карт: подходящие добавить к заклинанию, остальные сбросить.
function revealAndAdd(e: E, n: number, fits: (id: CardId) => boolean) {
  const shown: CardId[] = []
  for (let i = 0; i < n; i++) { const c = drawSpell(e.s); if (c != null) shown.push(c) }
  log(e.s, `Открыты: ${shown.map(cardName).join(', ') || 'ничего'}.`)
  for (const c of shown) {
    if (fits(c)) addToSpell(e, e.p, c, 'added')
    else e.s.discard.push(c)
  }
}
// Скопировать текст другой карты своего заклинания (Дискотечный, Брадострел).
function copyCard(e: E, types: SpellType[]) {
  if (e.depth > 3) return
  const list = (e.p.spell ?? []).filter(c => c.id >= 0 && types.includes(spellOf(c.id).type) && Math.floor(c.id / 10) !== e.card.index)
  if (!list.length) return log(e.s, 'Копировать нечего.')
  const v = ask(e, {
    player: e.p.id, prompt: 'Чей текст скопировать?',
    options: list.map(c => ({ v: c.id, label: spellOf(c.id).name, card: { deck: 'spells' as const, index: Math.floor(c.id / 10) } })),
  }) as number
  const idx = Math.floor(v / 10)
  log(e.s, `${e.card.name} копирует ${cardName(v)}.`)
  // текст чужой карты, но знак и тип — копирующей (для могучего броска)
  e.depth++
  EFFECTS[idx]?.(e)
  e.depth--
}

export const EFFECTS: Record<number, (e: E) => void> = {
  // 1 От Бомжьей Коровки
  1: e => damage(e, leftEnemy(e.s, e.p), e.p.spell!.length),
  // 2 Праздник живота
  2: e => {
    const v = victims(e, () => [...enemiesOf(e)].reverse().slice(0, 3)), t = M(e)
    hitAll(e, v, [1, 2, 2][t]); heal(e, e.p, [1, 0, 2][t])
  },
  // 3 Раскулаченный
  3: e => hitAll(e, enemiesOf(e).filter(q => q.life < e.p.life), 2),
  // 4 От короля Оберона
  4: e => heal(e, e.p, 2),
  // 5 Шалтай-Разболтай
  5: e => { const v = victims(e, () => [weakest(e, e.p)]), t = M(e); hitAll(e, v, [1, 3, 5][t]); if (t === 2) gainTreasure(e, e.p) },
  // 6 Отсос мозга
  6: e => {
    const v = victims(e, () => [chooseEnemy(e)]), t = M(e)
    hitAll(e, v, [1, 3, 4][t])
    if (t === 2) for (const q of v.filter(q => q.alive && q.treasures.length)) {
      const tr = chooseTreasure(e, e.p, q, `Отжать сокровище у ${q.name}?`, true)
      if (tr != null) moveTreasure(e.s, q, e.p, tr)
    }
  },
  // 7 Рубин в башке
  7: e => {
    const v = victims(e, () => [chooseEnemy(e)]), t = M(e)
    hitAll(e, v, 1)
    if (t === 1 && e.p.alive && yesNo(e, e.p, 'Добавить случайную карту с руки к заклинанию?', 'Добавить', 'Нет')) addFromHand(e, randomHand(e))
    if (t === 2 && e.p.alive) addFromHand(e, chooseHandCard(e, e.p, 'Какую карту с руки добавить к заклинанию?', e.p.hand, true))
  },
  // 8 Жмураган
  8: e => { const v = victims(e, () => [strongest(e, e.p)]); hitAll(e, v, [2, 3, 6][M(e)]) },
  // 9 Фонтан молодости
  9: e => heal(e, e.p, [0, 2, 4][M(e)]),
  // 10 Вихрь бодрости
  10: e => {
    const v = victims(e, () => enemiesOf(e)), t = M(e)
    if (t >= 1) hitAll(e, v, 2)
    if (e.p.alive) discardFromHand(e, t === 0 ? 1 : 2)
    if (t === 2) gainTreasure(e, e.p)
  },
  // 11 Самовыпил
  11: e => { const v = victims(e, () => [rightEnemy(e.s, e.p)]); hitAll(e, v, [2, 3, 5][M(e)]); damage(e, e.p, 1) },
  // 12 Мясной фарш
  12: e => { const v = victims(e, () => enemiesOf(e).filter(q => q.life > e.p.life)); hitAll(e, v, [1, 3, 4][M(e)]) },
  // 13 Драконий сундук
  13: e => {
    const v = victims(e, () => enemiesOf(e).filter(q => !q.treasures.length)), t = M(e)
    hitAll(e, v, [1, 2, 3][t]); if (t === 2) gainTreasure(e, e.p)
  },
  // 14 Договор с дьяволом
  14: e => {
    const v = victims(e, () => [strongest(e, e.p)]), t = M(e)
    hitAll(e, v, [1, 2, 2][t])
    if (t === 2 && e.p.alive) for (const q of v) {
      const c = !q.acted && q.spell?.find(c => c.id >= 0 && spellOf(c.id).type === 'delivery' && !c.done)
      if (!c) continue
      q.spell = q.spell!.filter(x => x !== c)
      log(e.s, `${e.p.name} отжимает приход у ${q.name}.`)
      addToSpell(e, e.p, c.id, 'stolen')
    }
  },
  // 15 Кислотный слив
  15: e => {
    const v = victims(e, () => [leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)]), t = M(e)
    hitAll(e, v, [1, 2, 4][t]); if (t === 2) gainTreasure(e, e.p)
  },
  // 16 Экзорцизм
  16: e => {
    const v = victims(e, () => enemiesOf(e)), t = M(e)
    if (t === 0) return damage(e, e.p, 1)
    for (const q of v) damage(e, q, (q.medals ? 4 : 2) * (t === 2 ? 2 : 1))
  },
  // 17 Петушок
  17: e => { const v = victims(e, () => [strongest(e, e.p)]); hitAll(e, v, [1, 1, 7][M(e)]) },
  // 18 Шарах молнии
  18: e => { const v = victims(e, () => enemiesOf(e).slice(0, 2)); hitAll(e, v, [1, 2, 4][M(e)]) },
  // 19 Химерический хохот
  19: e => { const v = victims(e, () => [rightEnemy(e.s, e.p)]); hitAll(e, v, [1, 3, 4][M(e)]) },
  // 20 Ядрёный синтез
  20: e => {
    const v = victims(e, () => [strongest(e, e.p)]), t = M(e)
    if (t === 0) return hitAll(e, v, 1)
    const near = uniq(v.flatMap(q => neighborsOf(e.s, q))).filter(q => !v.includes(q))
    hitAll(e, v, t === 2 ? 5 : 3)
    hitAll(e, near, 1)
  },
  // 21 Раздвоитель личности
  21: e => {
    const v = victims(e, () => [leftEnemy(e.s, e.p)]), t = M(e)
    hitAll(e, v, [2, 3, 3][t])
    if (t === 2) for (const q of v) treasureOrDamage(e, q, false)
  },
  // 22 Кулак природы
  22: e => { const v = victims(e, () => [leftEnemy(e.s, e.p)]); hitAll(e, v, [1, 2, 4][M(e)]) },
  // 23 Удар милосердия
  23: e => { const v = victims(e, () => [weakest(e, e.p)]); hitAll(e, v, [2, 3, 4][M(e)]) },
  // 24 Змеиный жор
  24: e => {
    const v = victims(e, () => [leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)]), t = M(e)
    hitAll(e, v, t === 2 ? 2 * signs(e.p).grass : [1, 2][t])
  },
  // 25 Нетерпеливый (ходит первым — в очерёдности)
  25: e => hitAll(e, enemiesOf(e), 1),
  // 26 Ритуальный
  26: e => { const q = chooseEnemy(e), t = M(e); if (t === 0) damage(e, e.p, 3); else damage(e, q, t === 1 ? 3 : 5) },
  // 27 Дьявольский
  27: e => { const q = chooseEnemy(e), t = M(e); damage(e, q, [2, 4, 5][t]); damage(e, e.p, [0, 1, 2][t]) },
  // 28 Дискотечный
  28: e => copyCard(e, ['source', 'delivery']),
  // 29 Двуличный
  29: e => {
    const q = choosePlayer(e, e.p, alive(e.s), 'Кто берёт сокровище (и получает 2 урона за каждое своё)?')!
    gainTreasure(e, q); damage(e, q, 2 * q.treasures.length)
  },
  // 30 Опарышный
  30: e => damage(e, strongest(e, e.p), 2 * signs(e.p).dark),
  // 31 Котострофический
  31: e => {
    const res = alive(e.s).map(q => { const r = rollOne(e, q); return { q, raw: r.raw, total: r.total + (q === e.p ? 2 : 0) } })
    for (const r of res) rollEv(e.s, r.q, [r.raw], r.total, '')
    const max = Math.max(...res.map(r => r.total))
    for (const r of res) if (r.total === max) gainTreasure(e, r.q)
    for (const r of res) if (r.total !== max) damage(e, r.q, r.raw)
  },
  // 32 Мозголомный
  32: e => { const q = randomEnemy(e, e.p); damage(e, q, 3); gainTreasure(e, e.p); if (q) gainTreasure(e, q) },
  // 33 Разрывной
  33: e => {
    const q = chooseEnemy(e), t = M(e)
    damage(e, q, [1, 3, 4][t]); if (t === 1) damage(e, e.p, 1)
    if (t === 2 && q?.alive && q.treasures.length) {
      const tr = chooseTreasure(e, e.p, q, `Какое сокровище сбрасывает ${q.name}?`)!
      loseTreasure(e.s, q, tr); log(e.s, `${q.name} сбрасывает сокровище.`)
    }
  },
  // 34 Непонятный
  34: e => damage(e, rightEnemy(e.s, e.p), uniqueSigns(e.p) + e.p.treasures.length),
  // 35 Шипастый
  35: e => { const q = rightEnemy(e.s, e.p), t = M(e); damage(e, q, [1, 1, 3][t]); heal(e, e.p, [0, 1, 3][t]) },
  // 36 Загнивающий
  36: e => {
    const list = enemiesOf(e).filter(q => !q.acted && q.spell)
    const q = list.length ? strongest(e, e.p, list) : null
    const c = q?.spell!.find(c => c.slot === 'quality' && !c.done)
    if (!q || !c) return log(e.s, 'Наворот сбросить не у кого.')
    q.spell = q.spell!.filter(x => x !== c)
    if (c.id === TRAP) q.treasures.push(2)
    else e.s.discard.push(c.id)
    log(e.s, `${q.name} сбрасывает наворот из своего заклинания.`)
  },
  // 37 Каменючный
  37: e => enemiesOf(e).forEach((q, i) => damage(e, q, i + 1)),
  // 38 Аппетитный
  38: e => { const n = uniqueSigns(e.p); hitAll(e, enemiesOf(e).filter(q => q.life % 2 === 1), n) },
  // 39 Ядовый
  39: e => hitAll(e, enemiesOf(e), signs(e.p).fire),
  // 40 От Старого Жгуна
  40: e => { const r = rollOne(e, e.p); rollEv(e.s, e.p, [r.raw], r.total, ''); if (r.total <= 3) damage(e, e.p, r.total); else heal(e, e.p, r.total) },
  // 41 От Драконьера
  41: e => hitAll(e, enemiesOf(e), uniqueSigns(e.p)),
  // 42 Кубический
  42: e => {
    const mine = [rand(e.s, 6) + 1, rand(e.s, 6) + 1]
    rollEv(e.s, e.p, mine, mine[0] + mine[1], '')
    for (const q of enemiesOf(e)) {
      const r = rand(e.s, 6) + 1
      rollEv(e.s, q, [r], r, '')
      if (mine.includes(r)) damage(e, q, r)
    }
  },
  // 43 Громобойный
  43: e => { const n = uniqueSigns(e.p); for (let i = 0; i < n; i++) damage(e, randomEnemy(e, e.p), 2) },
  // 44 Отборный
  44: e => { const q = strongest(e, e.p), t = M(e); damage(e, q, [1, 2, 5][t]); if (t >= 1) gainTreasure(e, e.p) },
  // 45 Качковый
  45: e => {
    heal(e, e.p, 2)
    if (alive(e.s).every(q => q.life >= e.p.life)) addFromHand(e, randomHand(e))
  },
  // 46 Мошоночный
  46: e => { for (const q of uniq([leftEnemy(e.s, e.p), rightEnemy(e.s, e.p)])) treasureOrDamage(e, q, true) },
  // 47 От Беня Вуду
  47: e => {
    for (const q of enemiesOf(e)) { const r = rand(e.s, 6) + 1; rollEv(e.s, q, [r], r, ''); damage(e, q, r) }
    const t = chooseTreasure(e, e.p, e.p, 'Сбрось своё сокровище')
    if (t != null) { loseTreasure(e.s, e.p, t); log(e.s, `${e.p.name} сбрасывает сокровище.`) }
  },
  // 48 От сэра Кладомота
  48: e => {
    gainTreasure(e, e.p)
    for (const q of enemiesOf(e)) { const r = rand(e.s, 6) + 1; rollEv(e.s, q, [r], r, ''); if (r === 6) gainTreasure(e, q) }
  },
  // 49 От Магмуда Поджигая
  49: e => {
    if (yesNo(e, e.p, 'От Магмуда Поджигая:', '3 урона левому врагу', '1 урон каждому врагу')) damage(e, leftEnemy(e.s, e.p), 3)
    else hitAll(e, enemiesOf(e), 1)
  },
  // 50 От Мордоеда
  50: e => { e.p.extraDice += 1 },
  // 51 От Горячей Штучки
  51: e => damage(e, strongest(e, e.p), 3),
  // 52 От Профессора Ахалая
  52: e => { damage(e, randomEnemy(e, e.p), 3); if (e.s.turn?.hadWild) gainTreasure(e, e.p) },
  // 53 От Шерочки с Машерочкой
  53: e => { if (e.s.turn) e.s.turn.deliveryAll = true },
  // 54 От Тай Тыфуна
  54: e => hitAll(e, enemiesOf(e).filter(q => q.acted), 3),
  // 55 От Сфинксенона
  55: e => {
    const q = choosePlayer(e, e.p, enemiesOf(e).filter(q => q.treasures.length), 'У кого отжать сокровище?')
    if (!q) return log(e.s, 'Отжимать нечего.')
    moveTreasure(e.s, q, e.p, chooseTreasure(e, e.p, q, 'Какое сокровище отжать?')!)
  },
  // 56 От Бухого Хокера
  56: e => {
    const res = alive(e.s).map(q => { const r = rollOne(e, q); return { q, raw: r.raw, total: r.total + (q === e.p ? uniqueSigns(e.p) : 0) } })
    for (const r of res) rollEv(e.s, r.q, [r.raw], r.total, '')
    const min = Math.min(...res.map(r => r.total))
    hitAll(e, res.filter(r => r.total === min).map(r => r.q), 3)
  },
  // 57 От Розового Бутончика
  57: e => heal(e, e.p, uniqueSigns(e.p)),
  // 58 От Поганого Мерлина
  58: e => { damage(e, strongest(e, e.p), alive(e.s).length); if (e.p.alive) drawDead(e.s, e.p) },
  // 59 От Брадостреля
  59: e => copyCard(e, ['delivery']),
  // 60 От Пыща с Тыдыщем
  60: e => revealAndAdd(e, 4, c => spellOf(c).type === 'source'),
  // 61 От Феечки смерти
  61: e => {
    for (;;) {
      const q = chooseEnemy(e, 'Кому нанести 2 урона?')
      if (!q) return
      damage(e, q, 2)
      if (q.alive) return
    }
  },
  // 62 От д-ра Корнея Дуболома
  62: e => {
    heal(e, e.p, 3)
    for (const q of enemiesOf(e)) { const r = rand(e.s, 6) + 1; rollEv(e.s, q, [r], r, ''); if (r === 6) heal(e, q, 3) }
  },
  // 63 От Зачуханного Комбайна
  63: e => {
    const have = signs(e.p)
    revealAndAdd(e, 2, c => { const sc = spellOf(c).school; return !!sc && have[sc] > 0 })
  },
}

export const cardInfo = (id: CardId): CardInfo => {
  const s = SPELLS[Math.floor(id / 10)]
  return { index: s.index, school: s.school, type: s.type, name: s.name }
}
