// Экран арен: кубки, лестница арен, бой на арене, вступление при открытии новой арены.
import { useEffect, useState } from 'react'
import { ARENAS, arenaFight } from '../arenas'
import { create } from '../game/engine'
import type { GameState } from '../game/types'
import { dailyMe } from './Daily'
import { saveLocal } from './store'
import Tutorial from './Tutorial'
import { updateStats, useStatsData } from './useStats'

export const ARENA_KEY = 'esw-arena-game'

export default function Arenas({ onPlay, onBack }: { onPlay: (s: GameState) => void; onBack: () => void }) {
  const st = useStatsData()
  const cups = st.cups ?? 0, cur = st.arena ?? 0
  const open = (i: number) => ARENAS[i].ready && (!!st.arenaSkip || i <= cur)
  // новая открытая арена со вступлением, которое ещё не показывали
  const unseen = ARENAS.findIndex((a, i) => i > (st.arenaSeen ?? 0) && open(i) && a.intro.length)
  const [intro, setIntro] = useState<number | null>(unseen > 0 ? unseen : null)
  const [sure, setSure] = useState(false)
  const next = ARENAS[cur + 1]
  const pct = next ? Math.min(100, Math.round(((cups - ARENAS[cur].cups) / (next.cups - ARENAS[cur].cups)) * 100)) : 100

  // лестница снизу вверх — сразу к своей арене
  useEffect(() => { document.querySelector('.arena-card.cur')?.scrollIntoView({ block: 'center' }) }, [])

  const fight = (i: number) => {
    if (i > (st.arenaSeen ?? 0) && ARENAS[i].intro.length) { setIntro(i); return }
    const f = arenaFight(i, dailyMe())
    const s = create(f.setup, (Math.random() * 2 ** 31) | 0, 1, f.mods)
    saveLocal(s, ARENA_KEY)
    onPlay(s)
  }
  const seen = (i: number) => updateStats(x => { x.arenaSeen = Math.max(x.arenaSeen ?? 0, i) })

  return (
    <div className="screen arenas">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Арены</h2></div>
      <div className="cups-card">
        <div className="cups-big"><span className="trophy">🏆</span>{cups}</div>
        <div className="cups-track">
          <span>{ARENAS[cur].icon}</span>
          <div className="xp-bar"><i style={{ width: `${pct}%` }} /></div>
          <span>{next ? next.icon : '👑'}</span>
        </div>
        <small>{next ? `До арены «${next.name}» — ${Math.max(0, next.cups - cups)} 🏆` : 'Все арены пройдены!'}</small>
      </div>
      <div className="arena-road">
        {ARENAS.map((a, i) => ({ a, i })).reverse().map(({ a, i }) => (
          <div key={i} className="road-step">
            <div className={`arena-card${i === cur ? ' cur' : ''}${open(i) ? '' : ' locked'}${a.ready ? '' : ' soon'}`}
              style={{ ['--s1' as string]: a.sky[0], ['--s2' as string]: a.sky[1], ['--s3' as string]: a.sky[2] }}>
              <div className="arena-scene">
                <span className="arena-rays" />
                <span className="arena-icon">{a.icon}</span>
                <span className="arena-floor" />
                {i === cur && <span className="arena-you">Ты здесь</span>}
                {!open(i) && <span className="arena-lock">{a.ready ? '🔒' : 'Скоро'}</span>}
              </div>
              <div className="arena-ribbon"><small>Арена {i + 1}</small><b>{a.name}</b></div>
              <em>{a.text}</em>
              {open(i) && <button className={`btn gold arena-go${i === cur ? ' hot' : ''}`} onClick={() => fight(i)}>⚔️ В бой</button>}
            </div>
            {i > 0 && <div className="road-mark"><span>🏆 {a.cups}</span></div>}
          </div>
        ))}
      </div>
      <p className="hint center">Победа +40 🏆, поражение −5, по месту в бою на многих. Против живых ×1,5, первая победа за день +50, испытание дня +20. Ниже порога своей арены кубки не падают.</p>
      {!st.arenaSkip && ARENAS.some((a, i) => a.ready && i > cur) && (
        sure
          ? <button className="btn wide danger" onClick={() => { updateStats(x => { x.arenaSkip = true }); setSure(false) }}>Да, открыть все арены (кубки за это не дают)</button>
          : <button className="btn wide ghost" onClick={() => setSure(true)}>Я опытный — открыть все арены</button>
      )}
      {intro != null && (
        <Tutorial slides={ARENAS[intro].intro} done="Понятно!" onClose={() => { seen(intro); setIntro(null) }} />
      )}
    </div>
  )
}
