// Настройка локальной партии: 2–6 мест (человек или бот), имена, портреты, медалей до победы.
import { useState } from 'react'
import type { CardSet, SetupPlayer } from '../game/types'
import SetPicker, { RulesPicker } from './SetPicker'
import type { Rules } from '../arenas'
import { Portrait } from './cards'
import WizardPicker from './WizardPicker'
import { wizardName } from '../wizards'

const PORTRAITS = 41
const BOT_LEVELS = ['Человек', 'Бот: лёгкий', 'обычный', 'сильный']

export default function Setup({ onStart, onBack }: { onStart: (p: SetupPlayer[], medals: number, sets: CardSet[], rules: Rules) => void; onBack: () => void }) {
  const [seats, setSeats] = useState<SetupPlayer[]>(() => {
    const me = { name: 'Я', portrait: rnd() }
    return [me, botSeat([me])]
  })
  const [medals, setMedals] = useState(2)
  const [sets, setSets] = useState<CardSet[]>(['base'])
  const [rules, setRules] = useState<Rules>('plain')
  const [pick, setPick] = useState<number | null>(null)

  const upd = (i: number, p: Partial<SetupPlayer>) => setSeats(ss => ss.map((s, k) => (k === i ? { ...s, ...p } : s)))
  const add = () => setSeats(ss => [...ss, botSeat(ss)])
  const del = (i: number) => setSeats(ss => ss.filter((_, k) => k !== i))
  const ok = seats.length >= 2 && seats.every(s => s.name.trim())

  return (
    <div className="screen setup">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Новый турнир</h2></div>
      {seats.map((s, i) => (
        <div className="seat-row" key={i}>
          <button className="seat-portrait" onClick={() => setPick(i)}><Portrait i={s.portrait} size={56} /></button>
          <div className="seat-main">
            <input value={s.name} maxLength={14} onChange={e => upd(i, { name: e.target.value })} />
            <div className="seg">
              {BOT_LEVELS.map((l, k) => (
                <button key={l} className={(s.bot ?? 0) === k ? 'on' : ''} onClick={() => upd(i, k && !s.bot && s.name !== 'Я' ? { bot: k, name: wizardName(s.portrait) } : { bot: k || undefined })}>{l}</button>
              ))}
            </div>
          </div>
          {seats.length > 2 && <button className="seat-del" onClick={() => del(i)}>✕</button>}
        </div>
      ))}
      {seats.length < 6 && <button className="btn wide ghost" onClick={add}>＋ Добавить колдуна</button>}
      <div className="row">
        <span>Медалей до победы:</span>
        <div className="seg">{[1, 2, 3].map(n => <button key={n} className={medals === n ? 'on' : ''} onClick={() => setMedals(n)}>{n}</button>)}</div>
      </div>
      <SetPicker value={sets} onChange={setSets} />
      <RulesPicker value={rules} onChange={setRules} />
      <p className="hint">Несколько людей — играют по очереди на одном телефоне («передайте телефон»).</p>
      <button className="btn wide gold" disabled={!ok} onClick={() => onStart(seats.map(s => ({ ...s, name: s.name.trim() })), medals, sets, rules)}>В бой!</button>

      {pick != null && (
        <WizardPicker value={seats[pick].portrait} taken={seats.filter((_, k) => k !== pick).map(s => s.portrait)}
          onPick={k => upd(pick, seats[pick].bot && seats[pick].name === wizardName(seats[pick].portrait) ? { portrait: k, name: wizardName(k) } : { portrait: k })} onClose={() => setPick(null)} />
      )}
    </div>
  )
}

function rnd() { return Math.floor(Math.random() * PORTRAITS) }
// бот получает ник своего колдуна
function botSeat(ss: SetupPlayer[]): SetupPlayer { const portrait = freePortrait(ss); return { name: wizardName(portrait), portrait, bot: 2 } }
function freePortrait(ss: SetupPlayer[]) {
  for (;;) { const k = rnd(); if (!ss.some(s => s.portrait === k)) return k }
}
