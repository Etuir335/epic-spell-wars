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

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, delay = 0, slideTo?: number) {
  const a = ac(); if (!a) return
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
  heal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.07)) },
  coin: () => { tone(1568, 0.12, 'square', 0.06); tone(2093, 0.35, 'square', 0.06, 0.08) },
  death: () => { tone(300, 1.1, 'sawtooth', 0.12, 0, 40); noise(0.9, 0.25, 0.1, 300, 0.5, 'lowpass', 60) },
  round: () => { tone(196, 0.5, 'triangle', 0.15); tone(294, 0.6, 'triangle', 0.12, 0.12) },
  myTurn: () => { tone(784, 0.18, 'sine', 0.12); tone(988, 0.3, 'sine', 0.12, 0.12) },
  fanfare: () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 6 ? 0.8 : 0.2, 'square', 0.07, i * 0.13)) },
}
