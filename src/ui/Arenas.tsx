// Экран арен: кубки, лестница арен, бой на арене, вступление при открытии новой арены.
import { useEffect, useState } from 'react'
import { ARENAS, arenaFight } from '../arenas'
import { create } from '../game/engine'
import type { GameState } from '../game/types'
import { dailyMe } from './Daily'
import { ARENA_WIZ, CHESTS, ROAD, claimRoad, roadReady, roadTaken, wizLvl, type RoadPrize } from '../progression'
import { emoteById } from '../emotes'
import { Portrait } from './cards'
import { wizardName } from '../wizards'
import { sfx, uiSfx } from './sound'
import { emoteImg } from './Emotes'
import { assetUrl, cardUrl } from '../assets'
import { saveLocal } from './store'
import Tutorial from './Tutorial'
import { updateStats, useStatsData } from './useStats'

export const ARENA_KEY = 'esw-arena-game'
// три предупреждения, чтобы не открыть все арены случайно
const SKIP_ASK = [
  'Открыть все арены сразу? Нажми ещё раз',
  'Точно уверен? Кубки за это не дают, а новые правила свалятся все разом',
  'Последнее слово: открыть все арены? Обратно не закрыть',
]

// медалей до победы на арене — запоминаем выбор
const MEDALS_KEY = 'esw-arena-medals'
const savedMedals = () => { try { return Math.min(3, Math.max(1, Number(localStorage.getItem(MEDALS_KEY)) || 1)) } catch { return 1 } }

export default function Arenas({ onPlay, onBack, onNet }: { onPlay: (s: GameState) => void; onBack: () => void; onNet: () => void }) {
  const [medals, setMedals] = useState(savedMedals)
  const pickMedals = (n: number) => { setMedals(n); try { localStorage.setItem(MEDALS_KEY, String(n)) } catch { /* не важно */ } }
  const st = useStatsData()
  const cups = st.cups ?? 0, cur = st.arena ?? 0
  const open = (i: number) => ARENAS[i].ready && (!!st.arenaSkip || i <= cur)
  // новая открытая арена со вступлением, которое ещё не показывали
  const unseen = ARENAS.findIndex((a, i) => i > (st.arenaSeen ?? 0) && open(i) && a.intro.length)
  const [intro, setIntro] = useState<number | null>(unseen > 0 ? unseen : null)
  const [sure, setSure] = useState(0)
  const next = ARENAS[cur + 1]
  const pct = next ? Math.min(100, Math.round(((cups - ARENAS[cur].cups) / (next.cups - ARENAS[cur].cups)) * 100)) : 100

  // лестница снизу вверх — сразу к своей арене
  useEffect(() => { (document.querySelector('.road-prize.ready') ?? document.querySelector('.arena-card.cur'))?.scrollIntoView({ block: 'center' }) }, [])

  const fight = (i: number) => {
    if (i > (st.arenaSeen ?? 0) && ARENAS[i].intro.length) { setIntro(i); return }
    const me = dailyMe(), l = wizLvl(st, me.portrait)
    const f = arenaFight(i, l ? { ...me, lvl: l } : me, st.streak ?? 0)
    const s = create(f.setup, (Math.random() * 2 ** 31) | 0, medals, f.mods, f.sets)
    saveLocal(s, ARENA_KEY)
    onPlay(s)
  }
  // награды дороги: забираются нажатием — вспышка, всплывающая надпись и звук
  const [taken, setTaken] = useState<{ cups: number; text: string } | null>(null)
  const [full, setFull] = useState(false)
  // колдун крупно: нажатие на портрет (и сразу после получения с дороги)
  const [look, setLook] = useState<number | null>(null)
  const ready = roadReady(st)
  const claim = (r: RoadPrize) => {
    let ok = false
    updateStats(x => { ok = claimRoad(x, r) })
    if (!ok) { setFull(true); sfx.hit(); setTimeout(() => setFull(false), 1800); return }
    if (r.t === 'gold') sfx.coin(); else if (r.t === 'chest') uiSfx.chestOpen(); else if (r.t === 'wiz') { sfx.fanfare(); setTimeout(() => setLook(r.w), 700) } else uiSfx.reveal()
    setTaken({ cups: r.cups, text: prizeText(r) })
    setTimeout(() => setTaken(x => (x?.cups === r.cups ? null : x)), 1400)
  }
  const toReady = () => document.querySelector('.road-prize.ready')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const seen = (i: number) => updateStats(x => { x.arenaSeen = Math.max(x.arenaSeen ?? 0, i) })

  return (
    <div className="screen arenas">
      {/* закреплённая шапка: назад, кубки, медали, награды */}
      <div className="arenas-head">
        <div className="top-bar"><button onClick={onBack}>←</button><h2>Арены</h2><span className="cups-mini"><span className="trophy">🏆</span>{cups}</span></div>
        <div className="cups-track">
          <span>{ARENAS[cur].icon}</span>
          <div className="xp-bar"><i style={{ width: `${pct}%` }} /></div>
          <span>{next ? next.icon : '👑'}</span>
        </div>
        <small className="cups-next">{next ? `До арены «${next.name}» — ${Math.max(0, next.cups - cups)} 🏆` : 'Все арены пройдены!'}</small>
        <div className="arena-opts">
          <span>Медалей:</span>
          <div className="seg">{[1, 2, 3].map(n => <button key={n} className={medals === n ? 'on' : ''} onClick={() => pickMedals(n)}>{n}</button>)}</div>
          {ready.length > 0 && <button className="road-claim-all" onClick={toReady}>🎁 Награды: {ready.length}</button>}
        </div>
        {full && <div className="road-full">Нет места для сундука — открой один в «Сундуках»</div>}
      </div>
      <p className="hint center">{medals === 1 ? 'Одна схватка — быстро.' : `Турнир до ${medals} медалей: схваток больше — и кубков за него больше (кубки за каждую схватку).`}</p>
      <div className="arena-road">
        {ARENAS.map((a, i) => ({ a, i })).reverse().map(({ a, i }) => (
          <div key={i} className="road-step">
            <div className={`arena-card${i === cur ? ' cur' : ''}${open(i) ? '' : ' locked'}${a.ready ? '' : ' soon'}`}
              style={{ ['--s1' as string]: a.sky[0], ['--s2' as string]: a.sky[1], ['--s3' as string]: a.sky[2] }}>
              <div className="arena-scene">
                <img className="arena-art" src={assetUrl(`assets/arenas/${i}.webp`)} alt="" loading="lazy" />
                <span className="arena-badge">{a.icon}</span>
                {i === cur && <span className="arena-you">Ты здесь</span>}
                {!open(i) && <span className="arena-lock">{a.ready ? '🔒' : 'Скоро'}</span>}
              </div>
              <div className="arena-ribbon"><small>Арена {i + 1}</small><b>{a.name}</b></div>
              <em>{a.text}</em>
              {ARENA_WIZ[i] && <div className="arena-wiz"><small>Колдуны арены:</small>{ARENA_WIZ[i].map(w => <span key={w} className={wizLvl(st, w) ? 'got' : ''} title={wizardName(w)} onClick={() => setLook(w)}><Portrait i={w} size={34} /></span>)}</div>}
              {open(i) && <button className={`btn gold arena-go${i === cur ? ' hot' : ''}`} onClick={() => fight(i)}>⚔️ В бой</button>}
            </div>
            {i > 0 && <div className="road-mark">
              <span className={cups >= a.cups ? 'got' : ''}>🏆 {a.cups}</span>
              {ROAD.filter(r => r.cups < a.cups && r.cups >= ARENAS[i - 1].cups).reverse().map(r => {
                const got = roadTaken(st, r), can = !got && cups >= r.cups
                return <div key={r.cups} className={`road-prize t-${r.t}${got ? ' got' : can ? ' ready' : ''}`}>
                  <button className="rp-pic" disabled={!can && r.t !== 'wiz'} data-nosfx onClick={() => (can ? claim(r) : r.t === 'wiz' && setLook(r.w))}><PrizePic r={r} />{!got && !can && <i>🔒</i>}{got && <b className="rp-check">✓</b>}</button>
                  <small>{can ? 'Забрать!' : got ? prizeText(r) : `🏆 ${r.cups}`}</small>
                  {taken?.cups === r.cups && <span className="rp-fly">{taken.text}</span>}
                </div>
              })}
            </div>}
          </div>
        ))}
      </div>
      <button className="btn wide net-fight" onClick={onNet}>🌐 Бой с живыми людьми</button>
      <p className="hint center">На аренах ты бьёшься с ботами. С живыми людьми — во вкладке «По сети» (быстрая игра или комната с друзьями): там кубки тоже идут, и плюсы ×1,5.</p>
      <p className="hint center">За каждую схватку: победа +40 🏆, поражение −5, по месту в бою на многих. Против живых ×1,5, первая победа за день +50. За победу — сундук 🎁 с картами колдунов и золотом, за испытание дня — серебряный сундук. Ниже порога своей арены кубки не падают.</p>
      {!st.arenaSkip && ARENAS.some((a, i) => a.ready && i > cur) && (
        <button className={`skip-all${sure ? ' warn' : ''}`} onClick={() => {
          if (sure < SKIP_ASK.length) { setSure(sure + 1); return }
          updateStats(x => { x.arenaSkip = true }); setSure(0)
        }}>{sure ? SKIP_ASK[sure - 1] : 'я уже играл в настолку…'}</button>
      )}
      {sure > 0 && <button className="skip-all" onClick={() => setSure(0)}>Нет, буду проходить по порядку</button>}
      {look != null && (
        <div className="zoom wiz-look" onClick={() => setLook(null)}>
          <img src={cardUrl('wizards', look)} alt="" />
          <b>{wizardName(look)}</b>
          <small>{wizLvl(st, look) ? `Есть · ур. ${wizLvl(st, look)}` : 'Ещё не открыт'}</small>
        </div>
      )}
      {intro != null && (
        <Tutorial slides={ARENAS[intro].intro} done="Понятно!" onClose={() => { seen(intro); setIntro(null) }} />
      )}
    </div>
  )
}

const prizeText = (r: RoadPrize) => r.t === 'gold' ? `+${r.n} 🪙` : r.t === 'chest' ? `${CHESTS[r.kind].name} сундук` : r.t === 'wiz' ? wizardName(r.w) : emoteById(r.id)?.name ?? ''
function PrizePic({ r }: { r: RoadPrize }) {
  if (r.t === 'emote') return <img src={emoteImg(r.id)} alt="" loading="lazy" />
  if (r.t === 'wiz') return <Portrait i={r.w} size={54} />
  if (r.t === 'chest') return <span className="rp-emoji">{CHESTS[r.kind].icon}</span>
  return <span className="rp-emoji">🪙<em>{r.n}</em></span>
}
