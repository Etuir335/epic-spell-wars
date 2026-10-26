// Сбор заклинания: общий «сборщик» (useBuilder), ячейки на арене (SpellSlots) и рука веером (HandDock).
// Карту можно перетащить на место или нажать — откроется крупно с кнопками.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { SPELLS, TREASURES } from '../data/cards'
import { T } from '../game/core'
import { TRAP, type CardId, type SpellType } from '../game/types'
import { cardUrl } from '../assets'
import { cardText, SchoolIcon, SpellMeta, useHover } from './cards'
import { sfx } from './sound'

export type Slot = Exclude<SpellType, 'wild'>
export const SLOTS: Slot[] = ['source', 'quality', 'delivery']
const SLOT_NAME: Record<Slot, string> = { source: 'Заводила', quality: 'Наворот', delivery: 'Приход' }
const SLOT_ICON: Record<Slot, string> = { source: 'З', quality: 'Н', delivery: 'П' }

const typeOf = (id: CardId) => (id === TRAP ? 'wild' : SPELLS[Math.floor(id / 10)].type)
const img = (id: CardId) => (id === TRAP ? cardUrl('treasures', T.trap) : cardUrl('spells', Math.floor(id / 10)))
// Порядок в руке: заводилы → навороты → приходы (по убыванию инициативы); «Шальная магия» (и ловушка)
// встаёт на место недостающего типа, а если все типы есть — в конец.
export function sortHand(ids: CardId[]): CardId[] {
  const sp = (id: CardId) => SPELLS[Math.floor(id / 10)]
  const wild = ids.filter(id => typeOf(id) === 'wild')
  const group = (t: Slot) => ids.filter(id => typeOf(id) === t)
    .sort((a, b) => (t === 'delivery' ? (sp(b).initiative ?? 0) - (sp(a).initiative ?? 0) : 0) || sp(a).name.localeCompare(sp(b).name, 'ru'))
  const out: CardId[] = []
  for (const t of SLOTS) {
    const g = group(t)
    if (!g.length && wild.length) out.push(wild.shift()!)
    out.push(...g)
  }
  return [...out, ...wild]
}
const fits = (id: CardId, slot: Slot) => { const t = typeOf(id); return t === 'wild' || t === slot }

function Badge({ id }: { id: CardId }) {
  if (id === TRAP) return <span className="badge wild">★</span>
  const s = SPELLS[Math.floor(id / 10)]
  if (s.type === 'wild') return <span className="badge wild">★</span>
  return (
    <span className={`badge ${s.type}`}>
      {s.type === 'source' ? 'З' : s.type === 'quality' ? 'Н' : 'П'}
      {s.school && <SchoolIcon s={s.school} size={15} />}
      {s.initiative != null && <em>{s.initiative}</em>}
    </span>
  )
}

interface Drag { id: CardId; from: 'hand' | Slot; x: number; y: number; over: Slot | null; started: boolean; sx: number; sy: number }

// ---------- сборщик: что лежит в ячейках, что тащим, что рассматриваем ----------
export function useBuilder(hand: CardId[], hasTrap: boolean, canBuild: boolean, resetKey: string) {
  const [slots, setSlots] = useState<Partial<Record<Slot, CardId>>>({})
  const [goLast, setGoLast] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [inspect, setInspect] = useState<CardId | null>(null)
  // новый раунд/игрок — пустые ячейки
  const [key, setKey] = useState(resetKey)
  if (key !== resetKey) { setKey(resetKey); setSlots({}); setGoLast(false); setDrag(null); setInspect(null) }

  const pool = sortHand([...hand, ...(hasTrap ? [TRAP] : [])])
  const placed = new Set(Object.values(slots))
  const inHand = pool.filter(id => !placed.has(id))

  const place = (id: CardId, slot: Slot) => {
    if (!fits(id, slot)) return false
    setSlots(sl => {
      const n: Partial<Record<Slot, CardId>> = {}
      for (const k of SLOTS) if (sl[k] != null && sl[k] !== id) n[k] = sl[k]
      n[slot] = id
      return n
    })
    sfx.place()
    return true
  }
  const unplace = (id: CardId) => setSlots(sl => Object.fromEntries(Object.entries(sl).filter(([, v]) => v !== id)))
  const autoSlot = (id: CardId): Slot | null => {
    const t = typeOf(id)
    if (t !== 'wild') return t as Slot
    return SLOTS.find(k => slots[k] == null) ?? null
  }

  // перетаскивание: слушаем всё окно, чтобы карта не «залипала», если палец ушёл за край
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag
  const placeRef = useRef(place)
  placeRef.current = place
  const unplaceRef = useRef(unplace)
  unplaceRef.current = unplace
  // Нажатие: короткое — открыть карту; долгое (без движения) — крупная копия, пока держишь; с движением — тащить.
  const [peek, setPeek] = useState<CardId | null>(null)
  const pressTimer = useRef(0)
  const peekRef = useRef<CardId | null>(null)
  peekRef.current = peek
  const canBuildRef = useRef(canBuild)
  canBuildRef.current = canBuild
  const down = (id: CardId, from: Drag['from']) => (e: RPE) => {
    e.preventDefault()
    setDrag({ id, from, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, over: null, started: false })
    clearTimeout(pressTimer.current)
    if (from === 'hand') pressTimer.current = window.setTimeout(() => { if (!dragRef.current?.started) setPeek(id) }, 280)
  }
  const dragging = drag != null
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      // карта зажата (увеличена): палец влево-вправо — листаем руку; вверх — тащим увеличенную карту в заклинание
      if (peekRef.current != null && !d.started) {
        if (canBuildRef.current && d.sy - e.clientY > 60) {
          setPeek(null)
          setDrag({ ...d, x: e.clientX, y: e.clientY, started: true, over: null })
          return
        }
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-card]') as HTMLElement | null
        const id = el ? Number(el.dataset.card) : null
        if (id != null && id !== peekRef.current) { setPeek(id); setDrag({ ...d, id, x: e.clientX, y: e.clientY }); sfx.tap() }
        return
      }
      const far = Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10
      if (far && !canBuildRef.current) { clearTimeout(pressTimer.current); setPeek(null); setDrag(null); return } // вне сбора — не тащим
      const started = d.started || far
      if (started) { clearTimeout(pressTimer.current); setPeek(null) }
      let over: Slot | null = null
      if (started) {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null
        over = (el?.dataset.slot as Slot) ?? null
      }
      setDrag({ ...d, x: e.clientX, y: e.clientY, started, over })
    }
    const up = () => {
      const d = dragRef.current
      clearTimeout(pressTimer.current)
      const peeked = peekRef.current != null
      setPeek(null)
      setDrag(null)
      if (!d || peeked) return // отпустил после долгого нажатия — просто убрать копию
      if (!d.started) { sfx.tap(); setInspect(d.id); return }
      if (d.over && fits(d.id, d.over)) placeRef.current(d.id, d.over)
      else if (d.from !== 'hand') unplaceRef.current(d.id) // утащили карту с места — вернуть в руку
    }
    const cancel = () => { clearTimeout(pressTimer.current); setPeek(null); setDrag(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [dragging])

  return { slots, goLast, setGoLast, drag, inspect, setInspect, inHand, canBuild, place, unplace, autoSlot, down, peek }
}
export type Builder = ReturnType<typeof useBuilder>

// ---------- ячейки заклинания (на арене) ----------
export function SpellSlots({ b, hasJet, onSubmit }: {
  b: Builder; hasJet: boolean; onSubmit: (cards: { id: CardId; slot: Slot }[], goLast: boolean) => void
}) {
  const count = Object.keys(b.slots).length
  return (
    <div className="spell-build">
      <div className="slots">
        {SLOTS.map(k => {
          const id = b.slots[k]
          const ok = b.drag?.started && fits(b.drag.id, k)
          return (
            <div key={k} data-slot={k} className={`slot ${k}${ok ? ' ok' : ''}${b.drag?.over === k ? ' over' : ''}${id != null ? ' full' : ''}`}>
              {id != null && !(b.drag?.started && b.drag.id === id)
                ? <img src={img(id)} alt="" draggable={false} onPointerDown={b.down(id, k)} />
                : <div className="slot-empty"><span className={`slot-letter ${k}`}>{SLOT_ICON[k]}</span><b>{SLOT_NAME[k]}</b><small>перетащи сюда</small></div>}
            </div>
          )
        })}
      </div>
      <div className="cast-row">
        {hasJet && <label className="check"><input type="checkbox" checked={b.goLast} onChange={e => b.setGoLast(e.target.checked)} /> Ранец: ходить последним</label>}
        <button className={`btn cast${count ? ' ready' : ''}`} disabled={!count}
          onClick={() => { sfx.boom(); onSubmit(SLOTS.filter(k => b.slots[k] != null).map(k => ({ id: b.slots[k]!, slot: k })), b.goLast) }}>
          {count ? `⚡ Колдовать! (${count})` : 'Собери заклинание: 1–3 карты'}
        </button>
      </div>
    </div>
  )
}

// ---------- рука веером ----------
export default function HandDock({ b, waitText }: { b: Builder; waitText?: string }) {
  const { canBuild, inHand, drag } = b
  const hover = useHover()
  const [hov, setHov] = useState<CardId | null>(null) // карта под мышью (только для устройств с мышью)
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  const fanRef = useRef<HTMLDivElement>(null)
  const [fanW, setFanW] = useState(360)
  useLayoutEffect(() => {
    const el = fanRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFanW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // размер карты: широкий экран (ПК, рука на всю ширину) — крупнее, но не выше доли окна
  const wide = fanW > 700
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const cap = Math.min(canBuild ? (wide ? 240 : 130) : (wide ? 170 : 84), (vh * (canBuild ? (wide ? 0.3 : 0.26) : (wide ? 0.2 : 0.16))) / 1.413)
  const per = canBuild ? 3 : 4.4
  const MAX_ROT = 6 // наклон крайних карт, градусов
  const guess = Math.min(cap, (fanW - 24) / per)
  const PAD = 12 + guess * 1.413 * Math.sin((MAX_ROT * Math.PI) / 180) // поле под наклонённый угол крайней карты
  const usable = fanW - PAD * 2
  const CW = Math.min(cap, usable / per)
  const CH = CW * 1.413
  const n = inHand.length
  const mid = (n - 1) / 2
  const step = n > 1 ? Math.min(CW * 0.95, (usable - CW) / (n - 1)) : 0
  const startX = PAD + (usable - (CW + step * (n - 1))) / 2
  const dropK = 1.3
  const maxDrop = mid * mid * dropK

  const insp = b.inspect
  const shownPeek = b.peek ?? (hov != null && !drag ? hov : null) // долгое нажатие (телефон) или наведение (мышь)
  return (
    <div className="dock">
      {!canBuild && waitText && <div className="wait">{waitText}</div>}

      <div className={`fan${canBuild ? '' : ' passive'}${drag?.started ? ' dragging' : ''}`} ref={fanRef} style={{ height: CH + maxDrop + 16 }}>
        {inHand.map((id, i) => {
          const rot = n > 1 ? ((i - mid) / mid) * Math.min(MAX_ROT, n * 0.8) : 0
          const drop = (i - mid) ** 2 * dropK
          const dragging = drag?.started && drag.id === id
          return (
            // .fan-card — неподвижная «зона мыши»; увеличенная копия рисуется отдельно (.fan-peek) и мышь не перехватывает
            <div key={id} data-card={id} className={`fan-card${dragging ? ' ghosted' : ''}${(hov === id && !drag) || b.peek === id ? ' hov' : ''}`} onPointerDown={b.down(id, 'hand')} onContextMenu={e => e.preventDefault()}
              onMouseEnter={() => { if (!canHover || drag) return; setHov(id); hover(id === TRAP ? { deck: 'treasures', index: T.trap } : { deck: 'spells', index: Math.floor(id / 10) }) }}
              onMouseLeave={() => { if (!canHover) return; setHov(h => (h === id ? null : h)); hover(null) }}
              style={{ width: CW, left: startX + i * step, top: 10 + drop, transform: `rotate(${rot}deg)`, zIndex: i }}>
              <img src={img(id)} alt="" draggable={false} />
              <Badge id={id} />
            </div>
          )
        })}
        {shownPeek != null && inHand.includes(shownPeek) && (() => {
          // увеличенная копия над картой: по центру карты, не вылезает за края веера
          const i = inHand.indexOf(shownPeek)
          const PW = Math.min(CW * (wide ? 1.5 : 1.9), wide ? 360 : 250), PH = PW * 1.413
          const cx = startX + i * step + CW / 2
          const left = Math.max(0, Math.min(fanW - PW, cx - PW / 2))
          const bottomY = 10 + (i - mid) ** 2 * dropK + CH * 0.62
          return (
            <div className="fan-peek" style={{ width: PW, left, top: bottomY - PH }}>
              <img src={img(shownPeek)} alt="" draggable={false} />
            </div>
          )
        })()}
      </div>

      {drag?.started && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y, width: Math.min(CW * 1.1, 200) }}>
          <img src={img(drag.id)} alt="" />
        </div>
      )}

      {insp != null && (
        <Inspect id={insp} onClose={() => b.setInspect(null)}
          slot={canBuild ? b.autoSlot(insp) : null} placedIn={SLOTS.find(k => b.slots[k] === insp) ?? null}
          onPlace={k => { b.place(insp, k); b.setInspect(null) }} onRemove={() => { b.unplace(insp); b.setInspect(null) }}
          freeSlots={canBuild ? SLOTS.filter(k => fits(insp, k)) : []} />
      )}
    </div>
  )
}

function Inspect({ id, onClose, slot, placedIn, onPlace, onRemove, freeSlots }: {
  id: CardId; onClose: () => void; slot: Slot | null; placedIn: Slot | null; onPlace: (k: Slot) => void; onRemove: () => void; freeSlots: Slot[]
}) {
  const isTrap = id === TRAP
  const sp = isTrap ? null : SPELLS[Math.floor(id / 10)]
  const title = isTrap ? TREASURES[T.trap].name : sp!.name
  const lines = isTrap ? [TREASURES[T.trap].text] : cardText({ deck: 'spells', index: sp!.index })
  const wild = typeOf(id) === 'wild'
  return (
    <div className="inspect" onClick={onClose}>
      <div className="inspect-card" onClick={e => e.stopPropagation()}>
        <img src={img(id)} alt="" />
        <div className="inspect-text">
          <h3>{title}</h3>
          {sp && <div className="inspect-meta"><SpellMeta index={sp.index} long /></div>}
          {lines.map((l, i) => <p key={i} className={/^\d/.test(l) ? 'tier-line' : ''}>{l}</p>)}
        </div>
        <div className="inspect-btns">
          {placedIn ? <button className="btn" onClick={onRemove}>↩ Убрать из заклинания</button>
            : wild ? freeSlots.map(k => <button key={k} className="btn gold" onClick={() => onPlace(k)}>{SLOT_ICON[k]}: в {SLOT_NAME[k].toLowerCase()}</button>)
              : slot && <button className="btn gold" onClick={() => onPlace(slot)}>В заклинание</button>}
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
