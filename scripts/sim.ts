// Случайные турниры: ищет падения движка, потерю/задвоение карт, зависания.
// Запуск: node scripts/sim.ts [число турниров]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { legalActions } from '../src/game/legal.ts'
import { TRAP, type GameState } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 50)

function check(s: GameState, where: string) {
  const spells = [...s.deck, ...s.discard, ...s.players.flatMap(p => [...p.hand, ...(p.spell ?? []).filter(c => c.id >= 0).map(c => c.id), ...(p.reservedWild ?? [])])]
  const tr = [...s.treasureDeck, ...s.treasureDiscard, ...s.players.flatMap(p => [...p.treasures, ...((p.spell ?? []).some(c => c.id === TRAP) ? [2] : [])])]
  const dead = [...s.deadDeck, ...s.deadDiscard, ...s.players.flatMap(p => p.deadCards)]
  const bad = (name: string, a: number[], n: number) => {
    if (a.length !== n || new Set(a).size !== n) throw new Error(`${where}: ${name} ${a.length}/${new Set(a).size} вместо ${n}`)
  }
  bad('заклинаний', spells, 134); bad('сокровищ', tr, 26); bad('дохлых', dead, 25)
  for (const p of s.players) if (p.life > 25 || (p.alive && p.life <= 0)) throw new Error(`${where}: жизни ${p.name} = ${p.life}`)
}

let rng = 12345
const rnd = (n: number) => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng % n }
const stats = { games: 0, rounds: 0, questions: 0, actions: 0, wins: [] as number[] }

for (let t = 0; t < N; t++) {
  const np = 2 + (t % 5)
  let s = create(Array.from({ length: np }, (_, i) => ({ name: 'Игрок' + (i + 1), portrait: i })), 1000 + t)
  let steps = 0
  while (s.phase !== 'tournament') {
    if (++steps > 20000) throw new Error(`турнир ${t}: зависание`)
    if (s.phase === 'gameover') { stats.games++; stats.rounds += s.round; s = reduce(s, { type: 'nextGame' }); continue }
    const who = waitingFor(s)
    if (!who.length) throw new Error(`турнир ${t}: никто не ходит, фаза ${s.phase}`)
    const p = who[rnd(who.length)]
    const acts = legalActions(s, p)
    if (!acts.length) throw new Error(`турнир ${t}: у ${p} нет ходов`)
    if (s.pending) stats.questions++
    stats.actions++
    try {
      s = reduce(s, acts[rnd(acts.length)])
    } catch (e) {
      console.log(s.log.slice(-15).join('\n'))
      throw new Error(`турнир ${t}: ${(e as Error).message}`)
    }
    try { check(s, `турнир ${t}, игра ${s.game}, раунд ${s.round}`) } catch (e) { console.log(s.log.slice(-12).join('\n')); throw e }
  }
  stats.games++
  stats.wins.push(np)
}
console.log(`OK: турниров ${N}, игр ${stats.games}, ср. раундов в игре ${(stats.rounds / Math.max(1, stats.games - N)).toFixed(1)}, действий ${stats.actions}, вопросов ${stats.questions}`)
