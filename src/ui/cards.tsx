// Картинки карт, подписи и просмотр на весь экран.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEAD, SCHOOL_NAMES, SPELLS, TREASURES, TYPE_NAMES, type School } from '../data/cards'
import { assetUrl, cardUrl } from '../assets'

export type Deck = 'spells' | 'treasures' | 'dead'
export interface CardRef { deck: Deck; index: number }

// Значок знака школы — вырезан с карт (scripts/extract-icons.mjs).
export function SchoolIcon({ s, size = 16 }: { s: School; size?: number }) {
  return <img className="sicon" src={assetUrl(`assets/ui/school-${s}.webp`)} style={{ width: size, height: size }} alt={SCHOOL_NAMES[s]} title={SCHOOL_NAMES[s]} />
}
// «Тип · знак · инициатива» для подписей и подсказок.
export function SpellMeta({ index, long }: { index: number; long?: boolean }) {
  const s = SPELLS[index]
  return (
    <span className="smeta">
      {long ? TYPE_NAMES[s.type] : TYPE_SHORT[s.type]}
      {s.school && <>{long && ' ·'} <SchoolIcon s={s.school} size={long ? 18 : 14} />{long && ` ${SCHOOL_NAMES[s.school]}`}</>}
      {s.initiative != null && <>{long ? ` · инициатива ${s.initiative}` : ` ${s.initiative}`}</>}
    </span>
  )
}
const TYPE_SHORT = { source: 'З', quality: 'Н', delivery: 'П', wild: '★' } as const

export function cardTitle(c: CardRef): string {
  if (c.deck === 'spells') return SPELLS[c.index].name
  if (c.deck === 'treasures') return TREASURES[c.index].name
  return DEAD[c.index].name
}
export function cardText(c: CardRef): string[] {
  if (c.deck === 'treasures') return [TREASURES[c.index].text]
  if (c.deck === 'dead') return [DEAD[c.index].text]
  const s = SPELLS[c.index]
  if (!s.mighty) return [s.text!]
  return [s.victim!, 'Могучий бросок:', ...s.mighty.map(t => `${t.from}${t.to ? '–' + t.to : '+'}: ${t.text}`)]
}

// ---------- просмотр ----------
const ZoomCtx = createContext<(c: CardRef | null) => void>(() => {})
export const useZoom = () => useContext(ZoomCtx)
// Наведение мышью на карту (ПК): показываем её крупно с текстом.
export const HoverCtx = createContext<(c: CardRef | null) => void>(() => {})
export const useHover = () => useContext(HoverCtx)
const DESK = '(min-width: 1000px) and (hover: hover)'
export function useIsDesktop(): boolean {
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESK).matches)
  useEffect(() => {
    const m = window.matchMedia(DESK)
    const f = () => setD(m.matches)
    if (!m.addEventListener) { m.addListener(f); return () => m.removeListener(f) } // старый Edge 18
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return d
}

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [card, setCard] = useState<CardRef | null>(null)
  return (
    <ZoomCtx.Provider value={setCard}>
      {children}
      {card && (
        <div className="zoom" onClick={() => setCard(null)}>
          <img src={cardUrl(card.deck, card.index)} alt="" />
          <div className="zoom-text">
            <b>{cardTitle(card)}</b>
            {card.deck === 'spells' && SPELLS[card.index].school && <small> · {SCHOOL_NAMES[SPELLS[card.index].school!]}</small>}
            {cardText(card).map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}
    </ZoomCtx.Provider>
  )
}

// Карта с подписью. onClick — действие (выбор), 🔍 — просмотр.
export function Card({ c, onClick, selected, dim, caption = true, size = 'm' }: {
  c: CardRef; onClick?: () => void; selected?: boolean; dim?: boolean; caption?: boolean; size?: 's' | 'm' | 'l'
}) {
  const zoom = useZoom()
  const hover = useHover()
  return (
    <div className={`card card-${size}${selected ? ' sel' : ''}${dim ? ' dim' : ''}`} onClick={onClick ?? (() => zoom(c))}
      onMouseEnter={() => hover(c)} onMouseLeave={() => hover(null)}>
      <img src={cardUrl(c.deck, c.index)} alt="" loading="lazy" draggable={false} />
      {onClick && <button className="card-zoom" onClick={e => { e.stopPropagation(); zoom(c) }}>🔍</button>}
      {caption && <div className="card-cap"><span>{cardTitle(c)}</span>{c.deck === 'spells' && <i><SpellMeta index={c.index} /></i>}</div>}
    </div>
  )
}

export function Portrait({ i, size = 40, dead }: { i: number; size?: number; dead?: boolean }) {
  return <img className={'portrait' + (dead ? ' dead' : '')} src={cardUrl('wizards', i)} style={{ width: size, height: size }} alt="" />
}
