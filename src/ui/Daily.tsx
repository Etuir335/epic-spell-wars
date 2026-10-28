// Экран испытания дня: правила дня, босс, лучший результат, таблица рекордов.
import { useEffect, useState } from 'react'
import { BOSS_INFO, MOD_INFO, dailyOf, dailySetup, dailyScore, type Daily } from '../daily'
import { create } from '../game/engine'
import type { GameState } from '../game/types'
import type { ScoreRow } from '../net/dailyBoard'
import { tgUser } from '../telegram'
import { Portrait } from './cards'
import { clearLocal, loadLocal, saveLocal } from './store'
import { getStats, grantCups, updateStats } from './useStats'

export const DAILY_KEY = 'esw-daily-game'
const netConfigured = () => !!import.meta.env.VITE_FB_API_KEY // без загрузки Firebase
const BEST = 'esw-daily-best'

export function dailyMe(): { name: string; portrait: number } {
  try {
    const p = JSON.parse(localStorage.getItem('esw-profile') ?? 'null') as { name?: string; portrait?: number } | null
    if (p?.name) return { name: p.name.slice(0, 16), portrait: p.portrait ?? 0 }
  } catch { /* нет профиля */ }
  return { name: tgUser()?.name || 'Колдун', portrait: 3 }
}
export function loadBest(key: string): { score: number; win: boolean } | null {
  try { const b = JSON.parse(localStorage.getItem(BEST) ?? 'null') as { key: string; score: number; win: boolean } | null; return b?.key === key ? b : null } catch { return null }
}

// Партия закончилась: запомнить лучший результат и отправить в таблицу.
export function finishDaily(s: GameState, d: Daily) {
  const { score, win } = dailyScore(s)
  const best = loadBest(d.key)
  // кубки за испытание — один раз в день, за участие
  if (getStats().dailyCupDay !== d.key) { updateStats(st => { st.dailyCupDay = d.key }); grantCups(20) }
  if (!best || score > best.score) try { localStorage.setItem(BEST, JSON.stringify({ key: d.key, score, win })) } catch { /* не важно */ }
  if (netConfigured()) {
    const me = s.players[0]
    void import('../net/dailyBoard').then(m => m.submitScore(d.key, { name: me.name, portrait: me.portrait, score, win })).catch(() => {})
  }
  return { score, win }
}

export default function DailyScreen({ onPlay, onBack, last }: { onPlay: (s: GameState) => void; onBack: () => void; last: { score: number; win: boolean } | null }) {
  const d = dailyOf()
  const saved = loadLocal(DAILY_KEY)
  const going = saved && saved.tid === d.seed && saved.phase !== 'tournament' ? saved : null
  const best = loadBest(d.key)
  const [board, setBoard] = useState<{ rows: ScoreRow[]; me: string } | null | 'err'>(null)
  useEffect(() => {
    if (!netConfigured()) { setBoard('err'); return }
    let off = false
    import('../net/dailyBoard').then(m => m.topScores(d.key)).then(b => { if (!off) setBoard(b) }, () => { if (!off) setBoard('err') })
    return () => { off = true }
  }, [d.key, last])
  const start = () => {
    if (going) return onPlay(going)
    clearLocal(DAILY_KEY)
    const s = create(dailySetup(d, dailyMe()), d.seed, 1, d.mods)
    saveLocal(s, DAILY_KEY)
    onPlay(s)
  }
  return (
    <div className="screen daily">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Испытание дня</h2></div>
      <p className="hint center">{d.key.split('-').reverse().join('.')} · у всех одна раздача, новое испытание — завтра</p>
      {last && <div className={`daily-last${last.win ? ' win' : ''}`}>{last.win ? '🏆 Победа!' : '☠ Не в этот раз'} <b>{last.score}</b> очков</div>}
      {d.boss && (
        <div className="daily-boss">
          <span>{BOSS_INFO[d.boss].icon}</span>
          <div><small>Босс дня</small><b>{BOSS_INFO[d.boss].name}</b><em>{BOSS_INFO[d.boss].text}</em></div>
        </div>
      )}
      {d.mods.map(m => (
        <div key={m} className="daily-mod">
          <span>{MOD_INFO[m].icon}</span>
          <div><b>{MOD_INFO[m].name}</b><em>{MOD_INFO[m].text}</em></div>
        </div>
      ))}
      {!d.boss && <p className="hint center">Против трёх ботов. Победа — последний живой.</p>}
      <button className="btn wide gold big" onClick={start}>{going ? 'Продолжить попытку' : best ? 'Ещё попытка!' : 'В бой!'}</button>
      {best && <p className="hint center">Твой лучший сегодня: <b>{best.score}</b>{best.win ? ' 🏆' : ''}</p>}
      <h3 className="ach-head">Рекорды дня</h3>
      {board === null && <p className="hint center">Загрузка…</p>}
      {board === 'err' && <p className="hint center">Таблица недоступна (нет связи).</p>}
      {board && board !== 'err' && (board.rows.length ? (
        <div className="board">
          {board.rows.map((r, i) => (
            <div key={r.uid} className={r.uid === board.me ? 'me' : ''}>
              <i>{i + 1}</i><Portrait i={r.portrait} size={30} /><span>{r.name}</span><b>{r.score}{r.win ? ' 🏆' : ''}</b>
            </div>
          ))}
        </div>
      ) : <p className="hint center">Пока никого — стань первым!</p>)}
      <p className="hint center">Очки: победа 1000 + 20 за каждую ❤ + быстрота + 50 за убитого. Поражение — 50 за убитого и 10 за раунд.</p>
    </div>
  )
}
