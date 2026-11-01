// История матчей: журнал каждой партии на устройстве (последние 12), с пометкой игры, раунда и чьего хода —
// чтобы потом найти спорный момент и пожаловаться. Пишется по настоящему состоянию, не по показу.
import { useEffect, useRef } from 'react'
import type { CardId, GameState } from './game/types'
import { cardName } from './game/core'

// строка журнала: игра, раунд, номер хода в партии (-1 — вне хода), кто ходит, текст; у открытия — карты
export interface Entry { g: number; r: number; u: number; a: number; t: string; c?: CardId[] }
export interface Match {
  id: string; tid: number; at: number; upd: number; mode: string
  names: string[]; portraits: number[]; bots: boolean[]; me: number
  pos: number; g: number; r: number; u: number; a: number // докуда разобраны события
  entries: Entry[]
}

const KEY = 'esw-history', MAX = 12, MAX_ENTRIES = 5000
let list: Match[] = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Match[] } catch { return [] } })()
let timer = 0
const save = () => { clearTimeout(timer); timer = window.setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { list = list.slice(0, Math.max(1, list.length - 3)) } }, 1500) }

export const matches = () => list
export const matchById = (id: string) => list.find(m => m.id === id)

export function recordMatch(s: GameState, me: number, mode: string) {
  const id = String(s.tid ?? 0)
  let m = list.find(x => x.id === id)
  if (!m) {
    m = { id, tid: s.tid ?? 0, at: Date.now(), upd: Date.now(), mode, names: s.players.map(p => p.name), portraits: s.players.map(p => p.portrait), bots: s.players.map(p => !!p.bot), me, pos: 0, g: s.game, r: s.round, u: -1, a: -1, entries: [] }
    list = [m, ...list].slice(0, MAX)
  }
  const end = s.evBase + s.ev.length
  if (m.pos >= end) return
  for (let i = Math.max(m.pos, s.evBase); i < end; i++) {
    const e = s.ev[i - s.evBase]
    const push = (t: string, c?: CardId[]) => m.entries.push({ g: m.g, r: m.r, u: m.u, a: m.a, t, ...(c ? { c } : {}) })
    if (e.k === 'game') { m.g = e.n; m.r = 0; m.a = -1 }
    else if (e.k === 'round') { m.r = e.n; m.a = -1 }
    else if (e.k === 'turn') { m.a = e.p; m.u++ }
    else if (e.k === 'reveal') push(`${s.players[e.p]?.name ?? '?'} открывает: ${e.cards.map(cardName).join(' + ') || 'ничего'}`, e.cards)
    else if (e.k === 'log' && e.t !== m.entries[m.entries.length - 1]?.t + '.') push(e.t) // строка «открывает» уже есть от reveal
  }
  if (m.entries.length > MAX_ENTRIES) m.entries.splice(0, m.entries.length - MAX_ENTRIES)
  m.pos = end; m.upd = Date.now()
  m.names = s.players.map(p => p.name) // сетевые места могут смениться (бот вместо ушедшего)
  save()
}

export function useMatchRecorder(s: GameState, me: number, mode: string) {
  const meRef = useRef(me); meRef.current = me
  useEffect(() => { recordMatch(s, meRef.current, mode) }, [s, mode])
}
