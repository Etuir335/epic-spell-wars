// Простой бот (временный, до MCTS в фазе 5): крупные заклинания с хорошими приходами, бьёт самых хилых.
import { SPELLS } from '../data/cards'
import { legalActions } from '../game/legal'
import type { Action, GameState } from '../game/types'

export function simpleBotMove(s: GameState, player: number): Action | null {
  const acts = legalActions(s, player)
  if (!acts.length) return null
  const rnd = (n: number) => Math.floor(Math.random() * n)
  if (s.pending) {
    const opts = s.pending.options
    // выбор врага: самый хилый (добить); игроки-варианты, где есть сам бот, — не себя
    if (opts.every(o => o.player != null)) {
      const foes = opts.filter(o => o.player !== player)
      const pool = foes.length ? foes : opts
      const best = pool.reduce((a, b) => (s.players[a.player!].life <= s.players[b.player!].life ? a : b))
      return { type: 'choose', player, value: best.v }
    }
    // перебросы и прочие «да/нет» — наугад, но отказ от необязательного — реже
    return acts[rnd(acts.length)]
  }
  // заклинание: оценка — число карт + знаки одной школы + сила прихода
  let best: Action = acts[0], score = -1e9
  for (const a of acts) {
    if (a.type !== 'submit') continue
    const cards = a.cards.map(c => (c.id < 0 ? null : SPELLS[Math.floor(c.id / 10)]))
    const schools = cards.map(c => c?.school).filter(Boolean)
    const same = Math.max(0, ...schools.map(x => schools.filter(y => y === x).length))
    const v = cards.length * 3 + same * 2 + (cards.some(c => c?.type === 'delivery') ? 2 : 0) - (a.goLast ? 1 : 0) + Math.random() * 3
    if (v > score) { score = v; best = a }
  }
  return best
}
