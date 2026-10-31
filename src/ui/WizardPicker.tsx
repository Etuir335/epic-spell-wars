// Выбор колдуна как в настолке: планшеты целиком (имя напечатано на самом планшете), по нажатию — во весь экран.
// mine — выбираешь своего: не найденные в сундуках закрыты, у открытых виден уровень.
import { useState } from 'react'
import { cardUrl } from '../assets'
import { wizLvl } from '../progression'
import { useStatsData } from './useStats'

export const WIZARDS = 41

export default function WizardPicker({ value, taken = [], onPick, onClose, mine }: { value: number; taken?: number[]; onPick: (p: number) => void; onClose: () => void; mine?: boolean }) {
  const [look, setLook] = useState<number | null>(null)
  const st = useStatsData(), lvl = (k: number) => (mine ? wizLvl(st, k) : -1)
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet wiz-sheet" onClick={e => e.stopPropagation()}>
        <h3>Выбери колдуна</h3>
        <div className="wiz-grid">
          {Array.from({ length: WIZARDS }, (_, k) => (
            <button key={k} className={`${value === k ? 'on' : ''}${taken.includes(k) || lvl(k) === 0 ? ' taken' : ''}`} onClick={() => setLook(k)}>
              <img src={cardUrl('wizards', k)} alt="" loading="lazy" />
              {lvl(k) > 0 && <span className="wiz-lvl">ур. {lvl(k)}</span>}
              {lvl(k) === 0 && <span className="wiz-lock">🔒</span>}
            </button>
          ))}
        </div>
        <button className="btn wide ghost" onClick={onClose}>Закрыть</button>
      </div>
      {look != null && (
        <div className="wiz-look" onClick={e => { e.stopPropagation(); setLook(null) }}>
          <img src={cardUrl('wizards', look)} alt="" onClick={e => e.stopPropagation()} />
          <div className="wiz-look-btns" onClick={e => e.stopPropagation()}>
            <button className="btn" onClick={() => setLook((look + WIZARDS - 1) % WIZARDS)}>←</button>
            {lvl(look) === 0
              ? <button className="btn" disabled>🔒 Найди в сундуках</button>
              : <button className="btn gold" onClick={() => { onPick(look); onClose() }}>{value === look ? '✓ Уже мой' : 'Выбрать этого колдуна'}</button>}
            <button className="btn" onClick={() => setLook((look + 1) % WIZARDS)}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}
