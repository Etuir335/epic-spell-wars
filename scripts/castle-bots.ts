// Боты в замке: партии без падений, время хода. Запуск: node scripts/castle-bots.ts [партий]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { think } from '../src/ai/mcts.ts'

const N = +(process.argv[2] ?? 5)
let moves = 0, slow = 0
const t0 = Date.now()
for (let g = 0; g < N; g++) {
  let s = create([0, 1, 2, 3].map(i => ({ name: 'Б' + i, portrait: i, bot: 2 })), 300 + g, 1, [], (process.argv[3] ?? 'castle').split('+') as never)
  for (let i = 0; i < 5000 && s.phase !== 'tournament'; i++) {
    if (s.phase === 'gameover') { s = reduce(s, { type: 'nextGame' }); continue }
    const p = waitingFor(s)[0]
    if (p == null) break
    const t = Date.now()
    const a = think(s, p, 2, 40)
    if (Date.now() - t > 400) slow++
    if (!a) throw new Error('нет хода')
    s = reduce(s, a); moves++
  }
  console.log(`партия ${g}: ${s.phase}, раундов ${s.round}, победитель ${s.lastWinner}, кровь ${s.players.map(p => p.blood ?? 0).join(',')}, замок ${s.castle}`)
}
console.log(`ходов ${moves}, медленных ${slow}, ${((Date.now() - t0) / 1000).toFixed(0)} с`)
