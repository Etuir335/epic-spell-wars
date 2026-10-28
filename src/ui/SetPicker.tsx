// Выбор набора карт для турнира и дружеского боя: только то, что открыто на аренах.
import { ARENAS } from '../arenas'
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
