// Куда бьют боты: доля урона ботов по месту 0 (в игре там человек). Ровно — 33% при 4 колдунах.
// Запуск: node scripts/target-check.ts [игр] [fast|mcts] [пощада ботов 0..1] — как играет место 0.
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { fastMove, think } from '../src/ai/mcts.ts'
import { legalActions } from '../src/game/legal.ts'

const N = +(process.argv[2] ?? 20), seat0 = process.argv[3] ?? 'fast', mercy = +(process.argv[4] ?? 0)
const got = [0, 0, 0, 0], early = [0, 0, 0, 0]
let deaths0 = 0, games = 0
for (let g = 0; g < N; g++) {
  let s = create(Array.from({ length: 4 }, (_, i) => ({ name: 'И' + i, portrait: i, ...(i ? { bot: 2, mercy } : {}) })), 500 + g)
  let seen = 0
  while (s.phase !== 'gameover' && s.phase !== 'tournament') {
    const who = waitingFor(s)
    if (!who.length) break
    const p = who[0]
    const a = p === 0 && seat0 === 'fast' ? fastMove(s, p) ?? legalActions(s, p)[0] : think(s, p, 2, 60)
    s = reduce(s, a!)
    for (; seen < s.evBase + s.ev.length; seen++) {
      const e = s.ev[seen - s.evBase]
      if (!e || e.k !== 'dmg' || e.from == null || e.from === 0 || e.from === e.p) continue
      got[e.p] += e.n
      if (s.round <= 2) early[e.p] += e.n
    }
    if (s.game > 1) break
  }
  games++
  if (!s.players[0].alive || s.lastWinner !== 0) deaths0++
}
const pc = (a: number[]) => a.map(x => (100 * x / a.reduce((u, v) => u + v, 0)).toFixed(0) + '%').join(' ')
console.log(`место 0 = ${seat0}, пощада ${mercy}, игр ${games}, место 0 не выиграло ${deaths0}. Урон ботов по местам: ${pc(got)}; в 1–2 раунде: ${pc(early)}`)
