// Экран партии: враги сверху, арена в центре (режиссёр проигрывает ходы), я и рука веером снизу.
import { useEffect, useRef, useState } from 'react'
import Tutorial, { tutorialSeen } from './Tutorial'
import { DEAD, SPELLS, TREASURES } from '../data/cards'
import { T } from '../game/core'
import { waitingFor } from '../game/engine'
import type { Action, GameState, PlayerState } from '../game/types'
import { think } from '../ai/mcts'
import Arena from './Arena'
import { Card, cardText, cardTitle, HoverCtx, Portrait, SpellMeta, useIsDesktop, type CardRef } from './cards'
import { shownLives, useDirector } from './director'
import { shakeEl } from './fx'
import { assetUrl, cardUrl } from '../assets'
import HandDock, { SpellSlots, useBuilder } from './HandDock'
import { simpleBotMove } from './simpleBot'
import { isMuted, setMuted, sfx } from './sound'
import { music, useMusic } from './music'
import type { GameStore } from './store'

const noHover = () => {}

// Боты: ход считается в Web Worker (MCTS, src/ai); без Worker — коротко в основном потоке.
let worker: Worker | null | undefined
function getWorker(): Worker | null {
  if (worker === undefined) {
    try { worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' }) } catch { worker = null }
  }
  return worker
}
let reqId = 0
function useBots(s: GameState, dispatch: GameStore['dispatch'], ready: boolean) {
  useEffect(() => {
    if (!ready) return
    const bot = waitingFor(s).find(id => s.players[id].bot)
    if (bot == null) return
    const level = s.players[bot].bot ?? 2
    const started = Date.now(), id = ++reqId
    let cancelled = false, timer = 0
    const apply = (a: Action | null) => {
      if (cancelled) return
      const wait = Math.max(0, (s.pending ? 700 : 400) - (Date.now() - started)) // чтобы ход бота был заметен
      timer = window.setTimeout(() => { if (!cancelled) dispatch(a ?? simpleBotMove(s, bot)!) }, wait)
    }
    const w = getWorker()
    if (w) {
      const onMsg = (e: MessageEvent<{ id: number; action: Action | null }>) => { if (e.data.id === id) { w.removeEventListener('message', onMsg); apply(e.data.action) } }
      w.addEventListener('message', onMsg)
      w.postMessage({ id, s, me: bot, level })
      return () => { cancelled = true; w.removeEventListener('message', onMsg); clearTimeout(timer) }
    }
    timer = window.setTimeout(() => apply(think(s, bot, 1, 150)), 30)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [s, dispatch, ready])
}

// Сетевой режим: своё место за столом (seat; −1 — зритель), ботами и «следующей игрой» управляет хост.
// Таймер хода: хост ставит в комнате ключ ожидания и срок (turnKey/turnEnd), по сроку пропускает ход.
export interface NetInfo {
  seat: number; isHost: boolean; code: string; onInvite: () => void
  turnKey?: string | null; turnEnd?: number | null
  setTurn: (key: string | null, end: number | null) => void
  onLeave: () => void
}

// время на заклинание и на ответ (для проверки в dev-сборке: localStorage esw-turn-sec = секунд)
const devTurn = import.meta.env.DEV ? Number((() => { try { return localStorage.getItem('esw-turn-sec') } catch { return null } })()) * 1000 : 0
const BUILD_MS = devTurn || 180_000, ASK_MS = devTurn || 90_000

// Кого ждём из людей и ключ ожидания: раунд целиком (выкладка) или конкретный вопрос.
function turnWait(s: GameState) {
  const humans = waitingFor(s).filter(id => !s.players[id].bot)
  const key = !humans.length ? null : s.pending ? `q${s.game}-${s.seq}` : `b${s.game}-${s.round}`
  return { humans, key }
}

// Хост: ставит срок хода, когда его анимации доиграли (ready), и по сроку пропускает ход всем, кто не успел.
function useTurnTimer(s: GameState, dispatch: GameStore['dispatch'], ready: boolean, net?: NetInfo) {
  const sRef = useRef(s)
  sRef.current = s
  const { key } = turnWait(s)
  const host = !!net?.isHost
  useEffect(() => {
    if (!net || !host) return
    if (!key) { if (net.turnKey) net.setTurn(null, null); return }
    let end = net.turnKey === key && net.turnEnd ? net.turnEnd : 0
    if (!end) {
      if (!ready) return
      end = Date.now() + (key[0] === 'q' ? ASK_MS : BUILD_MS)
      net.setTurn(key, end)
    }
    const t = setTimeout(() => {
      const cur = turnWait(sRef.current)
      if (cur.key === key) for (const id of cur.humans) dispatch({ type: 'skip', player: id })
    }, Math.max(0, end - Date.now()))
    return () => clearTimeout(t)
  }, [key, host, ready, net?.turnKey, net?.turnEnd]) // eslint-disable-line react-hooks/exhaustive-deps -- net пересоздаётся каждый рендер
}

// Секунд до конца хода (для всех; null — таймера нет).
function useTurnLeft(s: GameState, net?: NetInfo) {
  const { key } = turnWait(s)
  const end = net && key && net.turnKey === key ? net.turnEnd ?? null : null
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!end) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [end])
  return end ? Math.max(0, Math.ceil((end - now) / 1000)) : null
}

export default function Game({ store, onExit, net }: { store: GameStore; onExit: () => void; net?: NetInfo }) {
  const s = store.state
  const humans = s.players.filter(p => !p.bot).map(p => p.id)
  const [localViewer, setViewer] = useState(humans[0] ?? -1)
  const viewer = net ? net.seat : localViewer
  const [toast, setToast] = useState<string | null>(null)
  const [sheet, setSheet] = useState<null | 'log' | 'menu' | 'music' | { player: number }>(null)
  const mus = useMusic()
  const [mute, setMute] = useState(isMuted())
  const [hovered, setHovered] = useState<CardRef | null>(null)
  const desk = useIsDesktop()
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches // на телефоне касание — не наведение
  const dir = useDirector(s)
  useBots(s, store.dispatch, dir.done && (!net || net.isHost))
  useTurnTimer(s, store.dispatch, dir.done, net)
  const turnLeft = useTurnLeft(s, net)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [tut, setTut] = useState(() => !tutorialSeen()) // первый раз — обучение перед боем
  const arenaRef = useRef<HTMLDivElement>(null)

  const shown = shownLives(s, dir.pos)
  const need = dir.done ? waitingFor(s).filter(id => !s.players[id].bot) : []
  const handoff = !net && humans.length > 1 && need.length > 0 && !need.includes(viewer) ? need[0] : null
  const me = viewer >= 0 ? s.players[viewer] : null
  const myAct = !!me && need.includes(viewer) && handoff == null
  const botMe = !!net && !!me?.bot // за меня играет бот (пропал или ушёл)

  // звук «твой ход» и тряска арены на эпичном раскрытии
  const prevAct = useRef(false)
  useEffect(() => { if (myAct && !prevAct.current) sfx.myTurn(); prevAct.current = myAct }, [myAct])
  useEffect(() => {
    const b = dir.scene.banner
    if (b?.kind === 'built') shakeEl(arenaRef.current, 6)
  }, [dir.scene.banner])
  useEffect(() => {
    if (!dir.scene.title) return
    const t = setTimeout(() => shakeEl(arenaRef.current, 10), 300 + dir.scene.cards.length * 480)
    return () => clearTimeout(t)
  }, [dir.scene.titleKey]) // eslint-disable-line react-hooks/exhaustive-deps -- только при новом названии

  const act = (a: Parameters<GameStore['dispatch']>[0]) => {
    const err = store.dispatch(a)
    if (err) { setToast(err); setTimeout(() => setToast(null), 2500) }
  }

  const iBuild = !!me && !botMe && dir.done && s.phase === 'build' && me.alive && !me.spell && handoff == null
  const builder = useBuilder(me?.hand ?? [], !!me?.treasures.includes(T.trap), iBuild, `${s.game}-${s.round}-${viewer}`)
  const myQ = me && !botMe && dir.done && s.pending && s.pending.player === viewer && handoff == null ? s.pending : null
  const over = dir.done && (s.phase === 'gameover' || s.phase === 'tournament')
  const others = s.players.filter(p => p.id !== viewer)
  const waitNames = s.players.filter(q => q.alive && !q.spell).map(q => q.name)
  const clock = turnLeft != null ? ` · ⏳ ${turnLeft} с` : ''
  const idle = !dir.done ? '' : s.phase === 'build'
    ? (me?.spell && me.alive ? `Ждём: ${waitNames.join(', ')}${clock}` : me?.alive && !botMe ? `Собери заклинание из 1–3 карт${clock}` : `Раунд ${s.round}`)
    : s.pending ? `${s.players[s.pending.player].name} думает…${clock}` : ''
  const hurry = myAct && turnLeft != null && turnLeft <= 30 // мне пора: скоро пропуск хода

  // низ экрана: я и рука (на ПК — отдельной полосой на всю ширину под колонками)
  const bottom = (
    <>
    {handoff != null ? (
      <div className="handoff">
        <Portrait i={s.players[handoff].portrait} size={84} />
        <p>Передайте телефон</p>
        <b>{s.players[handoff].name}</b>
        <button className="btn gold" onClick={() => { sfx.tap(); setViewer(handoff) }}>Я — {s.players[handoff].name}</button>
      </div>
    ) : me ? (
      <>
        <MyBar s={s} p={me} life={shown[viewer].life} alive={shown[viewer].alive} casting={dir.scene.caster === viewer && !dir.done}
          onClick={() => setSheet({ player: viewer })} />
        {botMe ? (
          <div className="wait bot-me">
            <span>🤖 {me.away === 'afk' ? 'Ты пропустил 3 хода подряд — за тебя играет бот.' : 'За тебя играет бот.'}</span>
            {me.away === 'afk' && <button className="btn gold" onClick={() => { sfx.tap(); act({ type: 'seat', player: viewer, bot: null }) }}>Вернуться в игру</button>}
          </div>
        ) : me.alive && (
          <HandDock b={builder}
            waitText={dir.done && s.phase === 'build' && me.spell ? '✓ Заклинание выложено' : undefined} />
        )}
        {!me.alive && <div className="wait">☠ Ты дохлый колдун. Жди конца игры — карты дохлого помогут в следующей.</div>}
      </>
    ) : <div className="wait">Смотрим бой ботов</div>}
    </>
  )

  return (
    <HoverCtx.Provider value={canHover ? setHovered : noHover}>
    <div className={`game-wrap${desk ? ' desk' : ''}`} style={{ ['--bg-img' as string]: `url(${assetUrl('assets/ui/arena-bg.webp')})` }}>
    {desk && <LeftPanel s={s} pos={dir.pos} shown={shown} viewer={viewer} caster={dir.done ? null : dir.scene.caster} onPick={p => setSheet({ player: p })} />}
    <div className="game">
      <div className="top-bar">
        <button onClick={() => setSheet('menu')}>☰</button>
        <h2>Игра {s.game} · Раунд {s.round}</h2>
        {net && <button className="room-chip" onClick={net.onInvite} title="Пригласить друзей">{net.code}</button>}
        <button className={mus.on && mus.tracks.length ? '' : 'off'} onClick={() => setSheet('music')} title="Музыка">🎵</button>
        <button onClick={() => { setMuted(!mute); setMute(!mute) }} title="Звуки">{mute ? '🔇' : '🔊'}</button>
        <button onClick={() => setSheet('log')}>📜</button>
      </div>

      <div className={`foes n${others.length}`}>
        {others.map(p => (
          <Seat key={p.id} s={s} p={p} life={shown[p.id].life} alive={shown[p.id].alive}
            casting={dir.scene.caster === p.id && !dir.done} count={dir.scene.counts?.[p.id]}
            onClick={() => setSheet({ player: p.id })} />
        ))}
      </div>

      <Arena ref={arenaRef} s={s} scene={dir.scene} idle={idle}
        slots={iBuild && me ? <SpellSlots b={builder} hasJet={me.treasures.includes(T.jetpack)} onSubmit={(cards, goLast) => act({ type: 'submit', player: viewer, cards, goLast })} /> : null} />
      {!dir.done && (
        <div className="play-ctl">
          <button onClick={() => dir.setFast(!dir.fast)}>{dir.fast ? '▶ Обычно' : '⏩ Быстрее'}</button>
          <button onClick={dir.skip}>⏭ Пропустить</button>
        </div>
      )}

      {hurry && <div className="turn-hurry">⏳ {turnLeft} с — не успеешь, ход пропустится</div>}

      {!desk && bottom}

      {myQ && (
        <div className="sheet-back q">
          <div className="sheet">
            <h3>{myQ.prompt}</h3>
            {turnLeft != null && <p className={`q-timer${turnLeft <= 15 ? ' hot' : ''}`}>⏳ {turnLeft} с</p>}
            <div className={myQ.options.some(o => o.card) ? 'q-cards' : 'q-opts'}>
              {myQ.options.map(o => o.card
                ? <Card key={String(o.v)} c={o.card} size="m" onClick={() => act({ type: 'choose', player: viewer, value: o.v })} />
                : (
                  <button key={String(o.v)} className="btn" onClick={() => { sfx.tap(); act({ type: 'choose', player: viewer, value: o.v }) }}>
                    {o.player != null && <Portrait i={s.players[o.player].portrait} size={34} />} <span>{o.label}</span>
                    {o.player != null && <small>❤ {s.players[o.player].life}</small>}
                  </button>
                ))}
            </div>
            {myQ.optional && <button className="btn ghost wide" onClick={() => act({ type: 'choose', player: viewer, value: null })}>Не надо</button>}
          </div>
        </div>
      )}

      {over && <GameOver s={s} onNext={!net || net.isHost ? () => act({ type: 'nextGame' }) : null} onExit={onExit} />}

      {sheet === 'log' && (
        <div className="sheet-back" onClick={() => setSheet(null)}>
          <div className="sheet log-sheet">
            <h3>Журнал</h3>
            {[...s.log].reverse().map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
      {sheet === 'music' && (
        <div className="sheet-back" onClick={() => setSheet(null)}>
          <div className="sheet music-sheet" onClick={e => e.stopPropagation()}>
            <h3>Музыка</h3>
            <div className="seg wide-seg">
              <button className={mus.on ? 'on' : ''} onClick={() => !mus.on && music.toggle()}>Включена</button>
              <button className={!mus.on ? 'on' : ''} onClick={() => mus.on && music.toggle()}>Выключена</button>
            </div>
            <div className="track">
              <button className="btn" onClick={music.prev} title="Предыдущая">⏮</button>
              <div className="track-name"><small>{mus.index + 1} / {mus.tracks.length}</small><b>{mus.track?.title ?? '—'}</b></div>
              <button className="btn" onClick={music.next} title="Следующая">⏭</button>
            </div>
            <label className="vol">Громкость <input type="range" min={0} max={1} step={0.05} value={mus.volume} onChange={e => music.volume(+e.target.value)} /></label>
            <div className="playlist">
              {mus.tracks.map((tr, i) => (
                <div key={`${tr.local ?? tr.file ?? ""}-${i}`} className={`pl-row${i === mus.index ? ' cur' : ''}`}>
                  <button className="pl-name" onClick={() => music.play(i)}>{i === mus.index && mus.playing ? '▶ ' : ''}{tr.title}</button>
                  {tr.local && <button className="pl-del" onClick={() => void music.remove(i)} title="Убрать">✕</button>}
                </div>
              ))}
              {!mus.tracks.length && <p className="hint">Песен пока нет. Добавь свои — они останутся только на этом устройстве.</p>}
            </div>
            <label className="btn wide add-music">＋ Добавить песни с устройства
              <input type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac" multiple hidden onChange={e => { if (e.target.files) void music.add(e.target.files); e.target.value = '' }} />
            </label>
            <small className="hint">Песни хранятся только на твоём телефоне или ПК и не выкладываются в интернет.</small>
            <button className="btn wide ghost" onClick={() => setSheet(null)}>Закрыть</button>
          </div>
        </div>
      )}
      {sheet === 'menu' && (
        <div className="sheet-back" onClick={() => { setSheet(null); setConfirmLeave(false) }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Меню</h3>
            {!net && <button className="btn wide" onClick={onExit}>Выйти в меню (турнир сохранится)</button>}
            {net && !confirmLeave && <>
              {!net.isHost && <button className="btn wide" onClick={onExit}>Свернуть в меню (место остаётся за тобой)</button>}
              <button className="btn wide danger" onClick={() => setConfirmLeave(true)}>Покинуть партию</button>
            </>}
            {net && confirmLeave && <>
              <p className="hint center">Твоё место займёт бот, вернуться в эту партию будет нельзя.{net.isHost ? ' Хостом станет другой игрок.' : ''}</p>
              <button className="btn wide danger" onClick={net.onLeave}>Да, покинуть</button>
            </>}
            {!confirmLeave && <button className="btn wide" onClick={() => { setSheet(null); setTut(true) }}>📖 Как играть</button>}
            <button className="btn wide ghost" onClick={() => { setSheet(null); setConfirmLeave(false) }}>Назад к бою</button>
          </div>
        </div>
      )}
      {sheet && typeof sheet === 'object' && <PlayerSheet s={s} p={s.players[sheet.player]} onClose={() => setSheet(null)} />}
      {toast && <div className="toast">{toast}</div>}
      {tut && <Tutorial onClose={() => setTut(false)} />}
    </div>
    {desk && <RightPanel hovered={hovered} />}
    {desk && <div className="desk-dock">{bottom}</div>}
    {!desk && hovered && <div className="hover-float"><CardInfo c={hovered} /></div>}
    </div>
    </HoverCtx.Provider>
  )
}

// Крупная карта и её текст (для наведения мышью).
function CardInfo({ c }: { c: CardRef }) {
  const sp = c.deck === 'spells' ? SPELLS[c.index] : null
  return (
    <div className="cinfo">
      <img src={cardUrl(c.deck, c.index)} alt="" />
      <div className="cinfo-text">
        <h3>{cardTitle(c)}</h3>
        {sp && <div className="cinfo-meta"><SpellMeta index={sp.index} long /></div>}
        {c.deck === 'treasures' && <div className="cinfo-meta">Сокровище</div>}
        {c.deck === 'dead' && <div className="cinfo-meta">Карта дохлого колдуна</div>}
        {cardText(c).map((l, i) => <p key={i} className={/^d/.test(l) ? 'tier-line' : ''}>{l}</p>)}
      </div>
    </div>
  )
}

function LeftPanel({ s, pos, shown, viewer, caster, onPick }: {
  s: GameState; pos: number; shown: { life: number; alive: boolean }[]; viewer: number; caster: number | null; onPick: (p: number) => void
}) {
  const logs = s.ev.slice(0, Math.max(0, pos - s.evBase)).filter(e => e.k === 'log').map(e => (e as { t: string }).t).slice(-80).reverse()
  return (
    <aside className="side left">
      <div className="panel">
        <h4>Колдуны</h4>
        {s.players.map(p => (
          <div key={p.id} className={`side-pl${caster === p.id ? ' casting' : ''}${shown[p.id].alive ? '' : ' dead'}`} onClick={() => onPick(p.id)}>
            <Portrait i={p.portrait} size={42} dead={!shown[p.id].alive} />
            <div className="side-pl-main">
              <b>{p.bot ? '🤖 ' : ''}{p.name}{p.id === viewer ? ' (ты)' : ''}{awayText(p)}</b>
              <span>{shown[p.id].alive ? <>❤ <em>{shown[p.id].life}</em></> : '☠ дохлый'} {p.medals > 0 && '🏅'.repeat(p.medals)}</span>
              <div className="side-tr">
                {p.treasures.map(t => <Card key={t} c={{ deck: 'treasures', index: t }} size="s" caption={false} />)}
                {p.deadCards.map(c => <Card key={'d' + c} c={{ deck: 'dead', index: Math.floor(c / 10) }} size="s" caption={false} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="panel grow">
        <h4>Журнал боя</h4>
        <div className="side-log">{logs.map((l, i) => <div key={i} className={i === 0 ? 'fresh' : ''}>{l}</div>)}</div>
      </div>
      <div className="panel">
        <h4>Памятка</h4>
        <p className="memo">Заклинание — 1–3 карты разных типов: <b>заводила</b>, <b>наворот</b>, <b>приход</b>. Меньше карт — ходишь раньше; при равенстве — выше инициатива прихода. Могучий бросок: кубик за каждую карту того же знака. Последний живой получает медаль, {s.medalsToWin} 🏅 — победа в турнире.</p>
      </div>
    </aside>
  )
}

// Справа — только наведённая карта во весь рост (крупно, чтобы читался текст на самой карте).
function RightPanel({ hovered }: { hovered: CardRef | null }) {
  return (
    <aside className="side right">
      <div className={`panel grow big-card${hovered ? '' : ' empty'}`}>
        {hovered
          ? <img src={cardUrl(hovered.deck, hovered.index)} alt={cardTitle(hovered)} />
          : <p className="hint">Наведи мышь на любую карту — она появится здесь во весь рост.</p>}
      </div>
    </aside>
  )
}

const awayText = (p: PlayerState) => (p.away === 'left' ? ' (ушёл)' : p.away === 'afk' ? ' (пропал)' : '')

function Backs({ n }: { n: number }) {
  return <div className="backs">{Array.from({ length: n }, (_, i) => <i key={i} />)}</div>
}

function Seat({ s, p, life, alive, casting, count, onClick }: {
  s: GameState; p: PlayerState; life: number; alive: boolean; casting: boolean; count?: number; onClick: () => void
}) {
  const n = count != null && count >= 0 && s.phase === 'resolve' && !p.acted ? count : null
  return (
    <button className={`seat${casting ? ' casting' : ''}${alive ? '' : ' dead'}`} onClick={onClick}>
      <div className="ava" data-pid={p.id}>
        <Portrait i={p.portrait} size={56} dead={!alive} />
        <span className="orb">{alive ? life : '☠'}</span>
        {p.medals > 0 && <span className="medal">{'🏅'.repeat(p.medals)}</span>}
      </div>
      <div className="seat-name">{p.bot ? '🤖 ' : ''}{p.name}{p.away && <small className="away">{awayText(p)}</small>}</div>
      <div className="seat-info">
        {p.treasures.length > 0 && <span>💰{p.treasures.length}</span>}
        {alive && s.phase === 'build' && (p.spell ? <span className="ready">✓</span> : <span className="think">…</span>)}
        {n != null && <Backs n={n} />}
      </div>
    </button>
  )
}

function MyBar({ s, p, life, alive, casting, onClick }: { s: GameState; p: PlayerState; life: number; alive: boolean; casting: boolean; onClick: () => void }) {
  return (
    <div className={`mybar${casting ? ' casting' : ''}`}>
      <div className="ava" data-pid={p.id} onClick={onClick}>
        <Portrait i={p.portrait} size={50} dead={!alive} />
        <span className="orb big">{alive ? life : '☠'}</span>
      </div>
      <div className="mybar-main" onClick={onClick}>
        <b>{p.name}</b> {p.medals > 0 && '🏅'.repeat(p.medals)}
        <small>{s.medalsToWin} 🏅 до победы</small>
      </div>
      <div className="mybar-tr">
        {p.treasures.map(t => <Card key={t} c={{ deck: 'treasures', index: t }} size="s" caption={false} />)}
        {p.deadCards.map(c => <Card key={'d' + c} c={{ deck: 'dead', index: Math.floor(c / 10) }} size="s" caption={false} />)}
      </div>
    </div>
  )
}

function PlayerSheet({ s, p, onClose }: { s: GameState; p: PlayerState; onClose: () => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="ps-head">
          <Portrait i={p.portrait} size={72} dead={!p.alive} />
          <div><h3>{p.name}</h3>{p.alive ? `❤ ${p.life}` : '☠ дохлый'}{p.medals > 0 && ' · ' + '🏅'.repeat(p.medals)}<br /><small>Карт на руке: {p.hand.length}</small></div>
        </div>
        <h4>Сокровища{!p.treasures.length && ': нет'}</h4>
        <div className="list-cards">{p.treasures.map(t => (
          <div key={t} className="lc"><Card c={{ deck: 'treasures', index: t }} size="s" caption={false} /><div><b>{TREASURES[t].name}</b><p>{TREASURES[t].text}</p></div></div>
        ))}</div>
        {p.deadCards.length > 0 && <>
          <h4>Карты дохлого колдуна</h4>
          <div className="list-cards">{p.deadCards.map(c => { const d = DEAD[Math.floor(c / 10)]; return (
            <div key={c} className="lc"><Card c={{ deck: 'dead', index: d.index }} size="s" caption={false} /><div><b>{d.name}</b><p>{d.text}</p></div></div>
          ) })}</div>
        </>}
        <p className="hint">Игра {s.game} · медалей до победы: {s.medalsToWin}</p>
        <button className="btn wide ghost" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  )
}

function GameOver({ s, onNext, onExit }: { s: GameState; onNext: (() => void) | null; onExit: () => void }) {
  const w = s.lastWinner != null && s.lastWinner >= 0 ? s.players[s.lastWinner] : null
  const champ = s.phase === 'tournament'
  return (
    <div className="over-back">
      <div className="confetti">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.25}s` }} />)}</div>
      <div className="over">
        <h2>{champ ? '🏆 Турнир окончен!' : `Игра ${s.game} окончена`}</h2>
        {w ? <><div className="over-ava"><Portrait i={w.portrait} size={130} /></div><p className="over-name">{w.name}</p><p>{champ ? 'Великий боевой маг горы Черепламени!' : 'Недобитый колдун получает медаль 🏅'}</p></>
          : <p>Все сдохли. Медаль никому.</p>}
        <div className="medals">{s.players.map(p => <div key={p.id}><Portrait i={p.portrait} size={30} /> <span>{p.name}</span> <b>{'🏅'.repeat(p.medals) || '—'}</b></div>)}</div>
        {champ
          ? <button className="btn gold wide" onClick={onExit}>В меню</button>
          : onNext ? <button className="btn gold wide" onClick={onNext}>⚔ Следующая игра</button> : <p className="hint">Следующую игру начнёт хост…</p>}
      </div>
    </div>
  )
}
