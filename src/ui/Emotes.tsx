// Эмоции в бою: пузырь с анимацией над колдуном + звук. Свои — кнопкой у нижней панели, боты — сами по событиям.
import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../assets'
import { battleEmotes, emoteById, isGolden, type Emote } from '../emotes'
import type { GameState } from '../game/types'
import { playSound, preloadSound } from './sound'
import { getStats } from './useStats'

export const emoteImg = (id: string) => assetUrl(`assets/emotes/${id}.webp`)
const emoteSnd = (id: string) => assetUrl(`assets/emotes/${id}.ogg`)

interface Bubble { key: number; pid: number; id: string; gold: boolean; x: number; y: number }
const EV = 'esw-emote'
let seq = 0
const lastAt: Record<number, number> = {}

// показать эмоцию над колдуном pid (не чаще раза в 2.5 с на колдуна)
export function showEmote(pid: number, id: string, gold = false) {
  const now = Date.now()
  if (now - (lastAt[pid] ?? 0) < 2500 || !emoteById(id)) return false
  lastAt[pid] = now
  window.dispatchEvent(new CustomEvent(EV, { detail: { pid, id, gold } }))
  return true
}

export function EmoteLayer() {
  const [list, setList] = useState<Bubble[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const { pid, id, gold } = (e as CustomEvent).detail as { pid: number; id: string; gold: boolean }
      const el = document.querySelector(`.ava[data-pid="${pid}"]`)
      const r = el?.getBoundingClientRect()
      const b: Bubble = { key: ++seq, pid, id, gold, x: r ? r.left + r.width / 2 : innerWidth / 2, y: r ? r.top : innerHeight / 2 }
      setList(l => [...l.filter(o => o.pid !== pid), b])
      setTimeout(() => setList(l => l.filter(o => o.key !== b.key)), 2600)
      playSound(emoteSnd(id), gold ? 0.9 : 0.7)
    }
    window.addEventListener(EV, on)
    return () => window.removeEventListener(EV, on)
  }, [])
  return <>{list.map(b => (
    <div key={b.key} className={`emote-bubble${b.gold ? ' gold' : ''}`} style={{ left: b.x, top: Math.max(70, b.y) }}>
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
  useEffect(() => { list.forEach(e => preloadSound(emoteSnd(e.id))); BOT_KILL.concat('mad', 'cry').forEach(id => preloadSound(emoteSnd(id))) }, [portrait]) // eslint-disable-line react-hooks/exhaustive-deps
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

// Боты отвечают эмоциями на события боя (по мере показа, не раньше анимации).
// Случайность — от номера турнира и события, чтобы в сети у всех боты «сказали» одно и то же.
const evRand = (tid: number, i: number) => {
  let h = (tid ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0
  return () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 >>> 0; return (h ^ (h >>> 13)) / 2 ** 32 }
}
const BOT_KILL = ['laugh', 'thumbs', 'hehe']
export function useBotEmotes(s: GameState, pos: number) {
  const done = useRef(pos)
  useEffect(() => {
    const from = Math.max(done.current, s.evBase)
    done.current = pos
    const lastHit: Record<number, number | null> = {}
    const bot = (p: number) => s.players[p]?.bot ? s.players[p] : null
    // фирменная эмоция колдуна-бота: с 3-го уровня, золотая с 5-го
    const sig = (p: number) => { const q = s.players[p]; return q.lvl && q.lvl >= 3 && !q.boss && emoteById(`w${q.portrait}`) ? `w${q.portrait}` : null }
    let rnd = Math.random
    const say = (p: number, ids: string[], chance: number) => {
      if (!bot(p) || rnd() > chance) return
      const w = sig(p), id = w && rnd() < 0.5 ? w : ids[Math.floor(rnd() * ids.length)]
      setTimeout(() => showEmote(p, id, id === w && (s.players[p].lvl ?? 0) >= 5), 400 + rnd() * 900)
    }
    for (let i = from; i < pos; i++) {
      rnd = evRand(s.tid ?? 0, i)
      const e = s.ev[i - s.evBase]
      if (!e) continue
      if (e.k === 'dmg') {
        lastHit[e.p] = e.from
        if (e.n >= 5 && e.after > 0) say(e.p, ['mad', 'cry'], 0.3)
      } else if (e.k === 'death') {
        say(e.p, ['cry', 'mad'], 0.45)
        const k = lastHit[e.p]
        if (k != null && k !== e.p) say(k, BOT_KILL, 0.4)
      } else if (e.k === 'over' && e.winner >= 0) say(e.winner, BOT_KILL, 0.6)
    }
  }, [s, pos])
}
