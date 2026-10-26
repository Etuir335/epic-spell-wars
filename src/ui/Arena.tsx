// Арена: кто колдует, его карты (рубашкой вверх → переворот), название заклинания, кубики, баннеры.
import { forwardRef, type ReactNode } from 'react'
import { SPELLS } from '../data/cards'
import type { GameState } from '../game/types'
import { assetUrl, cardUrl } from '../assets'
import { Portrait, useHover, useZoom } from './cards'
import type { Scene } from './director'

const backUrl = assetUrl('assets/cards/spells/_back.webp')
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

export function Die({ v, i }: { v: number; i: number }) {
  return (
    <div className="die" style={{ animationDelay: `${i * 60}ms` }}>
      {Array.from({ length: 9 }, (_, k) => <span key={k} className={PIPS[v]?.includes(k) ? 'pip' : ''} />)}
    </div>
  )
}

const Arena = forwardRef<HTMLDivElement, { s: GameState; scene: Scene; idle: string; slots?: ReactNode }>(function Arena({ s, scene, idle, slots }, ref) {
  const zoom = useZoom()
  const hover = useHover()
  const caster = scene.caster != null ? s.players[scene.caster] : null
  const n = scene.cards.length
  const roll = scene.roll
  const tiers = roll?.card != null ? SPELLS[roll.card].mighty : null
  const tierIdx = roll ? (roll.total >= 10 ? 2 : roll.total >= 5 ? 1 : 0) : -1

  return (
    <div className={`arena${slots ? ' building' : ''}`} ref={ref}>
      <div className="embers">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.7) % 5}s` }} />)}</div>

      {slots ? <div className="slot-host">{slots}</div> : caster ? (
        <>
          <div className="caster" key={'c' + scene.caster}>
            <Portrait i={caster.portrait} size={46} />
            <div><small>колдует</small><b>{caster.name}</b></div>
          </div>
          <div className={`spell-row n${Math.min(n, 6)}`}>
            {scene.cards.map((c, i) => {
              const sp = c.id != null && c.id >= 0 ? SPELLS[Math.floor(c.id / 10)] : null
              const face = c.id == null ? backUrl : c.id < 0 ? cardUrl('treasures', 2) : cardUrl('spells', Math.floor(c.id / 10))
              return (
                <div key={c.key} className={`flip${c.up ? ' up' : ''}${c.on ? ' on' : ''}${c.done ? ' done' : ''}${c.added ? ' added' : ''}`}
                  style={{ ['--d' as string]: c.up && !c.added ? `${300 + i * 480}ms` : '0ms', ['--sc' as string]: sp?.school ? `var(--${sp.school})` : '#ffcf4a' }}
                  onMouseEnter={() => c.id != null && c.up && hover(c.id < 0 ? { deck: 'treasures', index: 2 } : { deck: 'spells', index: Math.floor(c.id / 10) })}
                  onMouseLeave={() => hover(null)}
                  onClick={() => c.id != null && c.up && zoom(c.id < 0 ? { deck: 'treasures', index: 2 } : { deck: 'spells', index: Math.floor(c.id / 10) })}>
                  <div className="flip-in">
                    <img className="face back" src={backUrl} alt="" />
                    <img className="face front" key={c.flash} src={face} alt="" />
                  </div>
                </div>
              )
            })}
          </div>
          {scene.title && (
            <div className="spell-title" key={scene.titleKey} style={{ animationDelay: `${300 + n * 480}ms` }}>
              <span>{scene.title}</span>
            </div>
          )}
        </>
      ) : (
        <div className="arena-idle">{idle}</div>
      )}

      {roll && (
        <div className="roll" key={roll.key}>
          <div className="roll-who">🎲 {s.players[roll.p].name}{roll.label ? ` · ${roll.label}` : ''}</div>
          <div className="dice">{roll.dice.map((d, i) => <Die key={i} v={d} i={i} />)}
            {roll.bonus !== 0 && <b className="bonus">+{roll.bonus}</b>}
            {(roll.dice.length > 1 || roll.bonus !== 0) && <b className="total">= {roll.total}</b>}
          </div>
          {tiers && (
            <div className="tiers">
              {tiers.map((t, i) => (
                <div key={i} className={i === tierIdx ? 'hit' : ''}><b>{t.from}{t.to ? '–' + t.to : '+'}</b> {t.text}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ticker">{scene.ticker}</div>

      {scene.banner && (
        <div className={`banner ${scene.banner.kind}`} key={scene.banner.key}>
          <b>{scene.banner.text}</b>
          {scene.banner.sub && <small>{scene.banner.sub}</small>}
        </div>
      )}
    </div>
  )
})
export default Arena
