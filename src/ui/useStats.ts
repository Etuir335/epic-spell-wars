// Статистика: хранение (устройство + облако Telegram) и разбор событий партии по мере показа.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { GameState } from '../game/types'
import { ACHIEVEMENTS, applyEvents, emptyStats, newTrack, type Seat, type Stats, type Track } from '../stats'
import { cloudGet, cloudSet } from '../telegram'

const KEY = 'esw-stats', TRACKS = 'esw-stats-tracks', CLOUD_KEY = 'stats'

function read<T>(k: string, d: T): T { try { const r = localStorage.getItem(k); return r ? { ...d, ...(JSON.parse(r) as T) } : d } catch { return d } }
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* не важно */ } }

let stats: Stats = read(KEY, emptyStats())
const subs = new Set<() => void>()
const notify = () => { stats = { ...stats }; subs.forEach(f => f()) }
let cloudTimer = 0
function commit() {
  write(KEY, stats)
  notify()
  clearTimeout(cloudTimer)
  cloudTimer = window.setTimeout(() => void cloudSet(CLOUD_KEY, JSON.stringify(stats)), 1500)
}
// при старте: в облаке свежее (другое устройство) — берём его
void cloudGet(CLOUD_KEY).then(v => {
  if (!v) return
  try {
    const c = { ...emptyStats(), ...(JSON.parse(v) as Stats) }
    if (c.at > stats.at) { stats = c; write(KEY, stats); notify() }
  } catch { /* битые данные — не страшно */ }
})

export function useStatsData(): Stats {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => stats)
}

// Разбор событий: pos — до какого события показано (director), seat — за кого считаем (null — ни за кого).
// Возвращает очередь только что полученных достижений.
export function useStatsTracker(s: GameState, pos: number, seat: Seat | null) {
  const [fresh, setFresh] = useState<string[]>([])
  const seatRef = useRef(seat)
  seatRef.current = seat
  useEffect(() => {
    const st = seatRef.current
    if (!st || s.tid == null || st.me < 0) return
    const all = read<Record<string, Track>>(TRACKS, {})
    const tr = all[s.tid] ?? newTrack(s.tid, s.evBase)
    const from = Math.max(tr.pos, s.evBase)
    if (pos <= from) return
    const evs = s.ev.slice(from - s.evBase, pos - s.evBase)
    tr.pos = pos
    const got = applyEvents(stats, tr, evs, s, st)
    // храним разбор только последних турниров
    const keep = Object.values<Track>({ ...all, [s.tid]: tr }).sort((a, b) => b.pos - a.pos).slice(0, 5)
    write(TRACKS, Object.fromEntries(keep.map(t => [t.tid, t])))
    commit()
    if (got.length) setFresh(f => [...f, ...got])
  }, [s, pos])
  const shown = fresh[0] ? ACHIEVEMENTS.find(a => a.id === fresh[0]) ?? null : null
  useEffect(() => {
    if (!fresh.length) return
    const t = setTimeout(() => setFresh(f => f.slice(1)), 3500)
    return () => clearTimeout(t)
  }, [fresh])
  return shown
}
