// Эмоции в бою: пузырь с анимацией над колдуном + звук. Свои — кнопкой у нижней панели, боты — сами по событиям.
import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../assets'
import { battleEmotes, emoteById, isGolden, type Emote } from '../emotes'
import type { GameState } from '../game/types'
import { playSound, preloadSound } from './sound'
import { getStats } from './useStats'

export const emoteImg = (id: string) => assetUrl(`assets/emotes/${id}.webp`)
export const emoteSnd = (id: string) => assetUrl(`assets/emotes/${id}.ogg`)

interface Bubble { key: number; pid: number; id: string; gold: boolean; x: number; y: number; dx: number; down: boolean }
const EV = 'esw-emote'
let seq = 0
const lastAt: Record<number, number> = {}

// показать эмоцию над колдуном pid (не чаще раза в 2.5 с на колдуна)
export function showEmote(pid: number, id: string, gold = false, reply = false) {
  const now = Date.now()
  if (now - (lastAt[pid] ?? 0) < 2500 || !emoteById(id)) return false
  lastAt[pid] = now
  window.dispatchEvent(new CustomEvent(EV, { detail: { pid, id, gold, reply } }))
  return true
}

export function EmoteLayer() {
  const [list, setList] = useState<Bubble[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const { pid, id, gold } = (e as CustomEvent).detail as { pid: number; id: string; gold: boolean }
      const el = document.querySelector(`.ava[data-pid="${pid}"]`)
      const r = el?.getBoundingClientRect()
      // пузырь не вылезает за край экрана (хвостик всё равно смотрит на портрет); у верхних портретов — под ним
      const ax = r ? r.left + r.width / 2 : innerWidth / 2, x = Math.min(innerWidth - 62, Math.max(62, ax))
      const down = !!r && r.top < innerHeight * 0.4
      const b: Bubble = { key: ++seq, pid, id, gold, x, dx: ax - x, down, y: r ? (down ? r.bottom + 6 : r.top) : innerHeight / 2 }
      setList(l => [...l.filter(o => o.pid !== pid), b])
      setTimeout(() => setList(l => l.filter(o => o.key !== b.key)), 2600)
      playSound(emoteSnd(id), gold ? 0.9 : 0.7)
    }
    window.addEventListener(EV, on)
    return () => window.removeEventListener(EV, on)
  }, [])
  return <>{list.map(b => (
    <div key={b.key} className={`emote-bubble${b.gold ? ' gold' : ''}${b.down ? ' down' : ''}`} style={{ left: b.x, top: b.down ? b.y : Math.max(110, b.y), '--dx': `${Math.max(-34, Math.min(34, b.dx))}px` } as React.CSSProperties}>
      <img src={emoteImg(b.id)} alt="" />
    </div>
  ))}</>
}

// кнопка и выбор эмоции для своего колдуна
export function EmoteButton({ pid, portrait, onSend }: { pid: number; portrait: number; onSend?: (id: string, gold: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const st = getStats()
  const list = battleEmotes(st, portrait)
  // звуки скачать заранее — тогда эмоция и звук появляются вместе
  useEffect(() => { list.forEach(e => preloadSound(emoteSnd(e.id))); BOT_EMOTES.forEach(id => preloadSound(emoteSnd(id))) }, [portrait]) // eslint-disable-line react-hooks/exhaustive-deps
  const send = (e: Emote) => { setOpen(false); const g = isGolden(st, e); if (showEmote(pid, e.id, g)) onSend?.(e.id, g) }
  return <>
    <button className="emote-btn" onClick={ev => { ev.stopPropagation(); setOpen(o => !o) }} title="Эмоции">😆</button>
    {open && <div className="emote-pick" data-nosfx onClick={() => setOpen(false)}>
      <div className="emote-grid" onClick={ev => ev.stopPropagation()}>
        {list.map(e => (
          <button key={e.id} className={`${e.kind === 'wiz' ? 'wiz' : ''}${isGolden(st, e) ? ' gold' : ''}`} onClick={() => send(e)} title={e.name}>
            <img src={emoteImg(e.id)} alt={e.name} loading="lazy" />
          </button>
        ))}
      </div>
    </div>}
  </>
}

// Боты отвечают эмоциями на события боя (по мере показа, не раньше анимации) и на чужие эмоции.
// У каждого бота характер: чаще токсик, реже добряк или нытик, совсем редко — супертоксик, который
// после убийства, победы или насмешки в ответ заводит спам. Случайность — от номера турнира и события,
// чтобы в сети у всех боты «сказали» одно и то же.
const evRand = (tid: number, i: number) => {
  let h = (tid ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0
  return () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 >>> 0; return (h ^ (h >>> 13)) / 2 ** 32 }
}
type Mood = 'toxic' | 'kind' | 'whiny' | 'super'
// характер бота: 7% супертоксик, 55% токсик, 23% добряк, 15% нытик
export const moodOf = (tid: number, p: number): Mood => {
  const x = evRand(tid, 1000 + p)()
  return x < 0.07 ? 'super' : x < 0.62 ? 'toxic' : x < 0.85 ? 'kind' : 'whiny'
}
// что говорит бот по поводу (по характеру) и с каким шансом
const LINES: Record<string, Record<Mood, string[]> & { ch: Record<Mood, number> }> = {
  hit: { toxic: ['laugh', 'hehe', 'popcorn', 'micdrop', 'emperor', 'gcool'], kind: ['thumbs', 'sweat', 'peace'], whiny: ['sweat', 'kscream'], super: ['laugh', 'hehe', 'micdrop', 'chicken', 'emperor'], ch: { toxic: 0.5, kind: 0.2, whiny: 0.15, super: 0.8 } },
  hurt: { toxic: ['mad', 'cheater', 'pangry', 'boohoo'], kind: ['cry', 'sweat', 'thumbs'], whiny: ['cry', 'skelcry', 'kscream', 'ghost'], super: ['mad', 'cheater', 'pangry', 'nowifi'], ch: { toxic: 0.45, kind: 0.25, whiny: 0.55, super: 0.8 } },
  kill: { toxic: ['laugh', 'hehe', 'micdrop', 'emperor', 'chicken', 'boohoo', 'shush'], kind: ['thumbs', 'gg', 'pkiss'], whiny: ['laugh', 'thumbs'], super: ['laugh'], ch: { toxic: 0.75, kind: 0.4, whiny: 0.35, super: 1 } },
  death: { toxic: ['mad', 'cheater', 'nowifi', 'pangry'], kind: ['gg', 'cry', 'thumbs'], whiny: ['cry', 'skelcry', 'nowifi', 'ghost'], super: ['cheater', 'mad', 'nowifi'], ch: { toxic: 0.6, kind: 0.45, whiny: 0.7, super: 1 } },
  win: { toxic: ['laugh', 'emperor', 'micdrop', 'hehe', 'chicken', 'tea'], kind: ['gg', 'thumbs', 'peace', 'pkiss'], whiny: ['laugh', 'hehe', 'gg'], super: ['laugh'], ch: { toxic: 0.9, kind: 0.7, whiny: 0.6, super: 1 } },
  start: { toxic: ['hehe', 'shush', 'gcool', 'popcorn'], kind: ['hi', 'peace', 'thumbs'], whiny: ['yawn', 'sweat', 'hi'], super: ['shush', 'emperor', 'popcorn'], ch: { toxic: 0.25, kind: 0.3, whiny: 0.15, super: 0.6 } },
  // ответы на чужие эмоции: на добрые / на насмешки / на слёзы
  nice: { toxic: ['laugh', 'yawn', 'boohoo', 'shush', 'tea'], kind: ['thumbs', 'pkiss', 'gkiss', 'peace', 'hi'], whiny: ['skellove', 'pkiss', 'thumbs'], super: ['laugh', 'yawn', 'boohoo'], ch: { toxic: 0.4, kind: 0.55, whiny: 0.4, super: 0.8 } },
  rude: { toxic: ['mad', 'laugh', 'cheater', 'micdrop', 'chicken', 'moai'], kind: ['cry', 'peace', 'sweat'], whiny: ['cry', 'skelcry', 'kscream'], super: ['laugh'], ch: { toxic: 0.6, kind: 0.3, whiny: 0.45, super: 1 } },
  sad: { toxic: ['laugh', 'hehe', 'boohoo', 'popcorn', 'tea'], kind: ['thumbs', 'pkiss', 'peace'], whiny: ['cry', 'skelcry'], super: ['laugh'], ch: { toxic: 0.65, kind: 0.45, whiny: 0.4, super: 1 } },
}
// поводы, после которых супертоксик заводит спам
const RAGE = new Set(['kill', 'win', 'rude', 'sad'])
const SPAM = ['laugh', 'hehe', 'boohoo', 'micdrop', 'chicken', 'emperor', 'cheater', 'popcorn', 'shush']
const NICE = new Set(['thumbs', 'gg', 'hi', 'bye', 'pkiss', 'gkiss', 'peace', 'skellove', 'dragon'])
const SAD = new Set(['cry', 'skelcry', 'sweat', 'kscream', 'ghost', 'nowifi'])
const toneOf = (id: string) => NICE.has(id) ? 'nice' : SAD.has(id) ? 'sad' : 'rude'
export const BOT_EMOTES = [...new Set(Object.values(LINES).flatMap(l => [...l.toxic, ...l.kind, ...l.whiny, ...l.super]))]

export function useBotEmotes(s: GameState, pos: number) {
  const done = useRef(pos)
  const sRef = useRef(s); sRef.current = s
  // фирменная эмоция колдуна-бота: с 3-го уровня, золотая с 5-го
  const sig = (s: GameState, p: number) => { const q = s.players[p]; return q.lvl && q.lvl >= 3 && !q.boss && emoteById(`w${q.portrait}`) ? `w${q.portrait}` : null }
  const say = (s: GameState, p: number, why: string, rnd: () => number, delay = 400 + rnd() * 900, reply = false) => {
    const q = s.players[p]
    if (!q?.bot || (!q.alive && why !== 'death' && why !== 'win')) return
    const m = moodOf(s.tid ?? 0, p), L = LINES[why]
    if (rnd() > L.ch[m]) return
    const w = sig(s, p), pool = L[m], id = w && rnd() < 0.3 ? w : pool[Math.floor(rnd() * pool.length)]
    const gold = id === w && (q.lvl ?? 0) >= 5
    setTimeout(() => showEmote(p, id, gold, reply), delay)
    // супертоксик: очередь из 3–5 насмешек подряд (чаще нельзя — у эмоций пауза 2,5 с)
    if (m === 'super' && RAGE.has(why)) {
      const k = 3 + Math.floor(rnd() * 3)
      for (let j = 1; j <= k; j++) {
        const sp = j === k && w ? w : SPAM[Math.floor(rnd() * SPAM.length)]
        setTimeout(() => showEmote(p, sp, sp === w && (q.lvl ?? 0) >= 5, true), delay + j * 2600)
      }
    }
  }
  useEffect(() => {
    const from = Math.max(done.current, s.evBase)
    done.current = pos
    const lastHit: Record<number, number | null> = {}
    for (let i = from; i < pos; i++) {
      const rnd = evRand(s.tid ?? 0, i)
      const e = s.ev[i - s.evBase]
      if (!e) continue
      if (e.k === 'game') s.players.forEach((_, p) => say(s, p, 'start', evRand(s.tid ?? 0, i * 7 + p), 800 + p * 600))
      else if (e.k === 'dmg') {
        lastHit[e.p] = e.from
        if (e.n >= 4 && e.after > 0) {
          say(s, e.p, 'hurt', rnd)
          if (e.from != null && e.from !== e.p) say(s, e.from, 'hit', evRand(s.tid ?? 0, i + 5000))
        }
      } else if (e.k === 'death') {
        say(s, e.p, 'death', rnd)
        const k = lastHit[e.p]
        if (k != null && k !== e.p) say(s, k, 'kill', evRand(s.tid ?? 0, i + 9000), 1200 + rnd() * 900)
      } else if (e.k === 'over' && e.winner >= 0) say(s, e.winner, 'win', rnd)
    }
  }, [s, pos]) // eslint-disable-line react-hooks/exhaustive-deps
  // ответ на чужую эмоцию (свою или другого бота); на ответ уже не отвечают — без бесконечных перепалок
  useEffect(() => {
    let n = 0
    const on = (ev: Event) => {
      const { pid, id, reply } = (ev as CustomEvent).detail as { pid: number; id: string; reply?: boolean }
      const s = sRef.current
      if (reply) return
      const human = !s.players[pid]?.bot
      const bots = s.players.map((_, p) => p).filter(p => p !== pid && s.players[p].bot && s.players[p].alive)
      // отвечает один бот (на человека — чаще), случайный, но одинаковый у всех в сети
      const rnd = evRand((s.tid ?? 0) ^ (pid * 131 + id.length * 17), 7000 + n++)
      if (!bots.length || rnd() > (human ? 0.85 : 0.35)) return
      // супертоксик отвечает первым
      const sup = bots.find(p => moodOf(s.tid ?? 0, p) === 'super')
      const b = sup ?? bots[Math.floor(rnd() * bots.length)]
      say(s, b, toneOf(id.startsWith('w') ? 'laugh' : id), rnd, 700 + rnd() * 1100, true)
    }
    window.addEventListener(EV, on)
    return () => window.removeEventListener(EV, on)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
