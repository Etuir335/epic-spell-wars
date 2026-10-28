// Баланс боссов: «игрок» (бот уровня P) против босса (бот уровня B), процент побед игрока.
// Запуск: node scripts/boss-sim.ts [боёв на босса] [уровень игрока] [уровень босса] [мс на ход]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { think } from '../src/ai/mcts.ts'
import type { BossKind } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 40), PL = +(process.argv[3] ?? 2), BL = +(process.argv[4] ?? 2), MS = +(process.argv[5] ?? 40)
const kinds = (process.argv[6] ?? 'none,grandpa,slime,mirror').split(',').map(k => (k === 'none' ? null : k as BossKind))
for (const boss of kinds) {
  let wins = 0, rounds = 0, lifeLeft = 0, t0 = Date.now()
  for (let g = 0; g < N; g++) {
    let s = create([{ name: 'Игрок', portrait: 0, bot: PL }, { name: 'Босс', portrait: 1, bot: BL, ...(boss ? { boss } : {}) }], 7000 + g, 1)
    for (let i = 0; i < 4000 && s.phase !== 'gameover' && s.phase !== 'tournament'; i++) {
      const p = waitingFor(s)[0]
      if (p == null) break
      const a = think(s, p, p === 0 ? PL : BL, MS)
      if (!a) throw new Error('нет хода')
      s = reduce(s, a)
    }
    rounds += s.round
    if (s.lastWinner === 0) { wins++; lifeLeft += s.players[0].life }
  }
  console.log(`${boss ?? 'без босса'}: игрок ${wins}/${N} (${Math.round((wins / N) * 100)}%), раундов в среднем ${(rounds / N).toFixed(1)}, жизней у победителя ${(lifeLeft / Math.max(1, wins)).toFixed(1)}, ${((Date.now() - t0) / 1000).toFixed(0)} с`)
}
