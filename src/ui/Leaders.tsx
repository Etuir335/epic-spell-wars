// Таблица лидеров: игроки по кубкам; нажал — звание, арена, уровни колдунов и достижения.
import { useEffect, useState } from 'react'
import type { PlayerRow } from '../net/leaders'
import { ACHIEVEMENTS, RANKS } from '../stats'
import { ARENAS } from '../arenas'
import { MAX_LVL } from '../progression'
import { wizardName } from '../wizards'
import { Portrait } from './cards'

const rankAt = (xp: number) => RANKS.reduce((r, x) => xp >= x.xp ? x : r, RANKS[0])

export default function Leaders({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<{ rows: PlayerRow[]; me: string } | null | 'err'>(null)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    if (!import.meta.env.VITE_FB_API_KEY) { setBoard('err'); return }
    let off = false
    import('../net/leaders').then(m => m.topPlayers()).then(b => { if (!off) setBoard(b) }, () => { if (!off) setBoard('err') })
    return () => { off = true }
  }, [])
  return (
    <div className="screen leaders">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Лидеры</h2></div>
      {board === null && <p className="hint center">Загрузка…</p>}
      {board === 'err' && <p className="hint center">Таблица недоступна (нет связи).</p>}
      {board && board !== 'err' && (board.rows.length ? (
        <div className="board leaders-board">
          {board.rows.map((r, i) => {
            const rk = rankAt(r.xp), a = ARENAS[r.arena] ?? ARENAS[0], wiz = r.wiz.map((l, w) => ({ w, l })).filter(x => x.l > 0).sort((x, y) => y.l - x.l)
            return (
              <div key={r.uid} className={`${r.uid === board.me ? 'me' : ''}${open === r.uid ? ' open' : ''}`} onClick={() => setOpen(o => o === r.uid ? null : r.uid)}>
                <div className="lb-row">
                  <i>{i + 1}</i><Portrait i={r.portrait} size={30} />
                  <span>{r.name}<small>{rk.icon} {rk.name}</small></span>
                  <em title="Достижения">🎖️{r.ach.length}</em><b>🏆 {r.cups}</b>
                </div>
                {open === r.uid && (
                  <div className="lb-more">
                    <p>{a.icon} Арена «{a.name}» · {r.xp} опыта · побед {r.wins} из {r.games}</p>
                    <h4>Колдуны <small>{wiz.length}</small></h4>
                    <div className="lb-wiz">
                      {wiz.map(x => <span key={x.w} title={wizardName(x.w)} className={x.l >= MAX_LVL ? 'max' : ''}><Portrait i={x.w} size={34} /><b>{x.l}</b></span>)}
                    </div>
                    <h4>Достижения <small>{r.ach.length} / {ACHIEVEMENTS.length}</small></h4>
                    <div className="lb-ach">
                      {ACHIEVEMENTS.map(x => <span key={x.id} title={`${x.name}: ${x.text}`} className={r.ach.includes(x.id) ? 'got' : ''}>{x.icon}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : <p className="hint center">Пока никого — сыграй на арене!</p>)}
      <p className="hint center">Нажми на игрока — покажу его колдунов и достижения. Таблица обновляется после твоих боёв.</p>
    </div>
  )
}
