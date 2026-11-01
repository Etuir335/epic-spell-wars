// Страсть у ботов: сколько заражений, лечений, захватов замка и действий сокровищ. Запуск: node scripts/passion-stats.ts [партий]
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { think } from '../src/ai/mcts.ts'

const N = +(process.argv[2] ?? 10)
const PAT: [string, RegExp][] = [
  ['заражений', /подхватывает/], ['передач', /💋 .+ → /], ['лечений', /💊/], ['захватов', /захватывает замок/], ['за стенами', /за стенами/],
  ['потерь ЗПМП', /💋 .+: .+ — минус/], ['пень', /Гнилой пень/], ['нежданчик', /Нежданчик .+ лечит/], ['гепатит', /Гепатит Ы»: .+ убирает/], ['кракены', /кракены/],
]
const cnt: Record<string, number> = {}, acts: Record<string, number> = {}
let games = 0, rounds = 0, zpDeath = 0, deaths = 0, maxZp = 0
for (let g = 0; g < N; g++) {
  let s = create([0, 1, 2, 3].map(i => ({ name: 'Б' + i, portrait: i, bot: 2 })), 700 + g, 1, [], ['passion'] as never)
  for (let i = 0; i < 5000 && s.phase !== 'tournament'; i++) {
    if (s.phase === 'gameover') { s = reduce(s, { type: 'nextGame' }); continue }
    const p = waitingFor(s)[0]
    if (p == null) break
    const a = think(s, p, 2, 40)
    if (!a) throw new Error('нет хода')
    if (a.type === 'choose' && typeof a.value === 'string' && a.value[0] === 't') acts[a.value] = (acts[a.value] ?? 0) + 1
    const n0 = s.logBase + s.log.length
    const alive0 = s.players.filter(q => q.alive).length
    s = reduce(s, a)
    const fresh = s.log.slice(Math.max(0, n0 - s.logBase))
    for (const l of fresh) for (const [k, r] of PAT) if (r.test(l)) cnt[k] = (cnt[k] ?? 0) + 1
    const dead = alive0 - s.players.filter(q => q.alive).length
    if (dead > 0) { deaths += dead; if (fresh.some(l => /💋 .+ — минус/.test(l))) zpDeath += dead }
    for (const q of s.players) maxZp = Math.max(maxZp, q.zp?.length ?? 0)
  }
  games += s.game; rounds += s.turns.length ? 0 : 0
}
console.log(`игр ${games}, смертей ${deaths} (с потерей от ЗПМП в тот же ход ${zpDeath}), макс ЗПМП у одного ${maxZp}`)
console.log('на игру:', Object.entries(cnt).map(([k, v]) => `${k} ${(v / games).toFixed(1)}`).join(', '))
console.log('действия сокровищ:', JSON.stringify(acts))
