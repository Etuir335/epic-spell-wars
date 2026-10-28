// Статистика игрока, звания и достижения. Считается по событиям движка (s.ev) — только за «своего» колдуна:
// в сетевой игре — своё место, в локальной — первый человек за столом. Хранится на устройстве и в облаке Telegram.
import { spellOf } from './game/core.ts'
import type { Ev, GameState } from './game/types.ts'
import { ARENAS, arenaOf, cupsFor } from './arenas.ts'

export interface Stats {
  games: number // схваток сыграно
  wins: number // схваток выиграно (медалей)
  tournaments: number
  champion: number // турниров выиграно
  netGames: number // схваток по сети с живыми людьми
  netWins: number
  kills: number
  deaths: number
  dealt: number // урона врагам
  taken: number
  healed: number
  spells: number // заклинаний открыто
  treasures: number // сокровищ получено
  bestHit: number // самый сильный удар по врагу
  bestRoll: number // лучший могучий бросок
  cards: Record<number, number> // сколько раз сыграна карта (индекс заклинания)
  ach: Record<string, number> // достижение → когда получено
  cups: number // кубки (арены)
  arena: number // самая высокая достигнутая арена (ниже её порога кубки не падают)
  arenaSkip?: boolean // «Я опытный»: все арены открыты
  arenaSeen: number // до какой арены показано вступление
  winDay?: string // день первой победы (бонус +50)
  dailyCupDay?: string // день, когда начислены кубки за испытание
  at: number // когда менялась (для выбора между устройством и облаком)
}

export const emptyStats = (): Stats => ({
  games: 0, wins: 0, tournaments: 0, champion: 0, netGames: 0, netWins: 0, kills: 0, deaths: 0, dealt: 0, taken: 0, healed: 0,
  spells: 0, treasures: 0, bestHit: 0, bestRoll: 0, cards: {}, ach: {}, cups: 0, arena: 0, arenaSeen: 0, at: 0,
})

// ---------- звания ----------
export const xpOf = (s: Stats) => s.games * 2 + s.wins * 10 + s.champion * 30 + s.kills * 3 + s.netWins * 10 + Object.keys(s.ach).length * 5
export const RANKS: { xp: number; name: string; icon: string }[] = [
  { xp: 0, name: 'Ученик', icon: '🕯️' },
  { xp: 60, name: 'Подмастерье', icon: '📜' },
  { xp: 180, name: 'Чародей', icon: '🔮' },
  { xp: 400, name: 'Колдун', icon: '🧙' },
  { xp: 800, name: 'Боевой маг', icon: '⚡' },
  { xp: 1400, name: 'Архимаг', icon: '🔥' },
  { xp: 2400, name: 'Великий боевой маг горы Черепламени', icon: '💀' },
]
export function rankOf(s: Stats) {
  const xp = xpOf(s)
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++
  return { ...RANKS[i], level: i, xp, xp0: RANKS[i].xp, next: RANKS[i + 1] ?? null }
}

// ---------- достижения ----------
export const ACHIEVEMENTS: { id: string; icon: string; name: string; text: string }[] = [
  { id: 'firstBlood', icon: '🩸', name: 'Первая кровь', text: 'Прикончить врага' },
  { id: 'firstMedal', icon: '🏅', name: 'Недобитый', text: 'Выиграть схватку' },
  { id: 'champion', icon: '👑', name: 'Великий боевой маг', text: 'Выиграть турнир' },
  { id: 'double', icon: '✌️', name: 'Дуплет', text: 'Прикончить двоих одним заклинанием' },
  { id: 'massacre', icon: '☠️', name: 'Резня', text: 'Прикончить троих одним заклинанием' },
  { id: 'bigHit', icon: '💥', name: 'Сокрушитель', text: 'Снести врагу 10+ жизней одним ударом' },
  { id: 'bigRoll', icon: '🎲', name: 'Могучий бросок', text: 'Выбросить 15+ в могучем броске' },
  { id: 'quick', icon: '⚡', name: 'Шустрый', text: 'Прикончить врага заклинанием из одной карты' },
  { id: 'mono', icon: '🌀', name: 'Чистая школа', text: 'Открыть заклинание из трёх карт одного знака' },
  { id: 'edge', icon: '😰', name: 'На волоске', text: 'Выиграть схватку, когда осталось 1–3 жизни' },
  { id: 'flawless', icon: '🛡️', name: 'Без царапины', text: 'Выиграть схватку, не получив урона' },
  { id: 'phoenix', icon: '🐦‍🔥', name: 'Восставший', text: 'Выиграть схватку после смерти в прошлой' },
  { id: 'hoarder', icon: '💰', name: 'Сокровищница', text: 'Держать 5 сокровищ сразу' },
  { id: 'medic', icon: '🧪', name: 'Живучий', text: 'Вылечить 10 жизней за одну схватку' },
  { id: 'oops', icon: '🤦', name: 'Сам себе враг', text: 'Погибнуть от своего же заклинания' },
  { id: 'netWin', icon: '🌐', name: 'Гроза сети', text: 'Выиграть схватку против живых людей' },
  { id: 'tamer', icon: '🤖', name: 'Укротитель ботов', text: 'Выиграть турнир у сильных ботов' },
  { id: 'veteran', icon: '🎖️', name: 'Ветеран', text: 'Сыграть 50 схваток' },
  { id: 'slayer', icon: '⚔️', name: 'Палач', text: 'Прикончить 100 врагов' },
]

// Ход разбора: что важно помнить между событиями (сохраняется вместе с позицией)
export interface Track {
  tid: number
  pos: number // абсолютный номер следующего непрочитанного события
  hitBy: Record<number, number> // кто последним ранил колдуна
  actor: number // чей сейчас ход
  size: number // сколько карт в заклинании ходящего
  turnKills: number // моих убийств за этот ход
  gameTaken: number
  gameHealed: number
  life: number // мои жизни сейчас (−1 — урона в этой схватке не было)
  diedThis: boolean
  diedLast: boolean
  order: number[] // кто в каком порядке погиб в этой схватке (для места)
}
export const newTrack = (tid: number, pos: number): Track =>
  ({ tid, pos, hitBy: {}, actor: -1, size: 0, turnKills: 0, gameTaken: 0, gameHealed: 0, life: -1, diedThis: false, diedLast: false, order: [] })

export interface Seat { me: number; vsHumans: boolean; strongBots: boolean; ranked?: boolean }

// Разобрать новые события. Меняет st и tr, возвращает новые достижения.
export function applyEvents(st: Stats, tr: Track, evs: Ev[], s: GameState, seat: Seat): string[] {
  const { me } = seat
  const got: string[] = []
  const award = (id: string) => { if (!st.ach[id]) { st.ach[id] = Date.now(); got.push(id) } }
  for (const e of evs) {
    switch (e.k) {
      case 'game':
        tr.hitBy = {}; tr.gameTaken = 0; tr.gameHealed = 0; tr.life = -1; tr.diedLast = tr.diedThis; tr.diedThis = false; tr.order = []
        break
      case 'turn':
        tr.actor = e.p; tr.size = e.n; tr.turnKills = 0
        break
      case 'reveal':
        if (e.p !== me) break
        st.spells++
        for (const id of e.cards) if (id >= 0) { const k = Math.floor(id / 10); st.cards[k] = (st.cards[k] ?? 0) + 1 }
        if (e.cards.length === 3) {
          const sc = e.cards.map(id => (id >= 0 ? spellOf(id).school : null))
          if (sc[0] && sc.every(x => x === sc[0])) award('mono')
        }
        break
      case 'roll':
        if (e.p === me && e.dice.length > 0) { st.bestRoll = Math.max(st.bestRoll, e.total); if (e.total >= 15) award('bigRoll') }
        break
      case 'dmg':
        if (e.from != null) tr.hitBy[e.p] = e.from
        if (e.p === me) { st.taken += e.n; tr.gameTaken += e.n; tr.life = e.after }
        else if (e.from === me) {
          const real = e.before - e.after
          st.dealt += real
          st.bestHit = Math.max(st.bestHit, real)
          if (real >= 10) award('bigHit')
        }
        break
      case 'heal':
        if (e.p === me) { tr.life = e.after; const n = e.after - e.before; st.healed += n; tr.gameHealed += n; if (tr.gameHealed >= 10) award('medic') }
        break
      case 'death':
        (tr.order ??= []).push(e.p)
        if (e.p === me) {
          st.deaths++; tr.diedThis = true
          if (tr.hitBy[me] === me) award('oops')
        } else if (tr.hitBy[e.p] === me) {
          st.kills++; award('firstBlood')
          if (st.kills >= 100) award('slayer')
          if (tr.actor === me) {
            tr.turnKills++
            if (tr.turnKills >= 2) award('double')
            if (tr.turnKills >= 3) award('massacre')
            if (tr.size === 1) award('quick')
          }
        }
        break
      case 'treasure':
        if (e.p === me) {
          st.treasures++
          if ((s.players[me]?.treasures.length ?? 0) >= 5) award('hoarder')
        }
        break
      case 'over': {
        if (seat.ranked) {
          const n = s.players.length, idx = (tr.order ?? []).indexOf(me)
          const place = e.winner === me ? 1 : idx >= 0 ? n - idx : 2
          let d = cupsFor(place, n, seat.vsHumans)
          const day = new Date().toDateString()
          if (e.winner === me && st.winDay !== day) { st.winDay = day; d += 50 }
          got.push(...addCups(st, d))
        }
        st.games++
        if (seat.vsHumans) st.netGames++
        if (st.games >= 50) award('veteran')
        if (e.winner === me) {
          st.wins++; award('firstMedal')
          if (seat.vsHumans) { st.netWins++; award('netWin') }
          if (tr.life >= 1 && tr.life <= 3) award('edge')
          if (tr.gameTaken === 0) award('flawless')
          if (tr.diedLast) award('phoenix')
        }
        if (e.champion) {
          st.tournaments++
          if (e.winner === me) { st.champion++; award('champion'); if (seat.strongBots) award('tamer') }
        }
        break
      }
    }
  }
  if (got.length || evs.length) st.at = Date.now()
  return got
}

// Любимая карта — сыгранная чаще всех
export function favoriteCard(st: Stats): { index: number; n: number } | null {
  let best: { index: number; n: number } | null = null
  for (const [k, n] of Object.entries(st.cards)) if (!best || n > best.n) best = { index: Number(k), n }
  return best
}

// Начислить кубки (не ниже порога достигнутой арены). Возвращает отметки для всплывашек: кубки и новую арену.
export function addCups(st: Stats, d: number): string[] {
  st.cups ??= 0; st.arena ??= 0
  st.cups = Math.max(ARENAS[st.arena].cups, st.cups + d)
  const out = [`cups:${d}`]
  const a = arenaOf(st.cups)
  if (a > st.arena) { st.arena = a; out.push(`arena:${a}`) }
  st.at = Date.now()
  return out
}
