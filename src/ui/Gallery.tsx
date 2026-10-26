import { useState } from 'react'
import { cardUrl } from '../assets'
import { DEAD, SCHOOL_NAMES, SPELLS, TREASURES, TYPE_NAMES } from '../data/cards'

// Галерея для сверки расшифровки: картинка + текст из данных.
type Item = { key: string; img: string; title: string; sub: string; lines: string[] }

const spellItems: Item[] = SPELLS.map(s => ({
  key: 's' + s.index, img: cardUrl('spells', s.index), title: s.name,
  sub: [TYPE_NAMES[s.type], s.school && SCHOOL_NAMES[s.school], s.initiative != null && `иниц. ${s.initiative}`, `×${s.copies}`, s.promo && 'промо'].filter(Boolean).join(' · '),
  lines: s.mighty ? [s.victim!, ...s.mighty.map(t => `${t.from}${t.to ? '–' + t.to : '+'}: ${t.text}`)] : [s.text!],
}))
const treasureItems: Item[] = TREASURES.map(t => ({
  key: 't' + t.index, img: cardUrl('treasures', t.index), title: t.name, sub: t.promo ? 'промо' : '', lines: [t.text],
}))
const deadItems: Item[] = DEAD.map(d => ({ key: 'd' + d.index, img: cardUrl('dead', d.index), title: d.name, sub: `×${d.copies}`, lines: [d.text] }))
const wizardItems: Item[] = Array.from({ length: 41 }, (_, i) => ({ key: 'w' + i, img: cardUrl('wizards', i), title: `Колдун ${i}`, sub: '', lines: [] }))

const TABS = [['Заклинания', spellItems], ['Сокровища', treasureItems], ['Дохлые', deadItems], ['Колдуны', wizardItems]] as const

export default function Gallery({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState(0)
  const [zoom, setZoom] = useState<string | null>(null)
  return (
    <div className="gallery">
      <div className="tabs"><button onClick={onBack}>← Меню</button>{TABS.map(([n, list], i) => <button key={n} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>{n} ({list.length})</button>)}</div>
      <div className="grid">
        {TABS[tab][1].map(it => (
          <div className="g-card" key={it.key}>
            <img src={it.img} loading="lazy" onClick={() => setZoom(it.img)} />
            <b>{it.key.slice(1)}. {it.title}</b>
            {it.sub && <small>{it.sub}</small>}
            {it.lines.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        ))}
      </div>
      {zoom && <div className="zoom" onClick={() => setZoom(null)}><img src={zoom} /></div>}
    </div>
  )
}
