// Профиль: звание, статистика и достижения.
import { ACHIEVEMENTS, favoriteCard, rankOf, RANKS } from '../stats'
import { Card } from './cards'
import { useStatsData } from './useStats'

export default function Profile({ onBack }: { onBack: () => void }) {
  const st = useStatsData()
  const r = rankOf(st)
  const fav = favoriteCard(st)
  const got = ACHIEVEMENTS.filter(a => st.ach[a.id]).length
  const pct = r.next ? Math.round(((r.xp - r.xp0) / (r.next.xp - r.xp0)) * 100) : 100
  const rows: [string, string | number][] = [
    ['Схваток сыграно', st.games],
    ['Медалей 🏅', st.wins],
    ['Побед в схватках', st.games ? `${Math.round((st.wins / st.games) * 100)}%` : '—'],
    ['Турниров выиграно 👑', `${st.champion} из ${st.tournaments}`],
    ['По сети: побед', `${st.netWins} из ${st.netGames}`],
    ['Прикончено врагов', st.kills],
    ['Погибал', st.deaths],
    ['Урона врагам', st.dealt],
    ['Самый сильный удар', st.bestHit || '—'],
    ['Лучший могучий бросок', st.bestRoll || '—'],
    ['Заклинаний открыто', st.spells],
    ['Сокровищ получено', st.treasures],
  ]
  return (
    <div className="screen profile">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Профиль</h2></div>
      <div className="rank-card">
        <div className="rank-icon">{r.icon}</div>
        <div className="rank-main">
          <small>Звание · {r.level + 1} из {RANKS.length}</small>
          <b>{r.name}</b>
          <div className="xp-bar"><i style={{ width: `${pct}%` }} /></div>
          <small>{r.next ? `${r.xp} / ${r.next.xp} опыта — до звания «${r.next.name}»` : `${r.xp} опыта — выше званий нет`}</small>
        </div>
      </div>
      <div className="stat-grid">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
      {fav && (
        <div className="fav-card">
          <Card c={{ deck: 'spells', index: fav.index }} size="s" caption={false} />
          <div><small>Любимая карта</small><b>сыграна {fav.n} раз</b></div>
        </div>
      )}
      <h3 className="ach-head">Достижения <span>{got} / {ACHIEVEMENTS.length}</span></h3>
      <div className="ach-list">
        {ACHIEVEMENTS.map(a => (
          <div key={a.id} className={st.ach[a.id] ? 'got' : ''}>
            <span>{a.icon}</span>
            <div><b>{a.name}</b><small>{a.text}</small></div>
          </div>
        ))}
      </div>
      <p className="hint center">Опыт: схватка +2, медаль +10, победа в турнире +30, враг +3, победа над живыми +10, достижение +5.</p>
    </div>
  )
}
