// Колода эмоций на бой: 8 слотов сверху, ниже вся коллекция. Нажатие — посмотреть и послушать, «В колоду» / «Убрать».
import { useEffect, useRef, useState } from 'react'
import { DECK_SIZE, EMOTES, emoteDeck, hasEmote, isGolden, wizEmote, type Emote } from '../emotes'
import { emoteImg, emoteSnd } from './Emotes'
import { playSound, uiSfx } from './sound'
import { updateStats, useStatsData } from './useStats'

export default function EmoteDeck({ onBack, portrait }: { onBack: () => void; portrait?: number }) {
  const st = useStatsData()
  const deck = emoteDeck(st)
  const [look, setLook] = useState<Emote | null>(null)
  const [swap, setSwap] = useState(false) // колода полна — выбрать, какую заменить
  const save = (ids: string[]) => updateStats(x => { x.emoteDeck = ids })
  const pick = (e: Emote) => { setLook(e); setSwap(false); if (hasEmote(st, e)) playSound(emoteSnd(e.id), 0.8) }
  const inDeck = (e: Emote) => deck.some(d => d.id === e.id)
  const add = (e: Emote) => {
    if (deck.length < DECK_SIZE) { save([...deck.map(d => d.id), e.id]); uiSfx.reveal() } else setSwap(true)
  }
  const slot = (i: number) => {
    const d = deck[i]
    if (swap && look) { const ids = deck.map(x => x.id); ids[i] = look.id; save(ids); setSwap(false); uiSfx.reveal(); return }
    if (d) pick(d)
  }
  // зажать и перетащить: слот ↔ слот (поменять местами), из коллекции — в слот
  const [drag, setDrag] = useState<{ id: string; from: number; x: number; y: number } | null>(null)
  const [over, setOver] = useState(-1)
  const start = useRef([0, 0]), hold = useRef<number>(0), moved = useRef(false), dragRef = useRef(drag); dragRef.current = drag
  const deckRef = useRef(deck); deckRef.current = deck
  const press = (ev: React.PointerEvent, id: string, from: number) => {
    const x = ev.clientX, y = ev.clientY
    start.current = [x, y]
    moved.current = false
    clearTimeout(hold.current)
    hold.current = window.setTimeout(() => { moved.current = true; setDrag({ id, from, x, y }); navigator.vibrate?.(15); uiSfx.click() }, 260)
  }
  const cancelHold = () => clearTimeout(hold.current)
  useEffect(() => {
    if (!drag) return
    const slotAt = (x: number, y: number) => { const el = document.elementFromPoint(x, y)?.closest('[data-slot]') as HTMLElement | null; return el ? Number(el.dataset.slot) : -1 }
    const move = (e: PointerEvent) => { setDrag(d => d && { ...d, x: e.clientX, y: e.clientY }); setOver(slotAt(e.clientX, e.clientY)) }
    const noScroll = (e: TouchEvent) => e.preventDefault()
    const up = (e: PointerEvent) => {
      const d = dragRef.current, to = slotAt(e.clientX, e.clientY)
      setDrag(null); setOver(-1)
      if (!d || to < 0) return
      const ids = deckRef.current.map(x => x.id)
      const at = ids.indexOf(d.id), src = d.from >= 0 ? d.from : at
      if (src === to) return
      if (src >= 0) { const t = ids[to]; ids[to] = d.id; if (t) ids[src] = t; else ids.splice(src, 1) } // поменять местами
      else ids[Math.min(to, ids.length)] = d.id // из коллекции — в слот (старая уходит обратно)
      save(ids.filter(Boolean)); uiSfx.reveal()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('touchmove', noScroll, { passive: false })
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('touchmove', noScroll) }
  }, [!!drag]) // eslint-disable-line react-hooks/exhaustive-deps
  const dragProps = (id: string, from: number, can = true) => can ? {
    onPointerDown: (ev: React.PointerEvent) => press(ev, id, from), onPointerMove: (ev: React.PointerEvent) => { if (!drag && Math.abs(ev.clientY - start.current[1]) + Math.abs(ev.clientX - start.current[0]) > 8) cancelHold() },
    onPointerUp: cancelHold, onPointerLeave: cancelHold, onContextMenu: (ev: React.MouseEvent) => ev.preventDefault(),
  } : {}
  const tapOk = () => { if (moved.current) { moved.current = false; return false } return true }
  const sig = portrait != null ? wizEmote(portrait) : undefined
  const list = EMOTES.filter(e => e.kind !== 'wiz' || hasEmote(st, e))
  const own = (e: Emote) => hasEmote(st, e)

  return (
    <div className="screen emote-deck">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Эмоции</h2><span className="gold-chip">{deck.length} / {DECK_SIZE}</span></div>
      <p className="hint center">{swap ? 'Колода полна — нажми эмоцию, которую заменить' : 'Эти 8 эмоций будут в бою. Зажми и перетащи, чтобы поменять. Фирменная эмоция колдуна добавится сама.'}</p>
      <div className={`deck-slots${swap ? ' swap' : ''}`}>
        {Array.from({ length: DECK_SIZE }, (_, i) => (
          <button key={i} data-slot={i} className={`${deck[i] ? '' : 'empty'}${over === i ? ' over' : ''}${drag && deck[i]?.id === drag.id ? ' lift' : ''}`} data-nosfx onClick={() => tapOk() && slot(i)} {...(deck[i] ? dragProps(deck[i].id, i) : {})}>
            {deck[i] ? <img src={emoteImg(deck[i].id)} alt="" /> : <span>+</span>}
          </button>
        ))}
      </div>
      {sig && <p className="hint center">Фирменная: <img className="deck-sig" src={emoteImg(sig.id)} alt="" /> {hasEmote(st, sig) ? sig.name : 'откроется на 3-м уровне колдуна'}</p>}
      <h3 className="ach-head">Коллекция <span>{EMOTES.filter(own).length} / {EMOTES.length}</span></h3>
      <div className="emote-coll">
        {list.map(e => (
          <button key={e.id} data-nosfx className={`${own(e) ? '' : 'locked'}${e.kind === 'wiz' ? ' wiz' : ''}${isGolden(st, e) ? ' gold' : ''}${inDeck(e) ? ' in-deck' : ''}${look?.id === e.id ? ' on' : ''}`} onClick={() => tapOk() && pick(e)} {...dragProps(e.id, -1, own(e) && e.kind !== 'wiz')}>
            <img src={emoteImg(e.id)} alt="" loading="lazy" />
            <small>{e.name}</small>
          </button>
        ))}
      </div>
      {drag && <img className="deck-ghost" src={emoteImg(drag.id)} alt="" style={{ left: drag.x, top: drag.y }} />}
      {look && (
        <div className="deck-look">
          <img src={emoteImg(look.id)} alt="" onClick={() => own(look) && playSound(emoteSnd(look.id), 0.8)} />
          <div>
            <b>{look.name}</b>
            <div className="deck-look-btns">
              {own(look) && <button className="btn" onClick={() => playSound(emoteSnd(look.id), 0.8)}>🔊</button>}
              {!own(look) ? <small>Ещё не открыта</small>
                : look.kind === 'wiz' ? <small>Фирменная — только у своего колдуна</small>
                : inDeck(look) ? <button className="btn" onClick={() => { save(deck.filter(d => d.id !== look.id).map(d => d.id)); uiSfx.close() }}>Убрать</button>
                : <button className="btn gold" onClick={() => add(look)}>В колоду</button>}
              <button className="btn" onClick={() => { setLook(null); setSwap(false) }}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
