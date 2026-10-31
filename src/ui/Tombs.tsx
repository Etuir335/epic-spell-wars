// Карты дохлых колдунов в начале игры: по очереди вылетают от колдуна в центр, срабатывают и сгорают в призрачном пламени.
import { useEffect, useState } from 'react'
import { cardUrl } from '../assets'
import { DEAD } from '../data/cards'

interface Tomb { key: number; c: number; name: string; i: number; n: number; dx: number; dy: number }
const EV = 'esw-tomb'
let seq = 0

export function showTomb(pid: number, c: number, name: string, i: number, n: number) {
  window.dispatchEvent(new CustomEvent(EV, { detail: { pid, c, name, i, n } }))
}

export function TombLayer() {
  const [list, setList] = useState<Tomb[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const { pid, c, name, i, n } = (e as CustomEvent).detail as { pid: number; c: number; name: string; i: number; n: number }
      const r = document.querySelector(`.ava[data-pid="${pid}"]`)?.getBoundingClientRect()
      const t: Tomb = { key: ++seq, c, name, i, n, dx: r ? r.left + r.width / 2 - innerWidth / 2 : 0, dy: r ? r.top + r.height / 2 - innerHeight / 2 : 0 }
      setList(l => [...l, t])
      setTimeout(() => setList(l => l.filter(o => o.key !== t.key)), 2600)
    }
    window.addEventListener(EV, on)
    return () => window.removeEventListener(EV, on)
  }, [])
  if (!list.length) return null
  return <div className="tomb-layer">
    {list.map(t => (
      <div key={t.key} className="tomb" style={{ '--dx': `${t.dx}px`, '--dy': `${t.dy}px` } as React.CSSProperties}>
        <div className="tomb-card">
          <img src={cardUrl('dead', Math.floor(t.c / 10))} alt="" draggable={false} />
          <i className="tomb-fire" />
        </div>
        <div className="tomb-cap"><b>{t.name}</b> · {DEAD[Math.floor(t.c / 10)].name}{t.n > 1 && <small>{t.i + 1} / {t.n}</small>}</div>
      </div>
    ))}
  </div>
}
