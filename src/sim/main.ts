// Наглядный прогон: случайные турниры крутятся прямо в браузере, колдуны — шарики (размер = жизни).
// Каждый шаг сверяет, что карты не теряются и не задваиваются; ошибки — справа в списке.
// Открыть при запущенном `npm run dev`: http://localhost:5180/epic-spell-wars/sim.html (в сборку не попадает).
import { create, reduce, waitingFor } from '../game/engine'
import { legalActions } from '../game/legal'
import { TRAP, type BossKind, type CardSet, type GameState, type Mod } from '../game/types'
import { BOSS_INFO, MOD_INFO } from '../daily'

const MODS: Mod[] = ['wild', 'reverse', 'blood', 'swap', 'dice', 'zombie', 'greedy', 'fever', 'mirror']
const BOSSES: BossKind[] = ['grandpa', 'slime', 'mirror']
const TRIG = ['🪞', '🩸', '🌕', '🔄', '💰', '🧟', '👴', '🟢', '🐾', '✨', '🍄', '💥', '🛡']
const SETS: Record<string, CardSet[][]> = { mix: [['base'], ['swamp'], ['base', 'swamp']], base: [['base']], swamp: [['swamp']], both: [['base', 'swamp']] }
const pick = <X>(a: X[]) => a[Math.floor(Math.random() * a.length)]

interface Table { s: GameState; ns: number; nt: number; label: string; life: number[]; flash: number[]; seen: number; burst: number }
interface Particle { x: number; y: number; t: number; text: string }

const $ = (id: string) => document.getElementById(id)!
const cv = $('c') as HTMLCanvasElement, g = cv.getContext('2d')!
const tables: Table[] = []
const parts: Particle[] = []
const counts = new Map<string, number>()
let done = 0, steps = 0, errors = 0, paused = false

function newTable(): Table {
  const mods = MODS.filter(() => Math.random() < 0.2)
  const boss = Math.random() < 0.3 ? pick(BOSSES) : undefined
  const np = boss ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4)
  const sets = pick(SETS[($('sets') as HTMLSelectElement).value])
  const setup = Array.from({ length: np }, (_, i) => ({ name: 'К' + i, portrait: Math.floor(Math.random() * 41), ...(boss && i === np - 1 ? { boss, bot: 3 } : {}) }))
  const s = create(setup, (Math.random() * 2 ** 31) | 0, 2, mods, sets)
  const label = [sets.map(x => (x === 'base' ? '🌋' : '🍄')).join(''), ...mods.map(m => MOD_INFO[m].icon), boss ? BOSS_INFO[boss].icon : ''].join(' ')
  return { s, ns: s.deck.length + s.players.reduce((a, p) => a + p.hand.length, 0), nt: s.treasureDeck.length, label, life: s.players.map(p => p.life), flash: s.players.map(() => 0), seen: 0, burst: 0 }
}

function check(t: Table) {
  const s = t.s
  const spells = [...s.deck, ...s.discard, ...s.players.flatMap(p => [...p.hand, ...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id), ...(p.reservedWild ?? []), ...(p.creatures ?? [])])]
  const tr = [...s.treasureDeck, ...s.treasureDiscard, ...s.players.flatMap(p => [...p.treasures, ...((p.spell ?? []).some(c => c.id === TRAP) ? [2] : [])])]
  if (spells.length !== t.ns || new Set(spells).size !== t.ns) throw new Error(`заклинаний ${spells.length}/${new Set(spells).size} вместо ${t.ns}`)
  if (tr.length !== t.nt || new Set(tr).size !== t.nt) throw new Error(`сокровищ ${tr.length}/${new Set(tr).size} вместо ${t.nt}`)
  for (const p of s.players) if (p.alive && p.life <= 0) throw new Error(`жизни ${p.name} = ${p.life}`)
}

function step(t: Table, i: number) {
  const s = t.s
  if (s.phase === 'gameover') { t.burst = 1; t.s = reduce(s, { type: 'nextGame' }); return }
  const who = waitingFor(s)
  if (!who.length) throw new Error('никто не ходит')
  const p = pick(who), acts = legalActions(s, p)
  t.s = reduce(s, pick(acts))
  steps++
  check(t)
  // новые строки журнала: значки механик всплывают над столом
  const total = t.s.logBase + t.s.log.length
  for (let k = Math.max(t.seen, t.s.logBase); k < total; k++) {
    const l = t.s.log[k - t.s.logBase]
    const e = TRIG.find(x => l.startsWith(x))
    if (e) { counts.set(e, (counts.get(e) ?? 0) + 1); const c = cell(i); parts.push({ x: c.x + (Math.random() - 0.5) * c.r, y: c.y, t: 0, text: e }) }
  }
  t.seen = total
  t.s.players.forEach((q, j) => { if (q.life !== t.life[j]) { t.flash[j] = q.life < t.life[j] ? -1 : 1; t.life[j] = q.life } })
}

function cell(i: number) {
  const n = tables.length, w = cv.width, h = cv.height
  const cols = Math.ceil(Math.sqrt((n * w) / h)), rows = Math.ceil(n / cols)
  const cw = w / cols, ch = h / rows
  return { x: (i % cols) * cw + cw / 2, y: Math.floor(i / cols) * ch + ch / 2, r: Math.min(cw, ch) * 0.32 }
}

function draw() {
  const dpr = devicePixelRatio || 1
  if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr }
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = '#0b050c'; g.fillRect(0, 0, cv.width, cv.height)
  tables.forEach((t, i) => {
    const c = cell(i), ps = t.s.players
    g.strokeStyle = t.burst > 0 ? `rgba(255,197,49,${t.burst})` : '#ffc5311a'
    g.lineWidth = 2 * dpr; g.beginPath(); g.arc(c.x, c.y, c.r * 1.35, 0, 7); g.stroke()
    t.burst = Math.max(0, t.burst - 0.02)
    g.font = `${12 * dpr}px system-ui`; g.textAlign = 'center'; g.fillStyle = '#ffc531aa'
    g.fillText(t.label, c.x, c.y + 4 * dpr)
    g.fillStyle = '#ffffff55'; g.fillText(`игра ${t.s.game} · раунд ${t.s.round}`, c.x, c.y + 18 * dpr)
    ps.forEach((p, j) => {
      const a = (j / ps.length) * Math.PI * 2 - Math.PI / 2
      const x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r
      const rad = Math.max(3, (p.alive ? 4 + p.life * 0.9 : 4) * dpr * Math.min(1, c.r / (60 * dpr)))
      g.globalAlpha = p.alive ? 1 : 0.25
      g.fillStyle = p.boss ? '#b14bff' : `hsl(${(p.portrait * 37) % 360} 70% 55%)`
      g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill()
      if (t.flash[j]) {
        g.strokeStyle = t.flash[j] < 0 ? '#ff4b3e' : '#5dff8a'; g.lineWidth = 3 * dpr
        g.beginPath(); g.arc(x, y, rad + 3 * dpr, 0, 7); g.stroke()
        t.flash[j] = t.flash[j] * 0.9; if (Math.abs(t.flash[j]) < 0.05) t.flash[j] = 0
      }
      g.globalAlpha = 1
      for (let m = 0; m < p.medals; m++) { g.fillStyle = '#ffc531'; g.beginPath(); g.arc(x - 6 * dpr + m * 6 * dpr, y + rad + 6 * dpr, 2.5 * dpr, 0, 7); g.fill() }
      if (p.creatures?.length) { g.fillStyle = '#9dff5d'; g.fillText('🐾'.repeat(p.creatures.length), x, y - rad - 4 * dpr) }
    })
  })
  g.font = `${18 * dpr}px system-ui`
  for (const p of parts) { g.globalAlpha = Math.max(0, 1 - p.t); g.fillText(p.text, p.x, p.y - p.t * 60 * dpr); p.t += 0.015 }
  g.globalAlpha = 1
  while (parts.length && parts[0].t >= 1) parts.shift()
  if (parts.length > 400) parts.splice(0, parts.length - 400)
}

function fail(i: number, e: unknown) {
  errors++
  const t = tables[i]
  $('errs').textContent = `❌ ${t.label}: ${(e as Error).message}\n${t.s.log.slice(-6).join('\n')}\n\n` + $('errs').textContent!.slice(0, 6000)
  console.error(e)
  tables[i] = newTable()
}

let last = performance.now(), lastSteps = 0
function frame(now: number) {
  const want = +($('tables') as HTMLInputElement).value
  while (tables.length < want) tables.push(newTable())
  tables.length = want
  if (!paused) {
    const k = +($('speed') as HTMLInputElement).value
    tables.forEach((t, i) => {
      for (let n = 0; n < k && tables[i] === t; n++) {
        try {
          step(t, i)
          if (t.s.phase === 'tournament') { done++; tables[i] = newTable(); tables[i].burst = 1 }
        } catch (e) { fail(i, e) }
      }
    })
  }
  draw()
  if (now - last > 1000) { $('sps').textContent = String(Math.round(((steps - lastSteps) * 1000) / (now - last))); last = now; lastSteps = steps }
  $('done').textContent = String(done); $('nerr').textContent = String(errors)
  $('trig').innerHTML = [...counts].map(([k, v]) => `${k} ${v}`).join(' · ')
  requestAnimationFrame(frame)
}
$('pause').onclick = () => { paused = !paused; $('pause').textContent = paused ? '▶ Дальше' : '⏸ Пауза' }
requestAnimationFrame(frame)
