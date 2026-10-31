// Баланс способностей: бой 4 колдунов (быстрые боты), один — со способностью на уровне L, трое — без.
// Без способности у каждого 25% побед; цель — ур. 1 ≈ 28–30%, ур. 5 ≈ 40% (см. transcript/progression.md).
// Запуск: node scripts/ability-balance.ts [партий на колдуна] [уровни через запятую] [номера колдунов через запятую]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { fastMove } from '../src/ai/mcts.ts'
import { ABILITIES, RARITY_NAME } from '../src/game/abilities.ts'
import type { SetupPlayer } from '../src/game/types.ts'

const N = +(process.argv[2] ?? 200)
const LEVELS = (process.argv[3] ?? '1,5').split(',').map(Number)
const ONLY = process.argv[4]?.split(',').map(Number)
const NP = 4

function winRate(w: number, lvl: number) {
  let wins = 0
  for (let g = 0; g < N; g++) {
    const seat = g % NP // место колдуна со способностью — по кругу, чтобы не мешал порядок хода
    const others = [...Array(41).keys()].filter(k => k !== w)
    const setup: SetupPlayer[] = Array.from({ length: NP }, (_, i) => i === seat
      ? { name: 'Тест', portrait: w, bot: 2, lvl }
      : { name: 'Б' + i, portrait: others[(g * 7 + i * 13) % others.length], bot: 2 })
    let s = create(setup, 77_000 + g * 31 + w, 1)
    for (let i = 0; i < 6000 && s.phase !== 'tournament' && s.phase !== 'gameover'; i++) {
      const p = waitingFor(s)[0]
      if (p == null) break
      const a = fastMove(s, p)
      if (!a) break
      s = reduce(s, a)
    }
    if (s.lastWinner === seat) wins++
  }
  return wins / N
}

// контроль: без способностей место 0 должно брать ~25%
const t0 = Date.now()
const list = ONLY ?? [...ABILITIES.keys()]
const rows: string[] = []
for (const w of list) {
  const a = ABILITIES[w]
  const r = LEVELS.map(l => winRate(w, l))
  const cells = r.map(x => `${(x * 100).toFixed(0)}%`.padStart(4))
  const flag = r.some((x, i) => (LEVELS[i] === 1 && (x < 0.25 || x > 0.34)) || (LEVELS[i] === 5 && (x < 0.33 || x > 0.48))) ? '  ⚠' : ''
  rows.push(`${String(w).padStart(2)} ${a.name.padEnd(22)} ${RARITY_NAME[a.rarity].padEnd(11)} ${cells.join(' ')}${flag}`)
  console.log(rows.at(-1))
}
console.log(`\nУровни ${LEVELS.join('/')}, ${N} партий на колдуна и уровень, ${((Date.now() - t0) / 1000).toFixed(0)} с`)
