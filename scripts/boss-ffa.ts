// Босс против нескольких колдунов (все враги всем): доля побед босса. Честная доля — 1/(игроков).
// Запуск: node scripts/boss-ffa.ts [боёв] [колдунов против босса]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { think } from '../src/ai/mcts.ts'
import type { BossKind } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 60), K = +(process.argv[3] ?? 2)
for (const boss of ['grandpa', 'slime', 'mirror'] as BossKind[]) {
  let bossWins = 0
  for (let g = 0; g < N; g++) {
    const setup = [...Array.from({ length: K }, (_, i) => ({ name: 'И' + i, portrait: i, bot: 2 })), { name: 'Босс', portrait: 9, bot: 2, boss }]
    let s = create(setup, 5000 + g, 1)
    for (let i = 0; i < 6000 && s.phase !== 'gameover' && s.phase !== 'tournament'; i++) {
      const p = waitingFor(s)[0]
      if (p == null) break
      s = reduce(s, think(s, p, 2, 25)!)
    }
    if (s.lastWinner === K) bossWins++
  }
  console.log(`${boss} против ${K}: босс побеждает ${Math.round((bossWins / N) * 100)}% (честно ≈ ${Math.round(100 / (K + 1))}%)`)
}
