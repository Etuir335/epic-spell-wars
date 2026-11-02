// Эффекты поверх экрана: снаряды между портретами, всплывающие числа, тряска. Портреты помечены data-pid.
import type { School } from '../data/cards'

export const SCHOOL_COLOR: Record<School, string> = {
  grass: '#5be35b', hex: '#ff3fb4', haze: '#4fb2ff', dark: '#c9c9c9', fire: '#ff7a1a',
}

let layer: HTMLDivElement | null = null
function root(): HTMLDivElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div')
    layer.className = 'fx-layer'
    document.body.appendChild(layer)
  }
  return layer
}
function center(pid: number): { x: number; y: number } | null {
  const el = document.querySelector(`[data-pid="${pid}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!r.width) return null
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
function spawn(cls: string, x: number, y: number, html = ''): HTMLDivElement {
  const d = document.createElement('div')
  d.className = cls
  d.style.left = x + 'px'
  d.style.top = y + 'px'
  d.innerHTML = html
  root().appendChild(d)
  return d
}
const later = (ms: number, f: () => void) => { if (ms > 0) setTimeout(f, ms); else f() }

// Снаряд от одного портрета к другому. Возвращает время полёта.
export function projectile(from: number, to: number, color: string, delay = 0, emoji = ''): number {
  const ms = 420
  later(delay, () => {
    const a = center(from), b = center(to)
    if (!a || !b) return
    const d = spawn('fx-orb', a.x, a.y, emoji)
    d.style.setProperty('--c', color)
    const dx = b.x - a.x, dy = b.y - a.y
    const arc = -Math.min(80, Math.abs(dx) * 0.3 + 30)
    d.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.4 },
      { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 + arc}px)) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9)`, opacity: 1 },
    ], { duration: ms, easing: 'ease-in' }).onfinish = () => {
      d.remove()
      const boom = spawn('fx-boom', b.x, b.y)
      boom.style.setProperty('--c', color)
      boom.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }], { duration: 420, easing: 'ease-out' }).onfinish = () => boom.remove()
    }
  })
  return ms
}

export function floater(pid: number, text: string, cls: string, delay = 0) {
  later(delay, () => {
    const c = center(pid)
    if (!c) return
    const d = spawn('fx-float ' + cls, c.x, c.y, text)
    d.animate([
      { transform: 'translate(-50%,-30%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.35)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%,-150%) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%,-190%) scale(.9)', opacity: 0 },
    ], { duration: 1300, easing: 'ease-out' }).onfinish = () => d.remove()
  })
}

export function shake(pid: number, delay = 0, hard = false) {
  later(delay, () => {
    const el = document.querySelector<HTMLElement>(`[data-pid="${pid}"]`)
    if (!el) return
    const a = hard ? 9 : 5
    el.animate([
      { transform: 'translateX(0)', filter: 'none' },
      { transform: `translateX(-${a}px) rotate(-3deg)`, filter: 'brightness(1.8) saturate(2) hue-rotate(-20deg)' },
      { transform: `translateX(${a}px) rotate(3deg)` },
      { transform: `translateX(-${a / 2}px)` },
      { transform: 'translateX(0)', filter: 'none' },
    ], { duration: 420 })
  })
}

export function glow(pid: number, color: string, delay = 0) {
  later(delay, () => {
    const el = document.querySelector<HTMLElement>(`[data-pid="${pid}"]`)
    if (!el) return
    el.animate([{ boxShadow: `0 0 0 0 ${color}` }, { boxShadow: `0 0 26px 8px ${color}` }, { boxShadow: `0 0 0 0 ${color}` }], { duration: 900 })
  })
}

export function shakeEl(el: HTMLElement | null, power = 8) {
  el?.animate([
    { transform: 'translate(0,0)' }, { transform: `translate(${power}px,-${power / 2}px)` }, { transform: `translate(-${power}px,${power / 2}px)` },
    { transform: `translate(${power / 2}px,${power / 2}px)` }, { transform: 'translate(0,0)' },
  ], { duration: 380 })
}

// Заслон: карта твари выпрыгивает перед хозяином, снаряд врага бьёт в неё, она трескается и падает. Возвращает время до удара.
export function guardFx(from: number, to: number, img: string, color: string): number {
  const c = center(to)
  if (!c) return 0
  const card = spawn('fx-guard', c.x, c.y, `<img src="${img}" alt="">`)
  card.animate([
    { transform: 'translate(-50%,-50%) scale(.2) rotate(-25deg)', opacity: 0 },
    { transform: 'translate(-50%,-62%) scale(1.15) rotate(6deg)', opacity: 1, offset: 0.6 },
    { transform: 'translate(-50%,-55%) scale(1) rotate(0)', opacity: 1 },
  ], { duration: 450, easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'forwards' })
  const hit = 450 + projectile(from, to, color, 450)
  later(hit, () => {
    card.classList.add('hit')
    floater(to, '🛡', 'skull')
    card.animate([
      { transform: 'translate(-50%,-55%) scale(1)', filter: 'brightness(3)' },
      { transform: 'translate(-46%,-55%) scale(1.08) rotate(4deg)', filter: 'brightness(1.6) saturate(2)', offset: 0.15 },
      { transform: 'translate(-54%,-55%) scale(1.04) rotate(-5deg)', filter: 'brightness(1.2) grayscale(.4)', offset: 0.3 },
      { transform: 'translate(-50%,-40%) scale(.95) rotate(-12deg)', filter: 'grayscale(1) brightness(.6)', opacity: 1, offset: 0.55 },
      { transform: 'translate(-30%,60%) scale(.7) rotate(-70deg)', filter: 'grayscale(1) brightness(.3)', opacity: 0 },
    ], { duration: 1100, easing: 'ease-in', fill: 'forwards' }).onfinish = () => card.remove()
  })
  return hit
}
