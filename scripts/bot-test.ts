// Сила ботов: дуэли «умный бот» (думает budget мс) против быстрой случайной стратегии.
// Запуск: node scripts/bot-test.ts [партий] [мс на ход]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { fastMove, think } from '../src/ai/mcts.ts'

const N = +(process.argv[2] ?? 10), MS = +(process.argv[3] ?? 60)
let wins = 0, games = 0, moves = 0, t0 = Date.now()
for (let g = 0; g < N; g++) {
  let s = create([{ name: 'Умный', portrait: 0, bot: 2 }, { name: 'Случайный', portrait: 1, bot: 1 }], 500 + g, 1)
  for (let i = 0; i < 3000 && s.phase !== 'tournament'; i++) {
    const p = waitingFor(s)[0]
    if (p == null) break
    const a = p === 0 ? think(s, 0, 2, MS) : fastMove(s, p)
    if (!a) throw new Error('нет хода')
    if (p === 0) moves++
    s = reduce(s, a)
  }
  games++
  if (s.lastWinner === 0) wins++
}
console.log(`умный бот: ${wins}/${games} побед, ходов ${moves}, ${((Date.now() - t0) / 1000).toFixed(1)} с`)
