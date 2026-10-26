// Допустимые действия (для ботов и проверок).
import { T, spellOf } from './core.ts'
import { TRAP, type Action, type CardId, type GameState, type SpellType } from './types.ts'

type Slot = Exclude<SpellType, 'wild'>
const SLOTS: Slot[] = ['source', 'quality', 'delivery']

// Все различные заклинания игрока (одинаковые карты не повторяются; «Шальная магия» — в любое место).
export function spellOptions(s: GameState, player: number): { id: CardId; slot: Slot }[][] {
  const p = s.players[player]
  const pool: CardId[] = []
  const seen = new Set<number>()
  for (const id of p.hand) { const k = Math.floor(id / 10); if (!seen.has(k)) { seen.add(k); pool.push(id) } }
  // вторая «Шальная магия» тоже может пригодиться
  const wilds = p.hand.filter(id => spellOf(id).type === 'wild')
  if (wilds.length > 1) pool.push(...wilds.slice(1, 3))
  if (p.treasures.includes(T.trap)) pool.push(TRAP)
  const fits = (id: CardId, slot: Slot) => id === TRAP || spellOf(id).type === 'wild' || spellOf(id).type === slot
  const out: { id: CardId; slot: Slot }[][] = []
  const rec = (i: number, cur: { id: CardId; slot: Slot }[]) => {
    if (i === SLOTS.length) { if (cur.length) out.push(cur); return }
    rec(i + 1, cur)
    for (const id of pool) if (fits(id, SLOTS[i]) && !cur.some(c => c.id === id)) rec(i + 1, [...cur, { id, slot: SLOTS[i] }])
  }
  rec(0, [])
  return out
}

export function legalActions(s: GameState, player: number): Action[] {
  if (s.pending) {
    if (s.pending.player !== player) return []
    const a: Action[] = s.pending.options.map(o => ({ type: 'choose', player, value: o.v }))
    if (s.pending.optional) a.push({ type: 'choose', player, value: null })
    return a
  }
  if (s.phase === 'build' && s.players[player].alive && !s.players[player].spell) {
    const hasJet = s.players[player].treasures.includes(T.jetpack)
    return spellOptions(s, player).flatMap(cards => [
      { type: 'submit' as const, player, cards },
      ...(hasJet ? [{ type: 'submit' as const, player, cards, goLast: true }] : []),
    ])
  }
  return []
}
