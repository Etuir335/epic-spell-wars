// Звуки синтезируются Web Audio (без файлов). Звук включается после первого касания экрана.
let ctx: AudioContext | null = null
let muted = (() => { try { return localStorage.getItem('esw-mute') === '1' } catch { return false } })()

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('esw-mute', m ? '1' : '0') } catch { /* не важно */ }
}

function ac(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}
// разблокировать звук на первом касании (требование браузеров)
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { ac() }, { once: true })

let lastTone = 0 // когда прозвучал последний звук (чтобы не накладывать щелчок кнопки)
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, delay = 0, slideTo?: number) {
  const a = ac(); if (!a) return
  lastTone = performance.now()
  const t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t); o.stop(t + dur + 0.05)
}
function noise(dur: number, vol = 0.2, delay = 0, freq = 1200, q = 0.8, type: BiquadFilterType = 'bandpass', sweepTo?: number) {
  const a = ac(); if (!a) return
  lastTone = performance.now()
  const t = a.currentTime + delay
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource(); src.buffer = buf
  const f = a.createBiquadFilter(); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
  const g = a.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.08),
  place: () => { noise(0.08, 0.25, 0, 900, 1); tone(220, 0.1, 'triangle', 0.12) },
  deal: () => noise(0.12, 0.18, 0, 2500, 0.7, 'bandpass', 900),
  flip: () => { noise(0.14, 0.3, 0, 3000, 0.6, 'bandpass', 700); tone(520, 0.08, 'triangle', 0.08, 0.05) },
  boom: () => { tone(140, 0.7, 'sine', 0.5, 0, 35); noise(0.6, 0.35, 0, 400, 0.5, 'lowpass', 80); tone(70, 0.9, 'sawtooth', 0.08, 0, 30) },
  chime: () => { tone(880, 0.35, 'sine', 0.12); tone(1320, 0.45, 'sine', 0.08, 0.07) },
  dice: () => { for (let i = 0; i < 7; i++) noise(0.04, 0.3, i * 0.06 + Math.random() * 0.02, 1800 + Math.random() * 1500, 4) },
  bigRoll: () => { tone(330, 0.15, 'square', 0.06); tone(495, 0.15, 'square', 0.06, 0.1); tone(660, 0.3, 'square', 0.07, 0.2) },
  zap: () => { tone(1200, 0.25, 'sawtooth', 0.07, 0, 150); noise(0.2, 0.12, 0, 4000, 1, 'highpass') },
  hit: () => { noise(0.18, 0.45, 0, 500, 0.7, 'lowpass', 120); tone(180, 0.2, 'square', 0.12, 0, 60) },
  ghost: () => { tone(220, 1.4, 'sine', 0.09, 0, 660); tone(330, 1.2, 'triangle', 0.05, 0.15, 990); tone(110, 1.6, 'sine', 0.07, 1.0, 55) },
  burn: () => { noise(2.1, 0.07, 0, 500, 0.5, 'lowpass', 2400); noise(1.6, 0.05, 0.3, 3000, 1.2, 'bandpass'); for (let i = 0; i < 9; i++) noise(0.04, 0.09, 0.15 + Math.random() * 1.8, 2500 + Math.random() * 3000, 3) },
  heal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.07)) },
  coin: () => { tone(1568, 0.12, 'square', 0.06); tone(2093, 0.35, 'square', 0.06, 0.08) },
  death: () => { tone(300, 1.1, 'sawtooth', 0.12, 0, 40); noise(0.9, 0.25, 0.1, 300, 0.5, 'lowpass', 60) },
  round: () => { tone(196, 0.5, 'triangle', 0.15); tone(294, 0.6, 'triangle', 0.12, 0.12) },
  myTurn: () => { tone(784, 0.18, 'sine', 0.12); tone(988, 0.3, 'sine', 0.12, 0.12) },
  fanfare: () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 6 ? 0.8 : 0.2, 'square', 0.07, i * 0.13)) },
}

// звуки интерфейса
let last = 0
const ui = (f: () => void) => () => { last = performance.now(); f() }
export const uiSfx = {
  click: ui(() => { noise(0.03, 0.18, 0, 2400, 2); tone(420, 0.05, 'triangle', 0.07) }),
  press: ui(() => { noise(0.05, 0.25, 0, 900, 1); tone(330, 0.08, 'square', 0.06); tone(660, 0.12, 'triangle', 0.07, 0.04) }),
  back: ui(() => { noise(0.03, 0.15, 0, 1800, 2); tone(360, 0.07, 'triangle', 0.07, 0, 240) }),
  open: ui(() => { noise(0.22, 0.14, 0, 600, 0.7, 'bandpass', 2600); tone(300, 0.15, 'sine', 0.05, 0.05, 520) }),
  close: ui(() => noise(0.18, 0.12, 0, 2400, 0.7, 'bandpass', 500)),
  rattle: ui(() => { for (let i = 0; i < 6; i++) { noise(0.06, 0.28, i * 0.16, 700 + i * 80, 3); tone(140, 0.06, 'square', 0.04, i * 0.16) } }),
  chestOpen: ui(() => { tone(180, 0.35, 'sawtooth', 0.05, 0, 520); noise(0.5, 0.3, 0.15, 3000, 0.5, 'bandpass', 600); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, 0.3 + i * 0.06)) }),
  reveal: ui(() => { noise(0.12, 0.2, 0, 3500, 0.6, 'bandpass', 900); [1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, 'sine', 0.06, 0.05 + i * 0.05)) }),
  swipe: ui(() => noise(0.12, 0.14, 0, 1200, 0.8, 'bandpass', 3000)),
}
// кнопка без своего звука — щелчок (свой звук обработчика уже прозвучал раньше всплытия до document)
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest?.('button, a, [role=button], .clickable, .card-pick') as HTMLElement | null
    if (!el || (el as HTMLButtonElement).disabled || el.closest('[data-nosfx]')) return
    if (performance.now() - Math.max(last, lastTone) < 60) return
    const t = el.textContent?.trim() ?? ''
    if (el.closest('.top-bar') && t === '←') uiSfx.back()
    else if (el.classList.contains('gold')) uiSfx.press()
    else uiSfx.click()
  })
  // окна (шторки снизу, увеличенная карта) — шорох при открытии и закрытии
  new MutationObserver(ms => {
    let add = 0, rem = 0
    for (const m of ms) {
      m.addedNodes.forEach(n => { if (n instanceof HTMLElement && (n.matches('.sheet-back, .zoom') || n.querySelector('.sheet-back, .zoom'))) add++ })
      m.removedNodes.forEach(n => { if (n instanceof HTMLElement && (n.matches('.sheet-back, .zoom') || n.querySelector('.sheet-back, .zoom'))) rem++ })
    }
    if (add) { if (document.querySelector('.zoom')) uiSfx.reveal(); else uiSfx.open() } else if (rem) uiSfx.close()
  }).observe(document.documentElement, { childList: true, subtree: true })
}

// звуковые файлы (эмоции): заранее скачать и разобрать, чтобы играли сразу, без задержки
const bufs = new Map<string, Promise<AudioBuffer | null>>()
export function preloadSound(url: string) {
  const a = ac(); if (!a) return null
  let p = bufs.get(url)
  if (!p) {
    p = fetch(url).then(r => r.arrayBuffer()).then(b => a.decodeAudioData(b)).catch(() => null)
    bufs.set(url, p)
  }
  return p
}
export function playSound(url: string, vol = 0.7) {
  const a = ac(); if (!a) return
  lastTone = performance.now()
  void preloadSound(url)?.then(buf => {
    if (!buf) return
    const src = a.createBufferSource(), g = a.createGain()
    src.buffer = buf; g.gain.value = vol
    src.connect(g).connect(a.destination); src.start()
  })
}
