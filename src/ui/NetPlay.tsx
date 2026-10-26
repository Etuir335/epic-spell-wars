// Игра по сети: профиль (имя, портрет) → создать комнату / войти по коду → лобби → турнир.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureUser, netConfigured } from '../net/firebase'
import { MAX_SEATS, createRoom, joinRoom, leaveRoom, listOpenRooms, quickMatch, startGame, updateMember, updateRoom, type BotSeat, type Room } from '../net/room'
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

  const [view, setView] = useState<'menu' | 'list'>('menu')
  const [pub, setPub] = useState(true)
  const name = profile.name.trim()
  const enter = async (how: 'create' | 'join' | 'quick', c0?: string) => {
    if (!uid || !name) return
    setBusy(true); setErr('')
    try {
      let c = c0 ?? joinCode.trim().toUpperCase()
      if (how === 'create') c = await createRoom(uid, name, profile.portrait, { public: pub })
      else if (how === 'quick') c = await quickMatch(uid, name, profile.portrait)
      else await joinRoom(c, uid, name, profile.portrait)
      save(ROOM, c); setCode(c)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const leave = () => { save(ROOM, null); setCode(null) }

  if (!netConfigured()) return <Shell onBack={onBack}><p className="hint">Сетевая игра ещё не настроена (нет ключей Firebase).</p></Shell>
  if (!uid) return <Shell onBack={onBack}><p className="hint">{err || 'Подключаемся…'}</p></Shell>
  if (code) return <RoomView code={code} uid={uid} onLeave={leave} onBack={onBack} />
  if (view === 'list') return <RoomList onBack={() => setView('menu')} busy={busy} err={err} canJoin={!!name} onJoin={c => enter('join', c)} />

  return (
    <Shell onBack={onBack}>
      <div className="seat-row">
        <button className="seat-portrait" onClick={() => setPick(true)}><Portrait i={profile.portrait} size={64} /></button>
        <div className="seat-main">
          <input value={profile.name} maxLength={14} placeholder="Твоё имя" onChange={e => setProfile({ ...profile, name: e.target.value })} />
          <small className="hint">Нажми на портрет, чтобы выбрать колдуна</small>
        </div>
      </div>
      {!name && <p className="hint">Сначала впиши имя.</p>}
      <button className="btn gold wide big" disabled={busy || !name} onClick={() => enter('quick')}>⚡ Быстрая игра</button>
      <p className="hint center">Найдём открытую комнату или создадим новую. Старт сам: 4 колдуна — сразу, 2–3 — через 30 секунд.</p>
      <button className="btn wide" disabled={busy || !name} onClick={() => setView('list')}>🌐 Открытые комнаты</button>
      <div className="net-box">
        <div className="seg wide-seg">
          <button className={pub ? 'on' : ''} onClick={() => setPub(true)}>Открытая</button>
          <button className={!pub ? 'on' : ''} onClick={() => setPub(false)}>По приглашению</button>
        </div>
        <button className="btn wide" disabled={busy || !name} onClick={() => enter('create')}>Создать комнату</button>
        <small className="hint">{pub ? 'Комнату увидят все в списке и в быстрой игре.' : 'Войти можно только по коду или ссылке-приглашению.'}</small>
      </div>
      <div className="join-row">
        <input value={joinCode} maxLength={5} placeholder="КОД" onChange={e => setJoinCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={busy || joinCode.trim().length !== 5 || !name} onClick={() => enter('join')}>Войти</button>
      </div>
      {busy && <p className="hint center">Ищем…</p>}
      {err && <p className="err">{err}</p>}
      {pick && <PortraitPicker value={profile.portrait} onPick={p => { setProfile({ ...profile, portrait: p }); setPick(false) }} onClose={() => setPick(false)} />}
    </Shell>
  )
}

// Список открытых комнат («сервера»): обновляется сам каждые 5 секунд.
function RoomList({ onBack, onJoin, busy, err, canJoin }: { onBack: () => void; onJoin: (code: string) => void; busy: boolean; err: string; canJoin: boolean }) {
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [loadErr, setLoadErr] = useState('')
  useEffect(() => {
    let alive = true
    const load = () => listOpenRooms().then(r => { if (alive) { setRooms(r); setLoadErr('') } }).catch((e: Error) => alive && setLoadErr(e.message))
    load()
    const t = setInterval(load, 5000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  return (
    <Shell onBack={onBack} title="Открытые комнаты">
      {rooms == null && !loadErr && <p className="hint">Загружаем…</p>}
      {rooms?.length === 0 && <p className="hint">Сейчас открытых комнат нет. Создай свою или нажми «Быстрая игра» — тебя найдут.</p>}
      {rooms?.map(r => {
        const n = (r.count ?? 0) + r.bots.length
        return (
          <div className="seat-row room-row" key={r.code}>
            <div className="seat-main">
              <b>{r.quick ? '⚡ ' : ''}Комната {r.hostName ?? r.code}</b>
              <small className="hint">Колдунов: {n}/{MAX_SEATS}{r.bots.length ? ` (ботов ${r.bots.length})` : ''} · медалей до победы: {r.medalsToWin}</small>
            </div>
            <button className="btn gold" disabled={busy || !canJoin} onClick={() => onJoin(r.code)}>Войти</button>
          </div>
        )
      })}
      {(loadErr || err) && <p className="err">{loadErr || err}</p>}
    </Shell>
  )
}

function Shell({ onBack, children, title = 'Игра по сети' }: { onBack: () => void; children: React.ReactNode; title?: string }) {
  return (
    <div className="screen setup">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>{title}</h2></div>
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

  // Хост: счётчик людей, «открыта ли» комната, пульс (живые комнаты в списке) и автостарт быстрой игры
  const r0 = g.room
  const total = g.members.length + (r0?.bots.length ?? 0)
  const lobbyHost = !!r0 && g.isHost && r0.status === 'lobby'
  const starting = useRef(false) // турнир начинается один раз
  const begin = () => { if (starting.current || !r0) return; starting.current = true; startGame(r0, g.members).catch(() => { starting.current = false }) }
  useEffect(() => {
    if (!lobbyHost || !r0) return
    const open = !!r0.public && total < MAX_SEATS
    if (r0.count !== g.members.length || r0.open !== open) void updateRoom(code, { count: g.members.length, open, seenAt: Date.now() })
  }, [lobbyHost, total, g.members.length, r0?.public]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lobbyHost) return
    const beat = () => void updateRoom(code, { seenAt: Date.now() })
    beat()
    const t = setInterval(beat, 20_000)
    return () => clearInterval(t)
  }, [lobbyHost, code])
  useEffect(() => {
    if (!lobbyHost || !r0?.quick) return
    if (total >= 4) { begin(); return }
    if (total >= 2 && !r0.startAt) void updateRoom(code, { startAt: Date.now() + 30_000 })
    if (total < 2 && r0.startAt) void updateRoom(code, { startAt: null })
  }, [lobbyHost, total, r0?.quick, r0?.startAt]) // eslint-disable-line react-hooks/exhaustive-deps
  // обратный отсчёт (видят все); хост по нулю начинает
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!r0?.startAt || r0.status !== 'lobby') return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [r0?.startAt, r0?.status])
  const left = r0?.startAt ? Math.max(0, Math.ceil((r0.startAt - now) / 1000)) : null
  useEffect(() => {
    if (lobbyHost && left === 0 && total >= 2) begin()
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="room-kind">
        {g.isHost ? (
          <div className="seg wide-seg">
            <button className={room.public ? 'on' : ''} onClick={() => void updateRoom(code, { public: true, open: total < MAX_SEATS })}>🌐 Открытая</button>
            <button className={!room.public ? 'on' : ''} onClick={() => void updateRoom(code, { public: false, open: false, quick: false, startAt: null })}>🔒 По приглашению</button>
          </div>
        ) : <span className="hint">{room.public ? '🌐 Открытая комната' : '🔒 Комната по приглашению'}</span>}
      </div>
      {left != null && <div className="countdown">Старт через <b>{left}</b> с{total < 4 ? ' — или сразу, когда соберётся 4 колдуна' : ''}</div>}
      {room.quick && left == null && total < 2 && <p className="hint center">Ищем соперников… Комната видна в быстрой игре и в списке. Можно добавить ботов и начать.</p>}
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
          <button className="btn gold wide" disabled={total < 2} onClick={begin}>{total < 2 ? 'Нужно хотя бы 2 колдуна' : 'В бой!'}</button>
        </>
      ) : <p className="hint">Ждём, когда хост начнёт турнир…</p>}
      <button className="btn wide ghost" onClick={() => { if (g.isHost) void updateRoom(code, { open: false, startAt: null }); void leaveRoom(code, uid); onLeave() }}>Выйти из комнаты</button>
      {pick && me && <PortraitPicker value={me.portrait} onPick={p => { void updateMember(code, uid, { portrait: p }); setPick(false) }} onClose={() => setPick(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  )
}
