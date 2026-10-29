// Раскладка игры на ПК (как в «Апокалипсисе»): центр и две колонки панелей. Панели можно перетаскивать
// между колонками, сворачивать, закрывать (и возвращать), менять им высоту; ширину колонок — разделителями.
// Всё запоминается в браузере.
import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'

export interface PanelDef { id: string; title: string; node: ReactNode; grow?: boolean }
type Col = 'left' | 'right'
interface LayoutState { left: string[]; right: string[]; hidden: string[]; collapsed: string[]; heights: Record<string, number>; wLeft: number; wRight: number }

const KEY = 'esw-desk-layout'
const DEFAULT: LayoutState = { left: ['players', 'memo', 'log'], right: ['card'], hidden: [], collapsed: [], heights: {}, wLeft: 380, wRight: 420 }

function load(ids: string[]): LayoutState {
  let st = DEFAULT
  try { const raw = localStorage.getItem(KEY); if (raw) st = { ...DEFAULT, ...(JSON.parse(raw) as LayoutState) } } catch { st = DEFAULT }
  const known = (list: string[]) => list.filter(id => ids.includes(id))
  st = { ...st, left: known(st.left), right: known(st.right), hidden: known(st.hidden) }
  const placed = new Set([...st.left, ...st.right, ...st.hidden])
  const fresh = ids.filter(id => !placed.has(id))
  st.left = [...st.left, ...fresh.filter(id => DEFAULT.left.includes(id))]
  st.right = [...st.right, ...fresh.filter(id => !DEFAULT.left.includes(id))]
  return st
}

export function useDeskLayout(ids: string[]) {
  const [st, setSt] = useState<LayoutState>(() => load(ids))
  const dragId = useRef<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const update = (fn: (s: LayoutState) => LayoutState) => setSt(prev => {
    const next = fn(prev)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* раскладка просто не запомнится */ }
    return next
  })
  const without = (s: LayoutState, id: string): LayoutState => ({ ...s, left: s.left.filter(x => x !== id), right: s.right.filter(x => x !== id), hidden: s.hidden.filter(x => x !== id) })
  const moveTo = (id: string, col: Col, before?: string) => update(s => {
    const n = without(s, id), list = [...n[col]], i = before ? list.indexOf(before) : -1
    list.splice(i >= 0 ? i : list.length, 0, id)
    return { ...n, [col]: list }
  })
  // перетаскивание мышью: размеры
  const drag = (e: RPointerEvent, onMove: (dx: number, dy: number) => void) => {
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY
    const move = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const resizeCol = (col: Col) => (e: RPointerEvent) => {
    const start = col === 'left' ? st.wLeft : st.wRight, max = Math.max(320, window.innerWidth * 0.4)
    drag(e, dx => { const w = Math.min(max, Math.max(240, start + (col === 'left' ? dx : -dx))); update(s => (col === 'left' ? { ...s, wLeft: w } : { ...s, wRight: w })) })
  }
  const resizePanel = (id: string, el: HTMLElement | null) => (e: RPointerEvent) => {
    const start = el?.getBoundingClientRect().height ?? 200
    drag(e, (_, dy) => update(s => ({ ...s, heights: { ...s.heights, [id]: Math.max(70, start + dy) } })))
  }

  const column = (col: Col, panels: PanelDef[]) => (
    <div className={`dl-col ${col}${dragging ? ' dragging' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (dragId.current) moveTo(dragId.current, col); dragId.current = null; setDragging(false) }}>
      {col === 'right' && st.hidden.length > 0 && (
        <div className="dl-restore">
          <span>Вернуть:</span>
          {st.hidden.map(id => <button key={id} onClick={() => moveTo(id, 'right')}>＋ {panels.find(p => p.id === id)?.title}</button>)}
        </div>
      )}
      {st[col].map(id => {
        const p = panels.find(x => x.id === id)
        if (!p) return null
        return <Panel key={id} p={p} collapsed={st.collapsed.includes(id)} height={st.heights[id]}
          onDragStart={() => { dragId.current = id; setDragging(true) }}
          onDragEnd={() => setDragging(false)}
          onDropBefore={() => { if (dragId.current && dragId.current !== id) moveTo(dragId.current, col, id); dragId.current = null; setDragging(false) }}
          onCollapse={() => update(s => ({ ...s, collapsed: s.collapsed.includes(id) ? s.collapsed.filter(x => x !== id) : [...s.collapsed, id] }))}
          onClose={() => update(s => ({ ...without(s, id), hidden: [...s.hidden.filter(x => x !== id), id] }))}
          onAutoHeight={() => update(s => { const h = { ...s.heights }; delete h[id]; return { ...s, heights: h } })}
          onResize={resizePanel} />
      })}
      <div className="dl-dropzone">перетащи панель сюда</div>
    </div>
  )
  const split = (col: Col) => <div className={`dl-split ${col}`} onPointerDown={resizeCol(col)} title="Потяни, чтобы изменить ширину" />
  return { cols: `${st.wLeft}px 8px minmax(420px, 1fr) 8px ${st.wRight}px`, column, split }
}

function Panel({ p, collapsed, height, onDragStart, onDragEnd, onDropBefore, onCollapse, onClose, onAutoHeight, onResize }: {
  p: PanelDef; collapsed: boolean; height?: number
  onDragStart: () => void; onDragEnd: () => void; onDropBefore: () => void; onCollapse: () => void; onClose: () => void; onAutoHeight: () => void
  onResize: (id: string, el: HTMLElement | null) => (e: RPointerEvent) => void
}) {
  const body = useRef<HTMLDivElement>(null)
  const grow = !collapsed && !height && p.grow
  return (
    <section className={`panel dpanel${grow ? ' grow' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropBefore() }}>
      <header className="dp-head" draggable onDragStart={e => { e.dataTransfer.setData('text/plain', p.id); onDragStart() }} onDragEnd={onDragEnd}>
        <span className="grip" title="Перетащи панель">⠿</span>
        <h4>{p.title}</h4>
        <button className="dp-btn" onClick={onCollapse} title={collapsed ? 'Развернуть' : 'Свернуть'}>{collapsed ? '▸' : '▾'}</button>
        <button className="dp-btn" onClick={onClose} title="Закрыть">✕</button>
      </header>
      {!collapsed && <>
        <div className="dp-body" ref={body} style={height ? { height } : undefined}>{p.node}</div>
        <div className="dp-resize" onPointerDown={e => onResize(p.id, body.current)(e)} onDoubleClick={onAutoHeight} title="Потяни, чтобы изменить высоту (двойной щелчок — как было)" />
      </>}
    </section>
  )
}
