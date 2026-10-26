// Игра по сети: профиль (имя, портрет) → создать комнату / войти по коду → лобби → турнир.
import { useEffect, useMemo, useState } from 'react'
import { ensureUser, netConfigured } from '../net/firebase'
import { createRoom, joinRoom, leaveRoom, startGame, updateMember, updateRoom, type BotSeat } from '../net/room'
import { useNetGame } from '../net/useNetGame'
import { shareInvite, tgUser } from '../telegram'
import { Portrait } from './cards'
import Game from './Game'

const PROFILE = 'esw-profile'
const ROOM = 'esw-net-room'
const PORTRAITS = 41
const BOT_NAMES = ['Ведьма', 'Чародей', 'Некромант', 'Шаман', 'Маг']
const LEVELS = ['', 'лёгкий', 'обычный', 'сильный']

function load<T>(k: string, d: T): T { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : d } catch { return d } }
function save(k: string, v: unknown) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)) } catch { /* не важно */ } }

export default function NetPlay({ onBack, startCode }: { onBack: () => void; startCode?: string | null }) {
  const [uid, setUid] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [code, setCode] = useState<string | null>(() => load<string | null>(ROOM, null))
  const [profile, setProfile] = useState(() => load(PROFILE, { name: tgUser()?.name ?? '', portrait: Math.floor(Math.random() * PORTRAITS) }))
  const [joinCode, setJoinCode] = useState(startCode ?? '')
  const [pick, setPick] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!netConfigured()) return
    ensureUser().then(u => setUid(u.uid)).catch((e: Error) => setErr('Не удалось подключиться: ' + e.message))
  }, [])
  useEffect(() => save(PROFILE, profile), [profile])

  const enter = async (how: 'create' | 'join') => {
    if (!uid || !profile.name.trim()) return
    setBusy(true); setErr('')
    try {
      const c = how === 'create' ? await createRoom(uid, profile.name.trim(), profile.portrait) : joinCode.trim().toUpperCase()
      if (how === 'join') await joinRoom(c, uid, profile.name.trim(), profile.portrait)
      save(ROOM, c); setCode(c)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const leave = () => { save(ROOM, null); setCode(null) }

  if (!netConfigured()) return <Shell onBack={onBack}><p className="hint">Сетевая игра ещё не настроена (нет ключей Firebase).</p></Shell>
  if (!uid) return <Shell onBack={onBack}><p className="hint">{err || 'Подключаемся…'}</p></Shell>
  if (code) return <RoomView code={code} uid={uid} onLeave={leave} onBack={onBack} />

  return (
    <Shell onBack={onBack}>
      <div className="seat-row">
        <button className="seat-portrait" onClick={() => setPick(true)}><Portrait i={profile.portrait} size={64} /></button>
        <div className="seat-main">
          <input value={profile.name} maxLength={14} placeholder="Твоё имя" onChange={e => setProfile({ ...profile, name: e.target.value })} />
          <small className="hint">Нажми на портрет, чтобы выбрать колдуна</small>
        </div>
      </div>
      <button className="btn gold wide" disabled={busy || !profile.name.trim()} onClick={() => enter('create')}>Создать комнату</button>
      <div className="join-row">
        <input value={joinCode} maxLength={5} placeholder="КОД" onChange={e => setJoinCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={busy || joinCode.trim().length !== 5 || !profile.name.trim()} onClick={() => enter('join')}>Войти</button>
      </div>
      {err && <p className="err">{err}</p>}
      {pick && <PortraitPicker value={profile.portrait} onPick={p => { setProfile({ ...profile, portrait: p }); setPick(false) }} onClose={() => setPick(false)} />}
    </Shell>
  )
}

function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="screen setup">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Игра по сети</h2></div>
      {children}
    </div>
  )
}

function PortraitPicker({ value, onPick, onClose }: { value: number; onPick: (p: number) => void; onClose: () => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>Выбери колдуна</h3>
        <div className="portrait-grid">
          {Array.from({ length: PORTRAITS }, (_, k) => (
            <button key={k} className={value === k ? 'on' : ''} onClick={() => onPick(k)}><Portrait i={k} size={64} /></button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RoomView({ code, uid, onLeave, onBack }: { code: string; uid: string; onLeave: () => void; onBack: () => void }) {
  const g = useNetGame(code, uid)
  const [toast, setToast] = useState('')
  const [pick, setPick] = useState(false)
  const invite = () => { setToast(shareInvite(code)); setTimeout(() => setToast(''), 2500) }
  const me = g.members.find(m => m.uid === uid)
  const store = useMemo(() => (g.state ? { state: g.state, dispatch: g.dispatch } : null), [g.state, g.dispatch])

  useEffect(() => { if (g.remoteError) { setToast(g.remoteError); g.clearRemoteError(); setTimeout(() => setToast(''), 3000) } }, [g.remoteError]) // eslint-disable-line react-hooks/exhaustive-deps

  if (g.room === undefined) return <Shell onBack={onBack}><p className="hint">Загружаем комнату {code}…</p></Shell>
  if (g.room === null) return <Shell onBack={onLeave}><p className="hint">Комнаты {code} нет.</p><button className="btn wide" onClick={onLeave}>Назад</button></Shell>

  if (g.room.status === 'game' && store) {
    const seat = store.state.players.findIndex(p => p.uid === uid)
    return (
      <>
        <Game store={store} onExit={onBack} net={{ seat, isHost: g.isHost, code, onInvite: invite }} />
        {toast && <div className="toast">{toast}</div>}
      </>
    )
  }

  const room = g.room
  const bots = room.bots
  const total = g.members.length + bots.length
  const addBot = () => {
    const used = new Set([...g.members.map(m => m.portrait), ...bots.map(b => b.portrait)])
    let portrait = 0
    for (let k = 0; k < 50; k++) { portrait = Math.floor(Math.random() * PORTRAITS); if (!used.has(portrait)) break }
    const b: BotSeat = { id: Math.random().toString(36).slice(2, 8), name: BOT_NAMES[bots.length % BOT_NAMES.length], portrait, level: 2 }
    void updateRoom(code, { bots: [...bots, b] })
  }
  const setBot = (id: string, patch: Partial<BotSeat>) => void updateRoom(code, { bots: bots.map(b => (b.id === id ? { ...b, ...patch } : b)) })

  return (
    <Shell onBack={onBack}>
      <div className="room-code" onClick={invite}>
        <small>Код комнаты</small><b>{code}</b><span>Нажми, чтобы пригласить друзей</span>
      </div>
      <h3 className="lobby-h">Колдуны ({total}/6)</h3>
      {g.members.map(m => (
        <div className="seat-row" key={m.uid}>
          <button className="seat-portrait" disabled={m.uid !== uid} onClick={() => setPick(true)}><Portrait i={m.portrait} size={52} /></button>
          <div className="seat-main"><b>{m.uid === room.host && '👑 '}{m.name}{m.uid === uid && ' (ты)'}</b></div>
        </div>
      ))}
      {bots.map(b => (
        <div className="seat-row" key={b.id}>
          <Portrait i={b.portrait} size={52} />
          <div className="seat-main">
            <b>🤖 {b.name}</b>
            {g.isHost
              ? <div className="seg">{[1, 2, 3].map(l => <button key={l} className={b.level === l ? 'on' : ''} onClick={() => setBot(b.id, { level: l })}>{LEVELS[l]}</button>)}</div>
              : <small className="hint">{LEVELS[b.level]}</small>}
          </div>
          {g.isHost && <button className="seat-del" onClick={() => void updateRoom(code, { bots: bots.filter(x => x.id !== b.id) })}>✕</button>}
        </div>
      ))}
      {g.isHost ? (
        <>
          {total < 6 && <button className="btn wide ghost" onClick={addBot}>＋ Добавить бота</button>}
          <div className="row">
            <span>Медалей до победы:</span>
            <div className="seg">{[1, 2, 3].map(n => <button key={n} className={room.medalsToWin === n ? 'on' : ''} onClick={() => void updateRoom(code, { medalsToWin: n })}>{n}</button>)}</div>
          </div>
          <button className="btn gold wide" disabled={total < 2} onClick={() => void startGame(room, g.members)}>{total < 2 ? 'Нужно хотя бы 2 колдуна' : 'В бой!'}</button>
        </>
      ) : <p className="hint">Ждём, когда хост начнёт турнир…</p>}
      <button className="btn wide ghost" onClick={() => { void leaveRoom(code, uid); onLeave() }}>Выйти из комнаты</button>
      {pick && me && <PortraitPicker value={me.portrait} onPick={p => { void updateMember(code, uid, { portrait: p }); setPick(false) }} onClose={() => setPick(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  )
}
