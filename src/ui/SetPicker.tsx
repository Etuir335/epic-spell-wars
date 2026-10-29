// Выбор набора карт для турнира и дружеского боя: только то, что открыто на аренах.
import { ARENAS, RULES, type Rules } from '../arenas'
import type { CardSet } from '../game/types'
import { useStatsData } from './useStats'

const CHOICES: { sets: CardSet[]; label: string }[] = [
  { sets: ['base'], label: '🌋 Основа' },
  { sets: ['swamp'], label: '🍄 Болото' },
  { sets: ['base', 'swamp'], label: '🌋+🍄 Вместе' },
]
// Набор открыт, если открыта его арена (или нажато «я уже играл в настолку»)
function useUnlocked(): (set: CardSet) => boolean {
  const st = useStatsData()
  return set => set === 'base' || !!st.arenaSkip || ARENAS.some((a, i) => a.sets?.includes(set) && i <= (st.arena ?? 0))
}
export const rulesLabel = (r?: Rules) => RULES.find(x => x.v === (r ?? 'plain'))!.label

// Правила арены: открываются вместе с ареной
export function RulesPicker({ value, onChange }: { value?: Rules; onChange: (r: Rules) => void }) {
  const st = useStatsData()
  const ok = (a: number) => !!st.arenaSkip || a <= (st.arena ?? 0)
  return (
    <div className="set-pick">
      <span>Правила:</span>
      <div className="seg">
        {RULES.map(r => <button key={r.v} className={(value ?? 'plain') === r.v ? 'on' : ''} disabled={!ok(r.arena)} onClick={() => onChange(r.v)}>{ok(r.arena) ? r.label : '🔒 ' + r.label.split(' ').slice(1).join(' ')}</button>)}
      </div>
      {(value ?? 'plain') !== 'plain' && <small className="hint">{value === 'boss' ? 'За стол садится случайный босс — он враг всем.' : 'В каждом турнире — два случайных безумных правила.'}</small>}
    </div>
  )
}

export const setsLabel = (sets?: CardSet[]) => CHOICES.find(c => c.sets.join() === (sets ?? ['base']).join())?.label ?? '🌋 Основа'

export default function SetPicker({ value, onChange }: { value?: CardSet[]; onChange: (sets: CardSet[]) => void }) {
  const open = useUnlocked()
  const cur = (value ?? ['base']).join()
  const locked = CHOICES.some(c => !c.sets.every(open))
  return (
    <div className="set-pick">
      <span>Карты:</span>
      <div className="seg">
        {CHOICES.map(c => {
          const ok = c.sets.every(open)
          return <button key={c.label} className={cur === c.sets.join() ? 'on' : ''} disabled={!ok} onClick={() => onChange(c.sets)}>{ok ? c.label : '🔒 ' + c.label.split(' ').slice(1).join(' ')}</button>
        })}
      </div>
      {locked && <small className="hint">Дополнения открываются на аренах.</small>}
    </div>
  )
}
