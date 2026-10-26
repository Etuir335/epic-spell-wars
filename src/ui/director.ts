// Режиссёр: проигрывает события движка по одному (сцена + звуки + эффекты) и знает, что уже показано.
import { useEffect, useRef, useState } from 'react'
import { SPELLS, TREASURES, type School } from '../data/cards'
import type { CardId, Ev, GameState } from '../game/types'
import { SCHOOL_COLOR, floater, glow, projectile, shake } from './fx'
import { sfx } from './sound'

export interface SceneCard { key: string; id: CardId | null; up: boolean; on?: boolean; done?: boolean; flash?: number; added?: boolean }
export interface Scene {
  caster: number | null
  cards: SceneCard[]
  title: string | null
  titleKey: number
  roll: (Extract<Ev, { k: 'roll' }> & { key: number }) | null
  banner: { text: string; sub?: string; key: number; kind: string } | null
  ticker: string
  school: School | null
  counts: number[] | null
}
export const emptyScene = (): Scene => ({ caster: null, cards: [], title: null, titleKey: 0, roll: null, banner: null, ticker: '', school: null, counts: null })

const spellOf = (id: CardId) => (id < 0 ? null : SPELLS[Math.floor(id / 10)])
const FILLERS = ['ахалай-махалай', 'ляськи-масяськи', 'пенсионный фонд', 'крибле-крабле-бумс']
const low = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

// Название заклинания по правилам: наворот + приход + заводила.
export function spellTitle(ids: (CardId | null)[], casterName: string, seed: number): string {
  const cs = ids.map(id => (id == null ? null : spellOf(id))).filter(c => c && c.type !== 'wild')
  const q = cs.filter(c => c!.type === 'quality').map(c => c!.name)
  const d = cs.filter(c => c!.type === 'delivery').map(c => c!.name)
  const s = cs.filter(c => c!.type === 'source').map(c => c!.name)
  const parts = [...q, ...(d.length ? d.map((x, i) => (q.length || i ? low(x) : x)) : [q.length ? FILLERS[seed % FILLERS.length] : FILLERS[seed % FILLERS.length].replace(/^./, m => m.toUpperCase())])]
  const tail = s.length ? s.map(low).join(' и ') : `от ${casterName}`
  return `${parts.join(' ')} ${tail}!`
}

// Сцена после события (без звуков) — для пропуска и пересчёта.
export function applyScene(sc: Scene, e: Ev, s: GameState): Scene {
  const name = (p: number) => s.players[p]?.name ?? '?'
  switch (e.k) {
    case 'log': return { ...sc, ticker: e.t }
    case 'game': return { ...emptyScene(), banner: { text: `Игра ${e.n}`, sub: 'Турнир на горе Черепламени', key: Math.random(), kind: 'game' } }
    case 'round': return { ...emptyScene(), banner: { text: `Раунд ${e.n}`, sub: 'Собирайте заклинания!', key: Math.random(), kind: 'round' } }
    case 'built': return { ...sc, counts: e.counts, banner: { text: 'Заклинания выложены!', sub: 'Кто быстрее — тот первый', key: Math.random(), kind: 'built' } }
    case 'turn': return {
      ...sc, caster: e.p, title: null, roll: null, banner: null, school: null,
      cards: Array.from({ length: e.n }, (_, i) => ({ key: `c${i}`, id: null, up: false })),
    }
    case 'reveal': {
      const cards = e.cards.map((id, i) => ({ key: `c${i}`, id, up: true }))
      return { ...sc, caster: e.p, cards, title: spellTitle(e.cards, name(e.p), e.p + s.round), titleKey: Math.random() }
    }
    case 'wild': {
      const i = sc.cards.findIndex(c => c.id === e.from)
      const cards = [...sc.cards]
      if (i >= 0) cards[i] = { ...cards[i], id: e.to, flash: Math.random() }
      return { ...sc, cards, title: spellTitle(cards.map(c => c.id), name(e.p), e.p + s.round) }
    }
    case 'add': {
      if (sc.caster !== e.p) return sc
      const cards = [...sc.cards, { key: `a${sc.cards.length}-${e.id}`, id: e.id, up: true, added: true }]
      return { ...sc, cards }
    }
    case 'card': {
      const cards = sc.cards.map(c => (c.on && !c.done ? { ...c, done: true } : c))
      const i = cards.findIndex(c => c.id === e.id && !c.done)
      if (i >= 0) cards[i] = { ...cards[i], on: true }
      return { ...sc, cards, roll: null, school: spellOf(e.id)?.school ?? null }
    }
    case 'roll': return { ...sc, roll: { ...e, key: Math.random() } }
    case 'end': return { ...sc, cards: sc.cards.map(c => ({ ...c, on: false, done: true })), roll: null }
    case 'over': {
      const w = e.winner >= 0 ? name(e.winner) : null
      return { ...sc, banner: { text: w ? `${w} — недобитый колдун!` : 'Все сдохли!', sub: e.champion ? 'Победа в турнире!' : '🏅', key: Math.random(), kind: 'over' } }
    }
    default: return sc
  }
}

// Длительность показа события (мс).
function duration(e: Ev, sc: Scene): number {
  switch (e.k) {
    case 'log': return e.t.startsWith('✦') || e.t.startsWith('▶') || e.t.startsWith('🎲') ? 0 : 320
    case 'game': return 1600
    case 'round': return 1300
    case 'built': return 1200
    case 'turn': return 1000
    case 'reveal': return e.cards.length * 480 + 1900
    case 'wild': return 1100
    case 'add': return 800
    case 'card': return 950
    case 'roll': return e.card != null ? 1900 : 1000
    case 'dmg': return e.from != null && e.from !== e.p ? 750 : 600
    case 'heal': return 650
    case 'death': return 1400
    case 'treasure': return 700
    case 'lose': return 350
    case 'dead': return 500
    case 'end': return 450
    case 'over': return 1800
  }
  void sc
  return 300
}

// Звуки и эффекты события.
function play(e: Ev, sc: Scene) {
  const color = sc.school ? SCHOOL_COLOR[sc.school] : '#ffcf4a'
  switch (e.k) {
    case 'game': case 'round': sfx.round(); break
    case 'built': sfx.boom(); break
    case 'turn': sfx.deal(); glow(e.p, '#ffcf4a'); break
    case 'reveal': e.cards.forEach((_, i) => setTimeout(sfx.flip, 300 + i * 480)); setTimeout(sfx.boom, 300 + e.cards.length * 480 + 150); break
    case 'wild': sfx.zap(); break
    case 'add': sfx.place(); break
    case 'card': sfx.chime(); break
    case 'roll': sfx.dice(); if (e.card != null) setTimeout(sfx.bigRoll, 700); break
    case 'dmg': {
      const fly = e.from != null && e.from !== e.p
      const t = fly ? projectile(e.from!, e.p, color, 0) : 0
      if (fly) sfx.zap()
      setTimeout(() => { sfx.hit(); shake(e.p, 0, e.n >= 4); floater(e.p, `−${e.n}`, e.n >= 5 ? 'big dmg' : 'dmg') }, t)
      break
    }
    case 'heal': sfx.heal(); floater(e.p, `+${e.n}`, 'heal'); glow(e.p, '#5be35b'); break
    case 'death': sfx.death(); floater(e.p, '☠', 'skull', 150); shake(e.p, 0, true); break
    case 'treasure':
      if (e.from != null) projectile(e.from, e.p, '#ffd84a', 0, '💰')
      setTimeout(() => { sfx.coin(); floater(e.p, '💰 ' + TREASURES[e.t].name, 'coin') }, e.from != null ? 420 : 0)
      break
    case 'lose': floater(e.p, '−💰', 'lose'); break
    case 'dead': floater(e.p, '🪦', 'skull'); break
    case 'over': sfx.fanfare(); break
  }
}

export function useDirector(s: GameState) {
  const end = s.evBase + s.ev.length
  const [pos, setPos] = useState(end)
  const [scene, setScene] = useState<Scene>(emptyScene)
  const [fast, setFast] = useState(false)
  const sceneRef = useRef(scene)
  sceneRef.current = scene
  const p = Math.max(pos, s.evBase)

  const played = useRef(-1)
  useEffect(() => {
    if (p >= end) return
    const e = s.ev[p - s.evBase]
    let sc = sceneRef.current
    if (played.current !== p) { // каждое событие — один раз, даже если состояние обновилось во время показа
      played.current = p
      sc = applyScene(sc, e, s)
      play(e, sc)
      setScene(sc)
    }
    const t = setTimeout(() => setPos(p + 1), duration(e, sc) * (fast ? 0.35 : 1))
    return () => clearTimeout(t)
  }, [p, end, fast, s])

  const skip = () => {
    let sc = sceneRef.current
    for (let i = p; i < end; i++) sc = applyScene(sc, s.ev[i - s.evBase], s)
    setScene({ ...sc, banner: null })
    setPos(end)
  }
  return { pos: p, done: p >= end, scene, skip, fast, setFast }
}

// Жизни/живость «как на экране»: откатываем ещё не показанные события.
export function shownLives(s: GameState, pos: number): { life: number; alive: boolean }[] {
  const out = s.players.map(p => ({ life: p.life, alive: p.alive }))
  const later = s.ev.slice(Math.max(0, pos - s.evBase))
  if (later.some(e => e.k === 'game')) return out
  const seen = new Set<number>()
  for (const e of later) {
    if (e.k === 'death') out[e.p].alive = true
    if ((e.k === 'dmg' || e.k === 'heal') && !seen.has(e.p)) { seen.add(e.p); out[e.p].life = e.before }
  }
  return out
}
