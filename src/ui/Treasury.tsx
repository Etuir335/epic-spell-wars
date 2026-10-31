// Сундуки и колдуны как в Clash Royale: 4 слота с таймерами, открытие с выкладкой карт по одной, коллекция с прокачкой.
import { useEffect, useState } from 'react'
import { cardUrl } from '../assets'
import { ABILITIES, RARITY_NAME, type Rarity } from '../game/abilities'
import { wizardName } from '../wizards'
import { emoteById } from '../emotes'
import {
  CHESTS, MAX_LVL, WIZ_COUNT, canUpgrade, chestSlots, freeChestReady, nextCost, openChest, opening, owned, rarityOf, ready, rushChest, rushCost, startOpening, upgrade,
  wizCards, wizLvl, type ChestKind, type Loot,
} from '../progression'
import { emoteImg } from './Emotes'
import EmoteDeck from './EmoteDeck'
import { dailyMe } from './Daily'
import { sfx, uiSfx } from './sound'
import { updateStats, useStatsData } from './useStats'

const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}
export const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h} ч ${m} мин` : m ? `${m} мин ${s % 60} с` : `${s} с`
}
// есть что открыть — для значка в меню
export function chestBadge(st: Parameters<typeof chestSlots>[0], now = Date.now()) {
  return chestSlots(st).filter(c => ready(c, now)).length + (freeChestReady(st) ? 1 : 0)
}

// Сундук, нарисованный в CSS: крышка, корпус, замок; цвет — по виду
export function ChestArt({ kind, size = 84, state = '' }: { kind: ChestKind; size?: number; state?: string }) {
  return (
    <div className={`chest k-${kind} ${state}`} style={{ ['--cs' as string]: `${size}px` }}>
      <i className="chest-glow" /><i className="chest-body" /><i className="chest-lid" /><i className="chest-lock" />
    </div>
  )
}

export function Chests({ onBack }: { onBack: () => void }) {
  const st = useStatsData(), now = useNow()
  const slots = chestSlots(st), busy = opening(st)
  const [loot, setLoot] = useState<Loot | null>(null)
  const open = (i: number) => {
    let got: Loot | null = null
    updateStats(x => { got = openChest(x, i) })
    if (got) { sfx.boom(); setLoot(got) }
  }
  const tap = (i: number) => {
    const c = slots[i]
    if (!c) return
    if (ready(c, now)) open(i)
    else if (c.until == null && busy < 0) { sfx.chime(); updateStats(x => { startOpening(x, i) }) }
  }
  // быстро открыть за золото: первое нажатие — спросить, второе — открыть
  const [rushAsk, setRushAsk] = useState(-1)
  const rush = (i: number) => {
    if (rushAsk !== i) { setRushAsk(i); return }
    setRushAsk(-1)
    let got: Loot | null = null
    updateStats(x => { if (rushChest(x, i)) got = openChest(x, i) })
    if (got) { sfx.coin(); sfx.boom(); setLoot(got) } else sfx.hit()
  }
  const free = freeChestReady(st)
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0)

  return (
    <div className="screen chests-screen">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Сундуки</h2><span className="gold-chip">🪙 {st.gold ?? 0}</span></div>
      <button className={`free-chest${free ? ' on' : ''}`} disabled={!free} onClick={() => open(-1)}>
        <ChestArt kind="wood" size={64} state={free ? 'bounce' : 'dim'} />
        <span><b>Бесплатный сундук</b><small>{free ? 'Готов — забирай!' : `Следующий через ${fmtLeft(tomorrow.getTime() - now)}`}</small></span>
      </button>
      <div className="chest-slots">
        {slots.map((c, i) => {
          if (!c) return <div key={i} className="chest-slot empty"><span>Пустой слот</span></div>
          const k = CHESTS[c.kind], isReady = ready(c, now), ticking = c.until != null && !isReady
          return (
            <button key={i} className={`chest-slot k-${c.kind}${isReady ? ' ready' : ''}${ticking ? ' ticking' : ''}`} onClick={() => tap(i)}>
              <ChestArt kind={c.kind} size={70} state={isReady ? 'bounce' : ticking ? 'tick' : ''} />
              <b>{k.name}</b>
              <small>{isReady ? 'ОТКРЫТЬ!' : ticking ? fmtLeft(c.until! - now) : busy >= 0 ? fmtLeft(k.ms) : `▶ ${fmtLeft(k.ms)}`}</small>
              <em>Арена {c.arena + 1}</em>
              {!isReady && <span className={`chest-rush${rushAsk === i ? ' ask' : ''}${(st.gold ?? 0) < rushCost(c, now) ? ' poor' : ''}`} data-nosfx onClick={e => { e.stopPropagation(); rush(i) }}>
                {rushAsk === i ? 'Точно?' : '⚡'} 🪙{rushCost(c, now)}</span>}
            </button>
          )
        })}
      </div>
      <p className="hint center">Сундуки дают за победу на арене (за 2-е место среди 4+ колдунов — через раз), серебряный — за испытание дня. Открывается один за раз. Все 4 слота заняты — новый сундук пропадёт.</p>
      <div className="chest-odds">
        {(Object.keys(CHESTS) as ChestKind[]).map(k => (
          <div key={k}><ChestArt kind={k} size={40} /><b>{CHESTS[k].name}</b><small>{CHESTS[k].chance}% · {CHESTS[k].cards} карт · {fmtLeft(CHESTS[k].ms)}</small></div>
        ))}
      </div>
      {loot && <ChestOpen loot={loot} onDone={() => setLoot(null)} />}
    </div>
  )
}

// Открытие: сундук трясётся и распахивается, затем по нажатию — золото, карты колдунов по одной, эмоция; в конце — итог
type Step = { t: 'gold'; n: number } | { t: 'card'; c: Loot['cards'][number] } | { t: 'emote'; id: string }
function ChestOpen({ loot, onDone }: { loot: Loot; onDone: () => void }) {
  const st = useStatsData()
  const steps: Step[] = [{ t: 'gold', n: loot.gold }, ...loot.cards.map(c => ({ t: 'card' as const, c })), ...(loot.emote ? [{ t: 'emote' as const, id: loot.emote.id }] : [])]
  const [i, setI] = useState(-1) // −1 — сундук ещё закрыт
  useEffect(() => { uiSfx.rattle(); const t = setTimeout(() => { uiSfx.chestOpen(); setI(0) }, 1100); return () => clearTimeout(t) }, [])
  const step = steps[i]
  useEffect(() => {
    if (!step) return
    if (step.t === 'gold') sfx.coin()
    else if (step.t === 'emote') sfx.fanfare()
    else if (step.c.fresh || rarityOf(step.c.w) !== 'common') sfx.fanfare()
    else sfx.flip()
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { if (i < 0) return; if (i < steps.length) setI(i + 1); else onDone() }
  return (
    <div className="chest-open" onClick={next}>
      <div className="chest-rays" />
      {i < 0 && <ChestArt kind={loot.kind} size={150} state="opening" />}
      {step && <div key={i} className="loot-item">
        {step.t === 'gold' && <><div className="loot-gold">🪙</div><b className="loot-n">+{step.n}</b><span>золота</span></>}
        {step.t === 'card' && <LootCard c={step.c} lvl={wizLvl(st, step.c.w)} cards={wizCards(st, step.c.w)} />}
        {step.t === 'emote' && <><img className="loot-emote" src={emoteImg(step.id)} alt="" /><b>Новая эмоция!</b><span>{emoteById(step.id)?.name}</span></>}
      </div>}
      {i >= 0 && i < steps.length && <div className="loot-left">{steps.length - i - 1 > 0 ? `ещё ${steps.length - i - 1}` : 'последняя'} · нажми</div>}
      {i >= steps.length && <div className="loot-sum" onClick={e => e.stopPropagation()}>
        <h3>{CHESTS[loot.kind].name} сундук</h3>
        <div className="loot-grid">
          <div className="loot-mini"><span>🪙</span><b>{loot.gold}</b></div>
          {loot.cards.map(c => <div key={c.w} className={`loot-mini card r-${rarityOf(c.w)}`}><img className="lm-card" src={cardUrl('wizards', c.w)} alt="" /><b>×{c.n}</b>{c.fresh && <em>новый</em>}</div>)}
          {loot.emote && <div className="loot-mini"><img src={emoteImg(loot.emote.id)} alt="" /></div>}
        </div>
        <button className="btn wide gold" onClick={onDone}>Забрать</button>
      </div>}
    </div>
  )
}

function LootCard({ c, lvl, cards }: { c: Loot['cards'][number]; lvl: number; cards: number }) {
  const r = rarityOf(c.w), need = nextCost({ cups: 0, wiz: { [c.w]: { lvl, cards } } }, c.w)
  return <>
    <div className={`loot-card r-${r}`}>
      <img src={cardUrl('wizards', c.w)} alt="" />
      {c.fresh && <span className="loot-new">НОВЫЙ!</span>}
    </div>
    <b className="loot-n">×{c.n}</b>
    <span className="loot-name">{wizardName(c.w)} <small className={`rar r-${r}`}>{RARITY_NAME[r]}</small></span>
    {need ? <CountBar from={Math.max(0, cards - c.n + (c.fresh ? 1 : 0))} to={cards} need={need.cards} /> : c.spare ? <small>макс. уровень — +{c.spare} 🪙</small> : null}
  </>
}

// полоска копий в сундуке: было → стало, счётчик бежит, полоска заполняется, при полной — вспышка «можно улучшить»
function CountBar({ from, to, need }: { from: number; to: number; need: number }) {
  const [v, setV] = useState(from)
  useEffect(() => {
    if (to <= from) return
    let n = from, t = 0
    const step = Math.max(60, Math.min(220, 900 / (to - from)))
    const go = () => { n++; setV(n); sfx.tap(); if (n >= need && n - 1 < need) sfx.chime(); if (n < to) t = window.setTimeout(go, step) }
    t = window.setTimeout(go, 650)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`count-bar${v >= need ? ' ready' : ''}`}>
    <Bar have={v} need={need} />
    {v > from && <b key={v} className="count-plus">+{v - from}</b>}
    {v >= need && <small className="count-up">⬆ можно улучшить!</small>}
  </div>
}
function Bar({ have, need }: { have: number; need: number }) {
  return <div className={`wiz-bar${have >= need ? ' full' : ''}`}><i style={{ width: `${Math.min(100, (have / need) * 100)}%` }} /><span>{have} / {need}</span></div>
}

// ---------- коллекция колдунов ----------
const ORDER: Rarity[] = ['common', 'rare', 'epic', 'legend']
export function Wizards({ onBack }: { onBack: () => void }) {
  const st = useStatsData()
  const [look, setLook] = useState<number | null>(null)
  const [emo, setEmo] = useState(false)
  const all = Array.from({ length: WIZ_COUNT }, (_, w) => w)
  const mine = all.filter(w => owned(st, w)).sort((a, b) => ORDER.indexOf(rarityOf(a)) - ORDER.indexOf(rarityOf(b)) || wizLvl(st, b) - wizLvl(st, a))
  const locked = all.filter(w => !owned(st, w)).sort((a, b) => ORDER.indexOf(rarityOf(a)) - ORDER.indexOf(rarityOf(b)))
  const tile = (w: number) => {
    const l = wizLvl(st, w), cost = nextCost(st, w)
    return (
      <button key={w} className={`wiz-tile r-${rarityOf(w)}${l ? '' : ' locked'}${canUpgrade(st, w) ? ' up' : ''}`} onClick={() => setLook(w)}>
        <img src={cardUrl('wizards', w)} alt="" loading="lazy" />
        {l > 0 && <span className="wiz-lvl">ур. {l}</span>}
        {l > 0 && (cost ? <Bar have={wizCards(st, w)} need={cost.cards} /> : <div className="wiz-bar max"><i style={{ width: '100%' }} /><span>МАКС</span></div>)}
        {!l && <span className="wiz-lock">🔒</span>}
      </button>
    )
  }
  if (emo) return <EmoteDeck portrait={dailyMe().portrait} onBack={() => setEmo(false)} />
  return (
    <div className="screen wizards-screen">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Колдуны</h2><span className="gold-chip">🪙 {st.gold ?? 0}</span></div>
      <button className="btn wide emo-open" onClick={() => setEmo(true)}>😆 Эмоции на бой — выбрать 8</button>
      <h3 className="ach-head">Открыто <span>{mine.length} / {WIZ_COUNT}</span></h3>
      <div className="wiz-coll">{mine.map(tile)}</div>
      {locked.length > 0 && <><h3 className="ach-head">Ещё не найдены</h3><p className="hint">Выпадают из сундуков. Чем реже колдун, тем сильнее способность.</p><div className="wiz-coll">{locked.map(tile)}</div></>}
      {look != null && <WizardSheet w={look} onClose={() => setLook(null)} onNav={d => setLook((look + d + WIZ_COUNT) % WIZ_COUNT)} />}
    </div>
  )
}

const PROFILE = 'esw-profile'
function setMine(w: number) {
  try { const p = JSON.parse(localStorage.getItem(PROFILE) ?? 'null') ?? dailyMe(); localStorage.setItem(PROFILE, JSON.stringify({ ...p, portrait: w })) } catch { /* не важно */ }
}

function WizardSheet({ w, onClose, onNav }: { w: number; onClose: () => void; onNav: (d: number) => void }) {
  const st = useStatsData()
  const [flash, setFlash] = useState(0)
  const [mine, setMineState] = useState(dailyMe().portrait)
  const a = ABILITIES[w], l = wizLvl(st, w), cost = nextCost(st, w), r = rarityOf(w)
  const sig = emoteById(`w${w}`)
  const up = () => {
    let ok = false
    updateStats(x => { ok = upgrade(x, w) })
    if (ok) { sfx.fanfare(); setFlash(f => f + 1) }
  }
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className={`sheet wiz-detail r-${r}`} onClick={e => e.stopPropagation()}>
        <div className="wd-head">
          <button className="btn" data-swipe="prev" onClick={() => onNav(-1)}>←</button>
          <div><b>{wizardName(w)}</b><small className={`rar r-${r}`}>{RARITY_NAME[r]}</small></div>
          <button className="btn" data-swipe="next" onClick={() => onNav(1)}>→</button>
        </div>
        <div className={`wd-art${l ? '' : ' locked'}`}>
          <img src={cardUrl('wizards', w)} alt="" />
          {flash > 0 && <div key={flash} className="lvl-up-burst"><span>УРОВЕНЬ {l}!</span></div>}
        </div>
        <div className="wd-ab"><b>{a.icon} «{a.name}»{l > 0 && ` · ур. ${l}`}</b><p>{a.text(Math.max(1, l))}</p>
          {l > 0 && l < MAX_LVL && <p className="wd-next">На ур. {l + 1}: {a.text(l + 1)}</p>}
        </div>
        <div className="wd-levels">{Array.from({ length: MAX_LVL }, (_, k) => <i key={k} className={k < l ? 'on' : ''}>{k + 1}</i>)}</div>
        {sig && <div className={`wd-sig${l >= 5 ? ' gold' : l >= 3 ? '' : ' locked'}`}>
          <img src={emoteImg(sig.id)} alt="" />
          <span><b>Фирменная эмоция</b><small>{l >= 5 ? 'Золотая — только у тебя!' : l >= 3 ? 'Открыта · на ур. 5 станет золотой' : 'Откроется на ур. 3, на ур. 5 — золотая'}</small></span>
        </div>}
        {!l && <p className="hint center">Колдун ещё не найден — ищи его карты в сундуках.</p>}
        {cost && <>
          <Bar have={wizCards(st, w)} need={cost.cards} />
          <button className={`btn wide gold${canUpgrade(st, w) ? ' hot' : ''}`} disabled={!canUpgrade(st, w)} onClick={up}>
            ⬆ Улучшить до ур. {l + 1} · 🪙 {cost.gold}
          </button>
          {(st.gold ?? 0) < cost.gold && <small className="hint center">Не хватает {cost.gold - (st.gold ?? 0)} 🪙</small>}
        </>}
        {l > 0 && <button className="btn wide ghost" disabled={mine === w} onClick={() => { setMine(w); setMineState(w) }}>{mine === w ? '✓ Мой колдун' : 'Играть этим колдуном'}</button>}
      </div>
    </div>
  )
}
