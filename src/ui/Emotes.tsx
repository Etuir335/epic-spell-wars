// Эмоции в бою: пузырь с анимацией над колдуном + звук. Свои — кнопкой у нижней панели, боты — сами по событиям.
import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../assets'
import { battleEmotes, emoteById, isGolden, type Emote } from '../emotes'
import type { GameState } from '../game/types'
import { isMuted } from './sound'
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
  if (now - (lastAt[pid] ?? 0) < 2500 || !emoteById(id)) return
  lastAt[pid] = now
  window.dispatchEvent(new CustomEvent(EV, { detail: { pid, id, gold } }))
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
      if (!isMuted()) { const a = new Audio(emoteSnd(id)); a.volume = gold ? 0.9 : 0.7; void a.play().catch(() => {}) }
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
export function EmoteButton({ pid, portrait }: { pid: number; portrait: number }) {
  const [open, setOpen] = useState(false)
  const st = getStats()
  const list = battleEmotes(st, portrait)
  const send = (e: Emote) => { setOpen(false); showEmote(pid, e.id, isGolden(st, e)) }
  return <>
    <button className="emote-btn" onClick={ev => { ev.stopPropagation(); setOpen(o => !o) }} title="Эмоции">😆</button>
    {open && <div className="emote-pick" onClick={() => setOpen(false)}>
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

// Боты отвечают эмоциями на события боя (по мере показа, не раньше анимации)
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
    const say = (p: number, ids: string[], chance: number) => {
      if (!bot(p) || Math.random() > chance) return
      const w = sig(p), id = w && Math.random() < 0.5 ? w : ids[Math.floor(Math.random() * ids.length)]
      setTimeout(() => showEmote(p, id, id === w && (s.players[p].lvl ?? 0) >= 5), 400 + Math.random() * 900)
    }
    for (let i = from; i < pos; i++) {
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
