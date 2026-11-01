// Все дополнения и их сочетания: случайные турниры — падения, зависания, потеря/задвоение карт, сокровищ, ЗПМП.
// Заодно — какие карты и сокровища дополнений так ни разу и не сыграли.
// Запуск: node scripts/sets-check.ts [турниров на сочетание]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { legalActions } from '../src/game/legal.ts'
import { SPELLS, TREASURES } from '../src/data/cards.ts'
import { PT } from '../src/game/passion.ts'
import { spellOf } from '../src/game/core.ts'
import { TRAP, type CardSet, type GameState } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 30)
const ALL: CardSet[] = ['base', 'swamp', 'castle', 'school', 'passion']
const combos: CardSet[][] = [...ALL.map(a => [a]), ...ALL.flatMap((a, i) => ALL.slice(i + 1).map(b => [a, b])), ALL]
let r = 777
const rnd = (n: number) => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r % n }
const count = (s: GameState) => ({
  spells: [...s.deck, ...s.discard, ...s.players.flatMap(p => [...p.hand, ...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id), ...(p.reservedWild ?? []), ...(p.creatures ?? []), ...(p.tucked != null ? [p.tucked] : [])])],
  tr: [...s.treasureDeck, ...s.treasureDiscard, ...s.players.flatMap(p => [...p.treasures, ...(p.later ?? []), ...((p.spell ?? []).some(c => c.id === TRAP) ? [2] : [])])],
  zp: [...(s.zpBag ?? []), ...s.players.flatMap(p => p.zp ?? [])],
  keep: s.players.flatMap(p => p.zpKeep ?? []),
})
function check(s: GameState, n: ReturnType<typeof count>, where: string) {
  const c = count(s)
  const bad = (name: string, a: number[], want: number) => { if (a.length !== want || new Set(a).size !== want) throw new Error(`${where}: ${name} ${a.length}/${new Set(a).size} вместо ${want}`) }
  bad('заклинаний', c.spells, n.spells.length); bad('сокровищ', c.tr, n.tr.length)
  // мешонка заводится лениво; отжатые «Бритвой» лежат вне игры до следующей
  if (s.sets?.includes('passion')) bad('ЗПМП', s.zpBag ? [...c.zp, ...c.keep] : c.zp, s.zpBag ? 20 : new Set(c.zp).size)
  for (const p of s.players) {
    if (!Number.isInteger(p.life)) throw new Error(`${where}: жизни ${p.name} = ${p.life}`)
    if (p.alive && p.life <= 0 && s.phase !== 'gameover') throw new Error(`${where}: жив с ${p.life} ж. ${p.name}`)
  }
  if (s.castle != null && !s.players[s.castle]) throw new Error(`${where}: замок у ${s.castle}`)
}
// смысл правил: сравнение состояния до и после шага
const zk = (p: GameState['players'][number], k: number) => (p.zp ?? []).some(z => z >> 1 === k)
function rules(a: GameState, b: GameState, fresh: string[]) {
  if (a.game !== b.game || b.phase === 'gameover' || a.phase === 'gameover') return
  for (const q of b.players) {
    const o = a.players[q.id]
    if (zk(o, 4) && zk(q, 4) && q.alive && q.life > o.life) throw new Error(`Горгонорея: ${q.name} накрутил жизни ${o.life}→${q.life}`)
    if (zk(q, 1) && q.alive && q.treasures.length && b.phase !== 'start') throw new Error(`Гнилой пень: у ${q.name} сокровища ${q.treasures}`)
    if (!o.alive && o.life !== q.life && !q.alive) throw new Error(`дохлый ${q.name}: жизни ${o.life}→${q.life}`)
    if (!o.alive && q.alive) throw new Error(`${q.name} ожил посреди игры`)
    if (o.treasures.includes(PT.clav) && o.alive && !q.alive && fresh.some(l => l.startsWith(`💋 ${q.name}:`))) throw new Error(`Клавитара не удержала ${q.name}`)
    if (zk(q, 5) && b.turn?.actor === q.id && (q.spell ?? []).some(c => c.id >= 0 && c.on && spellOf(c.id).type === 'wild')) throw new Error(`Кракены: у ${q.name} шальная в заклинании`)
  }
}
const played = new Map<string, number>(), seenErr = new Map<string, number>()
let games = 0
for (const sets of combos) for (let t = 0; t < N; t++) {
  const np = 2 + rnd(4)
  const setup = Array.from({ length: np }, (_, i) => ({ name: 'И' + i, portrait: rnd(41), ...(rnd(3) ? { lvl: 1 + rnd(5) } : {}) }))
  let s = create(setup, 5000 + t * 31 + combos.indexOf(sets), 2, [], sets)
  const n0 = count(s)
  const where = `[${sets}] #${t}`
  let steps = 0, seen = 0
  const all: string[] = []
  const grab = () => { const base = s.logBase ?? 0; for (let i = Math.max(seen, base); i < base + s.log.length; i++) all.push(s.log[i - base]); seen = base + s.log.length }
  try {
    while (s.phase !== 'tournament') {
      if (++steps > 40000) throw new Error('зависание')
      if (s.phase === 'gameover') { games++; s = reduce(s, { type: 'nextGame' }); continue }
      const who = waitingFor(s)
      if (!who.length) throw new Error(`никто не ходит (фаза ${s.phase})`)
      const p = who[rnd(who.length)], acts = legalActions(s, p)
      if (!acts.length) throw new Error(`у ${p} нет ходов (фаза ${s.phase}, ${s.pending?.prompt ?? ''})`)
      const prev = s, k0 = all.length
      s = reduce(s, acts[rnd(acts.length)]); grab()
      rules(prev, s, all.slice(k0))
      check(s, n0, where)
    }
  } catch (e) {
    const m = (e as Error).message.replace(/#\d+/, '#').replace(/\d+\/\d+ вместо \d+/, 'N')
    if (!seenErr.has(m)) { console.log(`\n✗ ${where}: ${(e as Error).message}\n` + s.log.slice(-14).join('\n')) }
    seenErr.set(m, (seenErr.get(m) ?? 0) + 1)
  }
  for (const l of all) { const m = l.match(/✦ [^:]+: «(.+)»/); if (m) played.set(m[1], (played.get(m[1]) ?? 0) + 1) }
  for (const l of all) for (const tr of TREASURES) if (l.includes(`«${tr.name}»`)) played.set('T:' + tr.name, (played.get('T:' + tr.name) ?? 0) + 1)
}
const never = SPELLS.filter(c => c.set && c.set !== 'base' && !played.has(c.name)).map(c => `${c.set}:${c.name}`)
const neverT = TREASURES.filter(c => c.set && c.set !== 'base' && !played.has('T:' + c.name)).map(c => `${c.set}:${c.name}`)
console.log(`\nИгр: ${games}. Ошибок по видам:`, [...seenErr].map(([k, n]) => `${n}× ${k}`).join('\n') || 'нет')
console.log(`Ни разу не сыграли (${never.length}):`, never.join(', '))
console.log(`Сокровища без упоминаний (${neverT.length}):`, neverT.join(', '))
