// Безумные правила и боссы: случайные турниры — падения, зависания, потеря/задвоение карт.
// Запуск: node scripts/madness-check.ts [число турниров]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { legalActions } from '../src/game/legal.ts'
import { TRAP, type BossKind, type CardSet, type GameState, type Mod } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 200)
const MODS: Mod[] = ['wild', 'reverse', 'blood', 'swap', 'dice', 'zombie', 'greedy', 'fever', 'mirror']
const BOSSES: BossKind[] = ['grandpa', 'slime', 'mirror']
let NS = 134, NT = 26
function check(s: GameState, where: string) {
  const spells = [...s.deck, ...s.discard, ...s.players.flatMap(p => [...p.hand, ...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id), ...(p.reservedWild ?? []), ...(p.creatures ?? [])])]
  const tr = [...s.treasureDeck, ...s.treasureDiscard, ...s.players.flatMap(p => [...p.treasures, ...((p.spell ?? []).some(c => c.id === TRAP) ? [2] : [])])]
  const bad = (name: string, a: number[], n: number) => { if (a.length !== n || new Set(a).size !== n) throw new Error(`${where}: ${name} ${a.length}/${new Set(a).size} вместо ${n}`) }
  bad('заклинаний', spells, NS); bad('сокровищ', tr, NT)
  for (const p of s.players) if (p.alive && p.life <= 0) throw new Error(`${where}: жизни ${p.name} = ${p.life}`)
}
let r = 4242
const rnd = (n: number) => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r % n }
const used = new Map<string, number>()
for (let t = 0; t < N; t++) {
  const mods = MODS.filter(() => rnd(3) === 0)
  const boss = t % 3 === 0 ? BOSSES[rnd(3)] : undefined
  const np = boss ? 2 : 2 + (t % 4)
  const setup = Array.from({ length: np }, (_, i) => ({ name: 'И' + i, portrait: i, ...(boss && i === 1 ? { boss, bot: 3 } : {}) }))
  const sets: CardSet[] = [['base'], ['swamp'], ['base', 'swamp']][t % 3] as CardSet[]
  let s = create(setup, 9000 + t, 2, mods, sets)
  NS = s.deck.length + s.players.reduce((a, p) => a + p.hand.length, 0); NT = s.treasureDeck.length
  let steps = 0
  while (s.phase !== 'tournament') {
    if (++steps > 40000) throw new Error(`турнир ${t} [${mods}] ${boss ?? ''}: зависание`)
    if (s.phase === 'gameover') { s = reduce(s, { type: 'nextGame' }); continue }
    const who = waitingFor(s), p = who[rnd(who.length)], acts = legalActions(s, p)
    try { s = reduce(s, acts[rnd(acts.length)]) } catch (e) { console.log(s.log.slice(-12).join('\n')); throw new Error(`турнир ${t} [${sets}] [${mods}] ${boss ?? ''}: ${(e as Error).message}`) }
    try { check(s, `турнир ${t} [${sets}] [${mods}] ${boss ?? ''}`) } catch (e) { console.log(s.log.slice(-14).join('\n')); throw e }
  }
  for (const l of s.log) for (const k of ['🪞', '🩸', '🌕', '🔄', '💰', '🧟', '👴', '🟢', '🐾', '✨', '🍄', '💥', '🛡']) if (l.startsWith(k)) used.set(k, (used.get(k) ?? 0) + 1)
}
console.log('Сработало:', [...used].map(([k, n]) => `${k}${n}`).join(' '))
console.log(`OK: ${N} турниров`)
