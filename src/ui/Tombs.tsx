// Карты дохлых колдунов в начале игры: карта вылетает от колдуна в центр, показывает, что даёт (знак на всю игру —
// улетает значком на портрет), и сгорает как настоящая — от краёв к центру, с обугливанием, призрачно-голубой кромкой и искрами.
import { useEffect, useRef, useState } from 'react'
import { cardUrl } from '../assets'
import { DEAD, SCHOOL_NAMES } from '../data/cards'
import { SchoolIcon } from './cards'

interface Tomb { key: number; c: number; name: string; i: number; n: number; dx: number; dy: number; k: number }
const EV = 'esw-tomb'
let seq = 0

// тайминги (мс): вылет → показ → горение → пепел
export const TOMB_FLY = 650, TOMB_BURN = 2700, TOMB_BURN_LEN = 2100, TOMB_TOTAL = TOMB_BURN + TOMB_BURN_LEN + 300

// k — множитель времени (меньше 1 — быстрее)
export function showTomb(pid: number, c: number, name: string, i: number, n: number, k = 1) {
  window.dispatchEvent(new CustomEvent(EV, { detail: { pid, c, name, i, n, k } }))
}

// Настройка: показывать только свои карты дохлых колдунов (чужие — значком у портрета)
const MINE_KEY = 'esw-tombs-mine'
export function tombsMine(): boolean { try { return localStorage.getItem(MINE_KEY) === '1' } catch { return false } }
function setTombsMine(v: boolean) { try { localStorage.setItem(MINE_KEY, v ? '1' : '0') } catch { /* не важно */ } }

// что делает карта — коротко, крупно (полный текст ниже)
const EFFECT: Record<number, string> = {
  0: '💤 Ничего — просто мёртв', 1: '⚔ 2 урона врагу', 2: '🎲 +1 кубик к броскам первого хода', 3: '❤ +3 жизни', 4: '🃏 +2 карты на руку',
  5: '🌀 «Шальная магия» на руку', 6: '❤ +2 жизни', 7: '💰 +1 сокровище', 11: '💰 Отжал сокровище', 12: '🃏 Колдунство и ещё карта',
  16: '🏰 Замок в склепе', 17: '🐾 Начинаешь с тварью', 18: '🩸 Кровь за медали', 19: '🌩 Проклятие победителю', 20: '🌩 Лишняя карта в заклинание',
  21: '🩸 Каждый сдаёт литр', 22: '🩸 +2 литра крови', 23: '🎲 +1 кубик твари',
}

export function TombLayer({ fast, onFast, onSkip }: { fast: boolean; onFast: () => void; onSkip: () => void }) {
  const [list, setList] = useState<Tomb[]>([])
  const [mine, setMine] = useState(tombsMine)
  useEffect(() => {
    const on = (e: Event) => {
      const { pid, c, name, i, n, k } = (e as CustomEvent).detail as { pid: number; c: number; name: string; i: number; n: number; k: number }
      const r = document.querySelector(`.ava[data-pid="${pid}"]`)?.getBoundingClientRect()
      const t: Tomb = { key: ++seq, c, name, i, n, k, dx: r ? r.left + r.width / 2 - innerWidth / 2 : 0, dy: r ? r.top + r.height / 2 - innerHeight / 2 : 0 }
      setList(l => [...l, t])
      setTimeout(() => setList(l => l.filter(o => o.key !== t.key)), TOMB_TOTAL * k)
    }
    window.addEventListener(EV, on)
    return () => window.removeEventListener(EV, on)
  }, [])
  if (!list.length) return null
  const k = list[list.length - 1].k
  return <div className="tomb-layer" style={{ '--tk': k } as React.CSSProperties}>
    <div className="tomb-ctl">
      <button onClick={onFast}>{fast ? '▶ Обычно' : '⏩ Быстрее'}</button>
      <button onClick={() => { setList([]); onSkip() }}>⏭ Пропустить</button>
      <button className={mine ? 'on' : ''} onClick={() => { setMine(!mine); setTombsMine(!mine) }} title="Показывать только твои карты дохлых колдунов">👁 Только мои</button>
    </div>
    {list.map(t => {
      const d = DEAD[Math.floor(t.c / 10)]
      const sc = d.school ?? undefined
      return (
        <div key={t.key} className="tomb" style={{ '--dx': `${t.dx}px`, '--dy': `${t.dy}px` } as React.CSSProperties}>
          <div className="tomb-cap"><b>{t.name}</b>{t.n > 1 && <small>{t.i + 1} / {t.n}</small>}</div>
          <BurningCard src={cardUrl('dead', Math.floor(t.c / 10))} k={t.k} />
          <div className="tomb-eff">
            <b>{sc ? <><SchoolIcon s={sc} size={26} /> Знак «{SCHOOL_NAMES[sc]}» на всю игру</> : EFFECT[Math.floor(t.c / 10)] ?? d.name}</b>
            <small>{d.name} — {d.text}</small>
          </div>
          {sc && <span className="tomb-sign"><SchoolIcon s={sc} size={44} /></span>}
        </div>
      )
    })}
  </div>
}

// value noise в несколько октав — неровная кромка огня
function noiseField(w: number, h: number) {
  const out = new Float32Array(w * h)
  let amp = 1, tot = 0
  for (const cell of [48, 22, 9]) {
    const gw = Math.ceil(w / cell) + 2
    const g = new Float32Array(gw * (Math.ceil(h / cell) + 2)).map(() => Math.random())
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, ix = fx | 0, iy = fy | 0
      let tx = fx - ix, ty = fy - iy
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1]
      out[y * w + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty)
    }
    tot += amp; amp *= .5
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot
  return out
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; smoke: boolean }

function BurningCard({ src, k }: { src: string; k: number }) {
  const card = useRef<HTMLCanvasElement>(null), fx = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = card.current!, fc = fx.current!
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    let raf = 0, dead = false
    const born = performance.now()
    img.onload = () => {
      if (dead) return
      const W = 300, H = Math.round(W * img.naturalHeight / img.naturalWidth)
      cv.width = W; cv.height = H
      const PAD = .45, FW = Math.round(W * (1 + PAD * 2)), FH = Math.round(H * (1 + PAD * 2)), ox = W * PAD, oy = H * PAD
      fc.width = FW; fc.height = FH
      const ctx = cv.getContext('2d', { willReadFrequently: true })!, fctx = fc.getContext('2d')!
      ctx.drawImage(img, 0, 0, W, H)
      let src0: Uint8ClampedArray
      try { src0 = ctx.getImageData(0, 0, W, H).data } catch { cv.classList.add('css-burn'); return } // чужой домен — простой вариант
      // порог сгорания: края раньше, центр позже, плюс шум — кромка рваная
      const nz = noiseField(W, H), th = new Float32Array(W * H)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ax = Math.abs(x - W / 2) / (W / 2), ay = Math.abs(y - H / 2) / (H / 2)
        const dist = Math.max(ax, ay) * .55 + Math.hypot(ax, ay) / Math.SQRT2 * .45
        th[y * W + x] = (1 - dist) * .7 + nz[y * W + x] * .3
      }
      const frame = ctx.createImageData(W, H), px = frame.data
      const sparks: Spark[] = []
      const t0 = born + TOMB_BURN * k
      let last = performance.now()
      const EMBER = .022, CHAR = .075, HEAT = .16
      const tick = (now: number) => {
        if (dead) return
        const dt = Math.min(50, now - last) / 1000; last = now
        const p = (now - t0) / (TOMB_BURN_LEN * k)
        if (p > 0) {
          const L = p * 1.08 - .04 // уровень огня: всё с порогом ниже — сгорело
          for (let i = 0, j = 0; i < th.length; i++, j += 4) {
            const e = th[i] - L
            if (e < 0) { px[j + 3] = 0; continue }
            let r = src0[j], g = src0[j + 1], b = src0[j + 2]
            if (e < EMBER) { // тлеющая кромка: от белого к призрачно-голубому
              const k = e / EMBER
              r = 230 - 190 * k; g = 255 - 70 * k; b = 255
            } else if (e < CHAR) { // обугливание: иссиня-чёрное, к кромке темнее
              const c = ((e - EMBER) / (CHAR - EMBER)) ** 2 * .55
              r = 8 + (r - 8) * c; g = 16 + (g - 16) * c; b = 34 + (b - 34) * c
            } else if (e < HEAT) { // холодный огонь вытягивает краски — синеет и темнеет
              const k = 1 - (e - CHAR) / (HEAT - CHAR)
              r = r * (1 - .6 * k); g = g * (1 - .4 * k) + 20 * k; b = b * (1 - .2 * k) + 60 * k
            }
            px[j] = r; px[j + 1] = g; px[j + 2] = b; px[j + 3] = 255
          }
          ctx.putImageData(frame, 0, 0)
          // искры и дым с кромки
          if (p < 1.02) for (let k = 0; k < 70 && sparks.length < 420; k++) {
            const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0, e = th[y * W + x] - L
            if (e < 0 || e >= EMBER * 1.6) continue
            const smoke = Math.random() < .3
            sparks.push({ x: x + ox, y: y + oy, vx: (Math.random() - .5) * 30, vy: -(smoke ? 25 : 40) - Math.random() * 70, life: 0,
              max: smoke ? 1.4 + Math.random() : .5 + Math.random() * .9, r: smoke ? 8 + Math.random() * 10 : 1 + Math.random() * 1.8, smoke })
          }
        }
        fctx.clearRect(0, 0, FW, FH)
        if (p > 0 && p < 1) { // призрачное зарево
          fctx.globalCompositeOperation = 'lighter'
          const gl = fctx.createRadialGradient(FW / 2, FH / 2, W * .1, FW / 2, FH / 2, W * .9)
          const a = Math.sin(p * Math.PI) * .35 * (.85 + Math.random() * .15)
          gl.addColorStop(0, `rgba(120,220,255,${a * .5})`); gl.addColorStop(.6, `rgba(40,140,255,${a})`); gl.addColorStop(1, 'rgba(20,60,255,0)')
          fctx.fillStyle = gl; fctx.fillRect(0, 0, FW, FH)
        }
        for (let k = sparks.length - 1; k >= 0; k--) {
          const s = sparks[k]
          s.life += dt
          if (s.life >= s.max) { sparks.splice(k, 1); continue }
          s.vx += (Math.random() - .5) * 60 * dt; s.vy -= 20 * dt
          s.x += s.vx * dt; s.y += s.vy * dt
          const f = 1 - s.life / s.max
          fctx.globalCompositeOperation = s.smoke ? 'source-over' : 'lighter'
          fctx.fillStyle = s.smoke ? `rgba(70,110,150,${.18 * f})` : `rgba(${90 + 150 * f | 0},${200 + 55 * f | 0},255,${f})`
          fctx.beginPath(); fctx.arc(s.x, s.y, s.smoke ? s.r * (1.6 - f * .6) : s.r * (.6 + f * .6), 0, 7); fctx.fill()
        }
        fctx.globalCompositeOperation = 'source-over'
        if (p < 1.6) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    return () => { dead = true; cancelAnimationFrame(raf) }
  }, [src, k])
  return <div className="tomb-card">
    <canvas ref={card} className="tomb-paper" />
    <canvas ref={fx} className="tomb-fx" />
  </div>
}
