// Способности колдунов (transcript/progression.md): у каждого колдуна (портрет 0..40) своя, уровни 1..5.
// Нет p.lvl — способности нет. Счётчики: p.ab — на игру, p.abR — на раунд, p.abT — на турнир.
import { LOOT_BAG } from '../data/extra.ts'
import {
  ab, alive, ask, choosePlayer, chooseHandCard, d6, damage, drawFrom, drawSpell, enemies, giveTreasure, hasMod, heal, hooks, isEternal,
  log, madEv, T, maxLife, moveTreasure, rand, rollEv, spellOf, cardName, type Ctx,
} from './core.ts'
import { TREASURES } from '../data/cards.ts'
import { TRAP, type GameState, type PlayerState } from './types.ts'

export type Rarity = 'common' | 'rare' | 'epic' | 'legend'
export const RARITY_NAME: Record<Rarity, string> = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legend: 'Легендарный' }
export interface Ability { icon: string; name: string; rarity: Rarity; text: (l: number) => string }

// Значения по уровням 1..5
const V = {
  spore: { hits: [1, 1, 2, 2, 99], n: [1, 2, 2, 3, 1] },
  pig: { take: [1, 1, 2, 2, 3], from: [1, 2, 2, 3, 3] },
  koschei: [1, 2, 3, 4, 3],
  angel: { uses: [1, 1, 1, 1, 1], heal: [0, 0, 1, 1, 2] },
  skull: { n: [1, 1, 1, 2, 2] },
  umka: { uses: [1, 1, 2, 2, 3], n: [2, 2, 3, 3, 4] },
  stink: [0, 1, 1, 2, 2],
  zanz: { uses: [1, 1, 2, 2, 3], bonus: [0, 1, 0, 1, 1] },
  borya: [2, 3, 3, 4, 5],
  pies: { uses: [1, 1, 1, 2, 2], n: [2, 3, 3, 3, 4] },
  drama: { life: [5, 6, 6, 8, 8], n: [1, 1, 2, 2, 3] },
  winner: { heal: [1, 1, 2, 2, 2], start: [0, 0, 2, 3, 4] },
  vera: { uses: [1, 1, 2, 2, 3], from: [1, 2, 2, 3, 3] },
  brita: { hits: [1, 1, 2, 2, 3], n: [1, 2, 2, 3, 3] },
  don: { uses: [1, 1, 2, 2, 3], n: [3, 4, 4, 5, 5] },
  meat: { uses: [1, 1, 1, 2, 2], n: [1, 2, 2, 2, 2] },
  stick: { uses: [1, 1, 2, 2, 3], need: [4, 3, 3, 3, 3], n: [2, 2, 2, 3, 3] },
  fairy: [1, 1, 2, 2, 2],
  eye: { uses: [1, 1, 2, 2, 3] },
  moss: [2, 3, 4, 5, 6],
  baron: { uses: [1, 1, 2, 2, 2], heal: [0, 1, 0, 1, 1] },
  ohren: { uses: [1, 1, 2, 2, 3], n: [1, 1, 1, 2, 2] },
  jung: { all: [1, 1, 2, 2, 3], two: [0, 1, 0, 1, 1] },
  granny: { uses: [1, 1, 2, 2, 3], from: [1, 2, 2, 3, 3] },
  metal: [4, 4, 3, 3, 2],
  tickle: { uses: [1, 1, 2, 2, 3], n: [1, 2, 2, 3, 3] },
  flick: { uses: [1, 1, 2, 2, 0], n: [1, 2, 2, 3, 1] },
  booze: { uses: [1, 1, 1, 1, 1], n: [2, 3, 4, 5, 7] },
  swap: { uses: [1, 1, 2, 2, 3] },
  cat: [6, 6, 6, 5, 5],
  laser: { uses: [1, 1, 2, 2, 3], n: [2, 3, 3, 4, 4] },
  admiral: [1, 1, 1, 1, 2],
  dark: { uses: [1, 2, 2, 3, 4] },
  epic: [1, 1, 2, 2, 3],
  smoke: { uses: [2, 2, 3, 4, 5], n: [1, 2, 2, 3, 3] },
  fierce: { kill: [1, 1, 2, 2, 3], medal: [1, 2, 2, 3, 3] },
  horn: { uses: [1, 1, 2, 2, 0], n: [2, 3, 3, 4, 1] },
  hater: [1, 1, 1, 2, 2],
  zah: [1, 1, 2, 2, 3],
  medal: { life: [3, 4, 4, 5, 6], tr: [0, 0, 1, 1, 2] },
  clown: { uses: [1, 1, 2, 2, 3] },
}
const at = (a: number[], l: number) => a[Math.max(0, Math.min(4, l - 1))]
const times = (n: number) => (n >= 99 ? 'каждый раз' : n === 1 ? 'раз за игру' : n === 2 ? 'дважды за игру' : `${n} раза за игру`)

export const ABILITIES: Ability[] = [
  { icon: '🍄', name: 'Споры', rarity: 'common', text: l => (at(V.spore.hits, l) >= 99 ? `Каждый, кто тебя бьёт, теряет ${at(V.spore.n, l)} ❤.` : `Первые ${at(V.spore.hits, l)} удар(а) по тебе за игру: обидчик теряет ${at(V.spore.n, l)} ❤.`) },
  { icon: '🏠', name: 'Хозяйство', rarity: 'common', text: l => `Начинаешь игру с ${at(V.pig.take, l)} сокр.${at(V.pig.from, l) > at(V.pig.take, l) ? ` (выбор из ${at(V.pig.from, l)})` : ''}.` },
  { icon: '🪡', name: 'Бессмертие в игле', rarity: 'legend', text: l => `Подыхая, остаёшься с ${at(V.koschei, l)} ❤ — ${l >= 5 ? 'раз за игру' : 'раз за турнир'}.` },
  { icon: '🪽', name: 'Крылышки', rarity: 'common', text: l => `${times(at(V.angel.uses, l))[0].toUpperCase() + times(at(V.angel.uses, l)).slice(1)} отменяешь удар по себе (от 3 урона или смертельный)${at(V.angel.heal, l) ? ` и лечишь ${at(V.angel.heal, l)}` : ''}.` },
  { icon: '💀', name: 'Мародёр', rarity: 'rare', text: l => `${l >= 3 ? 'Подыхает любой колдун' : 'Добил колдуна'} — забираешь ${at(V.skull.n, l)} его сокр. (${l >= 2 ? 'на выбор' : 'случайно'})${l >= 5 ? ' и 1 ❤ за каждое' : ''}.` },
  { icon: '🐻', name: 'Вдвоём', rarity: 'common', text: l => `${times(at(V.umka.uses, l))[0].toUpperCase() + times(at(V.umka.uses, l)).slice(1)} после хода добираешь ${at(V.umka.n, l)} карт(ы).` },
  { icon: '🪳', name: 'Вонь', rarity: 'rare', text: l => `${l >= 3 ? 'Два последних обидчика' : 'Последний обидчик'} в следующем раунде ходит позже всех${at(V.stink, l) ? ` и −${at(V.stink, l)} к броскам` : ''}.` },
  { icon: '📜', name: 'Заклинатель', rarity: 'epic', text: l => `${times(at(V.zanz.uses, l))[0].toUpperCase() + times(at(V.zanz.uses, l)).slice(1)} заклинание из 3 карт ходит как из 2${at(V.zanz.bonus, l) ? ' и +1 к броскам' : ''}.` },
  { icon: '🥩', name: 'В фарш', rarity: 'common', text: l => `Добив колдуна — лечишь ${at(V.borya, l)}${l === 3 || l === 5 ? ' и берёшь сокровище' : ''}.` },
  { icon: '🥧', name: 'Пирожки', rarity: 'rare', text: l => `В начале хода, ${times(at(V.pies.uses, l))}: лечишь ${at(V.pies.n, l)} любому колдуну.` },
  { icon: '🎭', name: 'Драма', rarity: 'rare', text: l => `При ${at(V.drama.life, l)} ❤ или меньше могучий бросок +${at(V.drama.n, l)}.` },
  { icon: '🏆', name: 'Привычка побеждать', rarity: 'rare', text: l => `Кто-то подох — лечишь ${at(V.winner.heal, l)}.${at(V.winner.start, l) ? ` Выиграв игру, следующую начинаешь с +${at(V.winner.start, l)} ❤.` : ''}` },
  { icon: '🃏', name: 'Небрежность', rarity: 'common', text: l => `После раскрытия, ${times(at(V.vera.uses, l))}: меняешь карту заклинания на карту того же типа из колоды${at(V.vera.from, l) > 1 ? ` (выбор из ${at(V.vera.from, l)})` : ''}.` },
  { icon: '🪒', name: 'Бритва', rarity: 'common', text: l => `Первые ${at(V.brita.hits, l)} удар(а) за игру наносят +${at(V.brita.n, l)}.` },
  { icon: '🛋', name: 'Расслабон', rarity: 'common', text: l => `В начале хода, ${times(at(V.don.uses, l))}: забираешь заклинание в руку и лечишь ${at(V.don.n, l)}.` },
  { icon: '🍖', name: 'Аппетит', rarity: 'rare', text: l => `В начале хода, ${times(at(V.meat.uses, l))}: забираешь у врага ${at(V.meat.n, l)} ❤ себе.` },
  { icon: '🏏', name: 'Палкой по голове', rarity: 'common', text: l => `В начале хода, ${times(at(V.stick.uses, l))}: кубик ${at(V.stick.need, l)}+ — ${at(V.stick.n, l)} урона врагу.` },
  { icon: '🥐', name: 'Сдоба', rarity: 'rare', text: l => `В начале раунда, если у тебя меньше всех ❤${l >= 2 ? ' (или поровну)' : ''}${l >= 4 ? ' или меньше 10' : ''}, лечишь ${at(V.fairy, l)}.` },
  { icon: '👁', name: 'Всевидящее', rarity: 'epic', text: l => `В начале хода, ${times(at(V.eye.uses, l))}: ${l >= 2 ? 'смотришь' : 'наугад выбиваешь'} карту из заклинания ещё не ходившего врага${l >= 2 ? ' и выбиваешь её' : ''}${l >= 4 ? ' себе в руку' : ''}.` },
  { icon: '🌿', name: 'Мох', rarity: 'epic', text: l => `Первые ${at(V.moss, l)} урона от врагов за игру не проходят.` },
  { icon: '☂', name: 'Зонтик', rarity: 'rare', text: l => `${times(at(V.baron.uses, l))[0].toUpperCase() + times(at(V.baron.uses, l)).slice(1)} улетаешь от удара карты «по всем» (от 2 урона)${at(V.baron.heal, l) ? ` и лечишь ${at(V.baron.heal, l)}` : ''}.` },
  { icon: '😱', name: 'Охренеть', rarity: 'rare', text: l => `${times(at(V.ohren.uses, l))[0].toUpperCase() + times(at(V.ohren.uses, l)).slice(1)} докидываешь ${at(V.ohren.n, l)} кубик(а) к могучему броску.` },
  { icon: '🌴', name: 'Джунгли', rarity: 'rare', text: l => `Все карты заклинания одного знака — +${at(V.jung.all, l)} к броску${at(V.jung.two, l) ? `; две из трёх — +${at(V.jung.two, l)}` : ''}.` },
  { icon: '🧁', name: 'Добавка', rarity: 'common', text: l => `${times(at(V.granny.uses, l))[0].toUpperCase() + times(at(V.granny.uses, l)).slice(1)}, получая сокровище, берёшь ещё одно${at(V.granny.from, l) > 1 ? ` (выбор из ${at(V.granny.from, l)})` : ''}.` },
  { icon: '🤘', name: 'Металл', rarity: 'legend', text: l => `Удар врага по тебе — не больше ${at(V.metal, l)}${l === 2 || l === 4 ? '; от карты «по всем» ещё −1' : ''}.` },
  { icon: '🪶', name: 'Щекотка', rarity: 'common', text: l => `В начале хода, ${times(at(V.tickle.uses, l))}: враг сбрасывает ${at(V.tickle.n, l)} случ. карт(ы).` },
  { icon: '👌', name: 'Щелчок', rarity: 'common', text: l => (l >= 5 ? 'В начале каждого раунда щёлкаешь врага на 1 ❤.' : `В начале хода, ${times(at(V.flick.uses, l))}: щелчок врагу на ${at(V.flick.n, l)} ❤.`) },
  { icon: '🍺', name: 'Бухло', rarity: 'common', text: l => `В начале хода, ${times(at(V.booze.uses, l))}: лечишь ${at(V.booze.n, l)}${l >= 3 ? '' : ', но в следующем раунде ходишь последним'}.` },
  { icon: '🔀', name: 'Сунь-хучай', rarity: 'rare', text: l => `В начале хода, ${times(at(V.swap.uses, l))}: меняешься с врагом картой с руки (${l >= 4 ? 'обе выбираешь' : l >= 2 ? 'свою выбираешь' : 'случайные'}).` },
  { icon: '🐈', name: 'Девять жизней', rarity: 'rare', text: l => `Удар врага от 3 урона: на кубике ${at(V.cat, l)}+ он не проходит.` },
  { icon: '🔴', name: 'Лазер', rarity: 'epic', text: l => `В начале хода, ${times(at(V.laser.uses, l))}: первый удар по выбранному врагу +${at(V.laser.n, l)}.` },
  { icon: '⚓', name: 'В тылу', rarity: 'rare', text: l => `Удар карты «по всем» по тебе −${at(V.admiral, l)}${l === 1 || l === 3 ? ', пока живы хотя бы трое' : ''}.` },
  { icon: '🌑', name: 'Тьма', rarity: 'epic', text: l => `${times(at(V.dark.uses, l))[0].toUpperCase() + times(at(V.dark.uses, l)).slice(1)}: кубик врага в могучем броске → 1${l >= 2 ? ' или свой кубик → 6' : ''}.` },
  { icon: '⚔', name: 'Эпичность', rarity: 'rare', text: l => `Заклинание из ${l >= 2 ? '2–3' : '3'} карт — +${at(V.epic, l)} к ${l >= 4 ? 'броскам' : 'первому броску'} хода.` },
  { icon: '💨', name: 'Шмаль', rarity: 'epic', text: l => `${times(at(V.smoke.uses, l))[0].toUpperCase() + times(at(V.smoke.uses, l)).slice(1)}: меняешь ${at(V.smoke.n, l)} худш. кубик(а) на лучшие из прошлого чужого броска.` },
  { icon: '🐺', name: 'Лютость', rarity: 'legend', text: l => `+${at(V.fierce.kill, l)} к броскам за каждого добитого в этой игре; +${at(V.fierce.medal, l)} ❤ за медаль в начале игры.` },
  { icon: '🐏', name: 'Бодание', rarity: 'epic', text: l => (l >= 5 ? 'Каждый удар по тебе — обидчик получает 1 урон.' : `Когда тебя бьют, ${times(at(V.horn.uses, l))}: ответ ${at(V.horn.n, l)} урона.`) },
  { icon: '😤', name: 'Хейт', rarity: 'rare', text: l => `Самый живучий враг${l >= 2 ? ' и лидер по медалям' : ''} получают от тебя +${at(V.hater, l)} урона.` },
  { icon: '🧓', name: 'Опыт', rarity: 'legend', text: l => `На руке ${8 + at(V.zah, l)} карт${l === 2 || l === 4 ? ', и +1 карта в начале игры' : ''}.` },
  { icon: '🥇', name: 'Медаль за терпение', rarity: 'epic', text: l => `Не лидер по медалям (или их ни у кого нет) — начинаешь игру с +${at(V.medal.life, l)} ❤${at(V.medal.tr, l) ? ` и ${at(V.medal.tr, l)} сокр.` : ''}.` },
  { icon: '🤡', name: 'Сюрприз', rarity: 'epic', text: l => `После раскрытия, ${times(at(V.clown.uses, l))}: меняешь ${l >= 4 ? 'любую карту' : 'приход'} заклинания на ${l >= 2 ? 'выбранную' : 'случайную'} с руки.` },
]

// ---------- помощники ----------
const lv = (p: PlayerState, w: number) => (p.lvl && p.portrait === w && !p.boss ? p.lvl : 0)
const cnt = (p: PlayerState, k: string) => p.ab?.[k] ?? 0
const inc = (p: PlayerState, k: string, n = 1) => { (p.ab ??= {})[k] = cnt(p, k) + n }
const left = (p: PlayerState, k: string, max: number) => cnt(p, k) < max
const banner = (s: GameState, p: PlayerState, sub: string) => { const a = ABILITIES[p.portrait]; madEv(s, a.icon, `${p.name}: «${a.name}»!`, sub, p.id) }
const opt = (v: number | string, label: string) => ({ v, label })

// Взять take сокровищ из from верхних (остальные — под низ колоды)
function pickTreasures(ctx: Ctx, p: PlayerState, take: number, from: number, why: string) {
  const { s } = ctx
  const got: number[] = []
  for (let i = 0; i < Math.max(take, from); i++) { const t = drawFrom(s, s.treasureDeck, s.treasureDiscard); if (t != null) got.push(t) }
  for (let k = 0; k < take && got.length; k++) {
    const v = got.length <= take - k ? got[0] : (ask(ctx, {
      player: p.id, prompt: `${why}: выбери сокровище`,
      options: got.map(t => ({ v: t, label: TREASURES[t].name, card: { deck: 'treasures' as const, index: t } })),
    }) as number)
    got.splice(got.indexOf(v), 1)
    giveTreasure(s, p, v)
  }
  s.treasureDeck.unshift(...got)
}

// ---------- начало игры ----------
export function abStartGame(ctx: Ctx) {
  const { s } = ctx
  for (const p of s.players) { p.ab = undefined; p.abR = undefined }
  const top = Math.max(...s.players.map(q => q.medals))
  for (const p of s.players) {
    if (!p.lvl || p.boss) continue
    const l = p.lvl, w = p.portrait
    if (w === 1) pickTreasures(ctx, p, at(V.pig.take, l), at(V.pig.from, l), '«Хозяйство»')
    if (w === 11 && s.lastWinner === p.id && at(V.winner.start, l)) p.life += at(V.winner.start, l)
    if (w === 35 && p.medals) p.life += at(V.fierce.medal, l) * p.medals
    if (w === 38 && (l === 2 || l === 4)) { const c = drawSpell(s); if (c != null) p.hand.push(c) }
    if (w === 38) while (p.hand.length < 8 + at(V.zah, l)) { const c = drawSpell(s); if (c == null) break; p.hand.push(c) }
    if (w === 39 && (top === 0 || p.medals < top)) {
      p.life += at(V.medal.life, l)
      for (let i = 0; i < at(V.medal.tr, l); i++) { const t = drawFrom(s, s.treasureDeck, s.treasureDiscard); if (t != null) giveTreasure(s, p, t) }
    }
    p.life = Math.min(p.life, maxLife(p))
  }
}

// ---------- начало раунда (после добора, до безумных правил) ----------
export function abRound(ctx: Ctx) {
  const { s } = ctx
  for (const p of s.players) p.abR = undefined
  for (const p of s.players) {
    if (!p.alive) continue
    // Дерьмоклоп: обидчики ходят последними
    const foes = (p.ab?.foe1 != null ? [p.ab.foe1] : []).concat(p.ab?.foe2 != null && lv(p, 6) >= 3 ? [p.ab.foe2] : [])
    if (lv(p, 6) && foes.length) {
      for (const id of foes) {
        const q = s.players[id]
        if (!q.alive) continue
        q.goLast = true
        if (at(V.stink, lv(p, 6))) (q.abR ??= {}).stink = at(V.stink, lv(p, 6))
      }
      banner(s, p, `${foes.map(id => s.players[id].name).join(' и ')} воняет — ходит последним.`)
      delete p.ab!.foe1; delete p.ab!.foe2
    }
    if (p.ab?.late) { p.goLast = true; delete p.ab.late }
  }
  const live = alive(s)
  for (const p of live) {
    const l = lv(p, 17)
    if (l && live.length > 1) {
      const min = Math.min(...live.filter(q => q !== p).map(q => q.life))
      if (p.life < min || (l >= 2 && p.life === min) || (l >= 4 && p.life < 10)) { banner(s, p, `+${at(V.fairy, l)} ❤`); heal(ctx, p, at(V.fairy, l)) }
    }
  }
  for (const p of alive(s)) if (lv(p, 26) >= 5) {
    const q = choosePlayer(ctx, p, enemies(s, p), '«Щелчок»: кого щёлкнуть на 1 ❤?')
    if (q) { banner(s, p, `Щелчок по ${q.name}.`); damage(ctx, q, 1) }
  }
}

// Заклинания выложены: Занзабор
export function abBuilt(ctx: Ctx) {
  const { s } = ctx
  for (const p of alive(s)) {
    const l = lv(p, 7)
    if (l && p.spell?.length === 3 && left(p, 'zz', at(V.zanz.uses, l))) {
      inc(p, 'zz'); (p.abR ??= {}).two = 1
      banner(s, p, 'Заклинание из 3 карт ходит как из 2.')
    }
  }
}
export const asTwo = (p: PlayerState) => !!p.abR?.two

// ---------- начало своего хода: активные способности (необязательный вопрос) ----------
export function abTurnStart(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  const l = p.lvl ?? 0, w = p.portrait
  if (!l || p.boss || !p.alive) return
  const foes = enemies(s, p)
  const target = (k: string, uses: number, prompt: string, list = foes, friendly = false) => {
    if (!left(p, k, uses) || !list.length) return null
    const v = ask(ctx, { player: p.id, prompt, optional: true, friendly, options: list.map(q => ({ v: q.id, label: q.name, player: q.id })) })
    if (v == null) return null
    inc(p, k)
    return s.players[v as number]
  }
  if (w === 9) {
    const q = target('use', at(V.pies.uses, l), `«Пирожки»: кому вылечить ${at(V.pies.n, l)} ❤? (можно не сейчас)`, alive(s).filter(q => q.life < maxLife(q)), true)
    if (q) { banner(s, p, `Пирожки для ${q.name}.`); heal(ctx, q, at(V.pies.n, l)) }
  }
  if (w === 14 && p.spell?.length && left(p, 'use', at(V.don.uses, l))) {
    const v = ask(ctx, { player: p.id, prompt: `«Расслабон»: забрать заклинание в руку и вылечить ${at(V.don.n, l)} ❤?`, optional: true, options: [opt(1, 'Расслабиться')] })
    if (v != null) {
      inc(p, 'use')
      for (const c of p.spell) { if (c.id === TRAP) p.treasures.push(T.trap); else p.hand.push(c.id) }
      p.spell = []
      banner(s, p, `Пропускает ход и лечит ${at(V.don.n, l)}.`)
      heal(ctx, p, at(V.don.n, l))
      s.turn!.stage = 'end'
      return
    }
  }
  if (w === 15) {
    const q = target('use', at(V.meat.uses, l), `«Аппетит»: у кого забрать ${at(V.meat.n, l)} ❤?`)
    if (q) { banner(s, p, `Откусывает от ${q.name}.`); const b = q.life; damage(ctx, q, at(V.meat.n, l)); heal(ctx, p, b - Math.max(0, q.life)) }
  }
  if (w === 16) {
    const q = target('use', at(V.stick.uses, l), `«Палкой по голове»: кого огреть (кубик ${at(V.stick.need, l)}+ — ${at(V.stick.n, l)} урона)?`)
    if (q) {
      const r = d6(s)
      rollEv(s, p, [r], r, 'Палкой по голове')
      if (r >= at(V.stick.need, l)) { banner(s, p, `Огрел ${q.name}!`); damage(ctx, q, at(V.stick.n, l)) }
      else log(s, `${p.name} промахивается палкой.`)
    }
  }
  if (w === 18) {
    const list = foes.filter(q => !q.acted && q.spell?.some(c => c.id >= 0))
    const q = target('use', at(V.eye.uses, l), '«Всевидящее»: чьё заклинание подсмотреть?', list)
    if (q) {
      const cards = q.spell!.filter(c => c.id >= 0)
      const id = l >= 2 ? chooseHandCard(ctx, p, `Заклинание ${q.name}. Какую карту выбить?`, cards.map(c => c.id))! : cards[rand(s, cards.length)].id
      q.spell = q.spell!.filter(c => c.id !== id)
      if (l >= 4) p.hand.push(id)
      else s.discard.push(id)
      banner(s, p, `Выбивает ${cardName(id)} из заклинания ${q.name}.`)
    }
  }
  if (w === 25) {
    const q = target('use', at(V.tickle.uses, l), `«Щекотка»: кто сбросит ${at(V.tickle.n, l)} карт(ы)?`, foes.filter(q => q.hand.length))
    if (q) {
      for (let i = 0; i < at(V.tickle.n, l) && q.hand.length; i++) s.discard.push(q.hand.splice(rand(s, q.hand.length), 1)[0])
      banner(s, p, `${q.name} хохочет и роняет карты.`)
    }
  }
  if (w === 26 && l < 5) {
    const q = target('use', at(V.flick.uses, l), `«Щелчок»: кого щёлкнуть на ${at(V.flick.n, l)} ❤?`)
    if (q) { banner(s, p, `Щелчок по ${q.name}.`); damage(ctx, q, at(V.flick.n, l)) }
  }
  if (w === 27 && left(p, 'use', at(V.booze.uses, l)) && p.life < maxLife(p)) {
    const v = ask(ctx, { player: p.id, prompt: `«Бухло»: вылечить ${at(V.booze.n, l)} ❤${l >= 3 ? '' : ' (в следующем раунде ходишь последним)'}?`, optional: true, options: [opt(1, 'Бахнуть')] })
    if (v != null) { inc(p, 'use'); if (l < 3) inc(p, 'late'); banner(s, p, `+${at(V.booze.n, l)} ❤`); heal(ctx, p, at(V.booze.n, l)) }
  }
  if (w === 28 && p.hand.length) {
    const q = target('use', at(V.swap.uses, l), '«Сунь-хучай»: с кем поменяться картой?', foes.filter(q => q.hand.length))
    if (q) {
      const mine = l >= 2 ? chooseHandCard(ctx, p, 'Какую свою карту отдать?')! : p.hand[rand(s, p.hand.length)]
      const theirs = l >= 4 ? chooseHandCard(ctx, p, `Рука ${q.name}: какую карту забрать?`, q.hand)! : q.hand[rand(s, q.hand.length)]
      p.hand = p.hand.filter(x => x !== mine); q.hand = q.hand.filter(x => x !== theirs)
      p.hand.push(theirs); q.hand.push(mine)
      banner(s, p, `Меняется картой с ${q.name}.`)
    }
  }
  if (w === 30) {
    const q = target('use', at(V.laser.uses, l), `«Лазер»: по кому первый удар этого хода +${at(V.laser.n, l)}?`)
    if (q) { s.turn!.laser = { t: q.id, n: at(V.laser.n, l) }; banner(s, p, `Наводит лазер на ${q.name}.`) }
  }
}

// ---------- раскрытие: Вера, Клоун ----------
export function abReveal(ctx: Ctx, p: PlayerState) {
  const { s } = ctx
  const l = p.lvl ?? 0
  if (!l || p.boss || !p.spell) return
  const cards = p.spell.filter(c => c.id >= 0 && !c.done)
  if (p.portrait === 12 && cards.length && left(p, 'use', at(V.vera.uses, l))) {
    const v = chooseHandCard(ctx, p, '«Небрежность»: какую карту заклинания заменить картой того же типа из колоды?', cards.map(c => c.id), true)
    if (v != null) {
      const c = p.spell.find(c => c.id === v)!
      const idx: number[] = []
      for (let i = s.deck.length - 1; i >= 0 && idx.length < at(V.vera.from, l); i--) if (spellOf(s.deck[i]).type === c.slot) idx.push(i)
      if (idx.length) {
        inc(p, 'use')
        const got = idx.map(i => s.deck[i])
        for (const i of idx) s.deck.splice(i, 1) // индексы по убыванию
        const pick = got.length > 1 ? chooseHandCard(ctx, p, 'Какую карту взять в заклинание?', got)! : got[0]
        s.deck.unshift(...got.filter(x => x !== pick))
        s.discard.push(c.id)
        banner(s, p, `${cardName(c.id)} → ${cardName(pick)}.`)
        c.id = pick
      }
    }
  }
  if (p.portrait === 40 && left(p, 'use', at(V.clown.uses, l))) {
    const slots = cards.filter(c => l >= 4 || c.slot === 'delivery')
    const fit = (slot: string) => p.hand.filter(id => spellOf(id).type === slot)
    const can = slots.filter(c => fit(c.slot).length)
    const v = can.length ? chooseHandCard(ctx, p, '«Сюрприз»: какую карту заклинания поменять на карту с руки?', can.map(c => c.id), true) : null
    if (v != null) {
      const c = p.spell.find(c => c.id === v)!
      const hand = fit(c.slot)
      const pick = l >= 2 ? chooseHandCard(ctx, p, 'Какую карту с руки положить?', hand)! : hand[rand(s, hand.length)]
      inc(p, 'use')
      p.hand = p.hand.filter(x => x !== pick); p.hand.push(c.id)
      banner(s, p, `${cardName(c.id)} → ${cardName(pick)}.`)
      c.id = pick
    }
  }
}

// ---------- конец своего хода: Умка ----------
export function abEndTurn(ctx: Ctx, p: PlayerState) {
  const l = lv(p, 5)
  if (!l || !p.alive || !left(p, 'use', at(V.umka.uses, l))) return
  inc(p, 'use')
  for (let i = 0; i < at(V.umka.n, l); i++) { const c = drawSpell(ctx.s); if (c != null) p.hand.push(c) }
  banner(ctx.s, p, `+${at(V.umka.n, l)} карт(ы).`)
}

// ---------- хуки ядра ----------
ab.hand = p => (lv(p, 38) ? at(V.zah, lv(p, 38)) : 0)

ab.gain = (ctx, p) => {
  const l = lv(p, 23)
  if (!l || !left(p, 'use', at(V.granny.uses, l))) return
  inc(p, 'use')
  banner(ctx.s, p, 'Ещё сокровище!')
  pickTreasures(ctx, p, 1, at(V.granny.from, l), '«Добавка»')
}

ab.dmg = (ctx, foe, p, n) => {
  const { s } = ctx
  const t = s.turn, live = alive(s).length
  let l: number
  // усиления от бьющего
  if ((l = lv(foe, 13)) && cnt(foe, 'hits') < at(V.brita.hits, l)) { inc(foe, 'hits'); n += at(V.brita.n, l) }
  if (lv(foe, 30) && t?.laser?.t === p.id) { n += t.laser.n; t.laser = undefined }
  if ((l = lv(foe, 37))) {
    const others = enemies(s, foe), maxL = Math.max(...others.map(q => q.life)), maxM = Math.max(...s.players.map(q => q.medals))
    if (p.life === maxL || (l >= 2 && maxM > 0 && p.medals === maxM)) n += at(V.hater, l)
  }
  // защита цели
  if ((l = lv(p, 31)) && t?.aoe && (l === 2 || l >= 4 || live >= 3)) n -= at(V.admiral, l)
  if ((l = lv(p, 24))) { if (t?.aoe && (l === 2 || l === 4)) n -= 1; n = Math.min(n, at(V.metal, l)) }
  if ((l = lv(p, 20)) && t?.aoe && n >= 2 && left(p, 'use', at(V.baron.uses, l))) {
    inc(p, 'use'); banner(s, p, 'Улетает на зонтике.'); heal(ctx, p, at(V.baron.heal, l)); return 0
  }
  if ((l = lv(p, 19)) && n > 0 && cnt(p, 'moss') < at(V.moss, l)) {
    const k = Math.min(n, at(V.moss, l) - cnt(p, 'moss'))
    inc(p, 'moss', k); n -= k
    log(s, `🌿 Мох ${p.name} гасит ${k} ур.`)
  }
  if ((l = lv(p, 29)) && n >= 3) {
    const r = d6(s)
    rollEv(s, p, [r], r, 'Девять жизней')
    if (r >= at(V.cat, l)) { banner(s, p, `Увернулся от ${n} ур.`); return 0 }
  }
  if ((l = lv(p, 3)) && n > 0 && (n >= 3 || n >= p.life) && left(p, 'use', at(V.angel.uses, l))) {
    const v = ask(ctx, { player: p.id, prompt: `Тебе прилетает ${n} ур. «Крылышки»: отменить удар?`, optional: true, options: [opt(1, 'Закрыться крыльями')] })
    if (v != null) { inc(p, 'use'); banner(s, p, `Удар на ${n} отменён.`); heal(ctx, p, at(V.angel.heal, l)); return 0 }
  }
  return Math.max(0, n)
}

ab.hit = (ctx, foe, p, n) => {
  const { s } = ctx
  let l: number
  if ((l = lv(p, 6))) { if (p.ab?.foe1 !== foe.id) { if (p.ab?.foe1 != null) p.ab!.foe2 = p.ab!.foe1; (p.ab ??= {}).foe1 = foe.id } }
  if ((l = lv(p, 0)) && cnt(p, 'spore') < at(V.spore.hits, l)) {
    inc(p, 'spore')
    log(s, `🍄 Споры ${p.name} летят в ${foe.name}.`)
    damage(ctx, foe, at(V.spore.n, l))
  }
  if (!foe.alive) return
  if ((l = lv(p, 36)) && p.alive) {
    if (l >= 5) { log(s, `🐏 ${p.name} бодает ${foe.name}.`); damage(ctx, foe, 1) }
    else if (left(p, 'use', at(V.horn.uses, l))) {
      const v = ask(ctx, { player: p.id, prompt: `${foe.name} бьёт тебя на ${n}. «Бодание»: ответить ${at(V.horn.n, l)} урона?`, optional: true, options: [opt(1, 'Боднуть')] })
      if (v != null) { inc(p, 'use'); banner(s, p, `Бодает ${foe.name}!`); damage(ctx, foe, at(V.horn.n, l)) }
    }
  }
}

ab.save = (ctx, p) => {
  const l = lv(p, 2)
  if (!l) return false
  const box = l >= 5 ? (p.ab ??= {}) : (p.abT ??= {})
  if (box.needle) return false
  box.needle = 1
  p.life = hooks.noHeal?.(ctx, p) ? 1 : at(V.koschei, l) // Горгонорея: накрутить нельзя — на последнем издыхании
  banner(ctx.s, p, `Смерть в игле — остаётся с ${p.life} ❤.`)
  return true
}

ab.death = (ctx, p, killer) => {
  const { s } = ctx
  const loot = () => p.treasures.filter(t => !isEternal(t))
  if (killer?.alive) {
    inc(killer, 'kills')
    if (hasMod(s, 'loot') && loot().length) {
      madEv(s, '💰', 'Мародёрство!', `${killer.name} обчищает ${p.name}.`, killer.id)
      for (const t of loot()) moveTreasure(s, p, killer, t)
    }
    if (killer.treasures.includes(LOOT_BAG) && loot().length) {
      const list = loot()
      const t = list.length > 1 ? (ask(ctx, {
        player: killer.id, prompt: `«Мешок мародёра»: что забрать у ${p.name}?`,
        options: list.map(t => ({ v: t, label: TREASURES[t].name, card: { deck: 'treasures' as const, index: t } })),
      }) as number) : list[0]
      moveTreasure(s, p, killer, t)
      banner(s, killer, `Мешок мародёра: ${TREASURES[t].name}.`)
    }
    const l = lv(killer, 8)
    if (l) {
      banner(s, killer, `+${at(V.borya, l)} ❤`)
      heal(ctx, killer, at(V.borya, l))
      if (l === 3 || l === 5) { const t = drawFrom(s, s.treasureDeck, s.treasureDiscard); if (t != null) giveTreasure(s, killer, t) }
    }
  }
  for (const q of alive(s)) {
    if (q === p) continue
    let l = lv(q, 4)
    if (l && loot().length && (q === killer || l >= 3)) {
      let got = 0
      for (let i = 0; i < at(V.skull.n, l) && loot().length; i++) {
        const list = loot()
        const t = l >= 2 && list.length > 1 ? (ask(ctx, {
          player: q.id, prompt: `«Мародёр»: что забрать у ${p.name}?`,
          options: list.map(t => ({ v: t, label: TREASURES[t].name, card: { deck: 'treasures' as const, index: t } })),
        }) as number) : list[rand(s, list.length)]
        moveTreasure(s, p, q, t); got++
      }
      if (got) banner(s, q, `Обчищает ${p.name}.`)
      if (got && l >= 5) heal(ctx, q, got)
    }
    if ((l = lv(q, 11))) heal(ctx, q, at(V.winner.heal, l))
  }
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
ab.dice = (ctx, p, dice, name) => {
  const { s } = ctx
  let l: number
  if ((l = lv(p, 21)) && left(p, 'use', at(V.ohren.uses, l))) {
    const v = ask(ctx, { player: p.id, prompt: `«${name}»: ${dice.join('+')}. «Охренеть»: докинуть ${at(V.ohren.n, l)} кубик(а)?`, optional: true, hint: sum(dice) < 3.5 * dice.length ? 1 : null, options: [opt(1, 'Докинуть')] })
    if (v != null) { inc(p, 'use'); for (let i = 0; i < at(V.ohren.n, l); i++) dice.push(d6(s)); banner(s, p, `Докидывает: ${dice.join('+')}.`) }
  }
  const prev = s.lastRoll
  if ((l = lv(p, 34)) && prev && prev.player !== p.id && left(p, 'use', at(V.smoke.uses, l))) {
    const best = [...prev.dice].sort((a, b) => b - a), mine = [...dice].sort((a, b) => a - b)
    if (best[0] > mine[0]) {
      const v = ask(ctx, { player: p.id, prompt: `«${name}»: ${dice.join('+')}. «Шмаль»: поменять худшие кубики на ${best.slice(0, at(V.smoke.n, l)).join(', ')} из броска ${s.players[prev.player].name}?`, optional: true, hint: best[0] - mine[0] >= 2 ? 1 : null, options: [opt(1, 'Подменить')] })
      if (v != null) {
        inc(p, 'use')
        for (let k = 0; k < at(V.smoke.n, l) && k < best.length; k++) {
          const i = dice.indexOf(Math.min(...dice))
          if (best[k] > dice[i]) dice[i] = best[k]
        }
        banner(s, p, `Подменяет кубики: ${dice.join('+')}.`)
      }
    }
  }
  if ((l = lv(p, 32)) >= 2 && left(p, 'use', at(V.dark.uses, l)) && dice.some(d => d < 6)) {
    const v = ask(ctx, { player: p.id, prompt: `«${name}»: ${dice.join('+')}. «Тьма»: перевернуть кубик на 6?`, optional: true, hint: Math.min(...dice) <= 2 ? dice.indexOf(Math.min(...dice)) : null, options: dice.map((d, i) => opt(i, `Кубик ${d}`)).filter((_, i) => dice[i] < 6) })
    if (v != null) { inc(p, 'use'); dice[v as number] = 6; banner(s, p, `Кубик → 6: ${dice.join('+')}.`) }
  }
  for (const q of alive(s)) {
    if (q === p || !(l = lv(q, 32)) || !left(q, 'use', at(V.dark.uses, l)) || !dice.some(d => d >= 3)) continue
    const v = ask(ctx, { player: q.id, prompt: `${p.name}, «${name}»: ${dice.join('+')}. «Тьма»: перевернуть кубик на 1?`, optional: true, hint: Math.max(...dice) >= 5 ? dice.indexOf(Math.max(...dice)) : null, options: dice.map((d, i) => opt(i, `Кубик ${d}`)).filter((_, i) => dice[i] >= 3) })
    if (v != null) { inc(q, 'use'); dice[v as number] = 1; banner(s, q, `Кубик ${p.name} → 1: ${dice.join('+')}.`) }
  }
}

ab.bonus = (ctx, p) => {
  const { s } = ctx
  const t = s.turn
  const first = !t || t.actor !== p.id || !t.rolls
  if (t && t.actor === p.id) t.rolls = (t.rolls ?? 0) + 1
  let b = -(p.abR?.stink ?? 0), l: number
  if ((l = lv(p, 10)) && p.life <= at(V.drama.life, l)) b += at(V.drama.n, l)
  if ((l = lv(p, 7)) && p.abR?.two) b += at(V.zanz.bonus, l)
  if ((l = lv(p, 35))) b += at(V.fierce.kill, l) * cnt(p, 'kills')
  const sp = (p.spell ?? []).filter(c => c.id >= 0)
  if ((l = lv(p, 33)) && (sp.length === 3 || (l >= 2 && sp.length === 2)) && (first || l >= 4)) b += at(V.epic, l)
  if ((l = lv(p, 22)) && sp.length >= 2) {
    const sc = sp.map(c => spellOf(c.id).school).filter(x => x)
    const k = Math.max(0, ...sc.map(x => sc.filter(y => y === x).length))
    if (sc.length === sp.length && k === sp.length) b += at(V.jung.all, l)
    else if (k >= 2) b += at(V.jung.two, l)
  }
  return b
}

