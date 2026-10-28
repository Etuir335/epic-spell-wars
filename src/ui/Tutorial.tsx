// Краткое обучение: несколько слайдов. Само показывается один раз перед первой партией, потом — из меню «Как играть».
import { useState, type ReactNode } from 'react'
import { music, useMusic } from './music'

const KEY = 'esw-tutorial-seen'
export function tutorialSeen() { try { return localStorage.getItem(KEY) === '1' } catch { return true } }
function markSeen() { try { localStorage.setItem(KEY, '1') } catch { /* не важно */ } }

const Slot = ({ k, l }: { k: string; l: string }) => <span className={`slot-letter ${k} tut-letter`}>{l}</span>

const SLIDES: { icon: string; title: string; body: ReactNode }[] = [
  {
    icon: '🧙', title: 'Ты — боевой маг',
    body: <>
      <p>У каждого колдуна <b>20 ❤</b>. Схватка идёт, пока не останется один живой — он получает <b>медаль 🏅</b>.</p>
      <p>Набрал нужное число медалей — победил в турнире.</p>
    </>,
  },
  {
    icon: '✋', title: 'Собери заклинание',
    body: <>
      <p>В руке 8 карт. Каждый раунд собери из них заклинание — от 1 до 3 карт, по одной каждого типа:</p>
      <ul className="tut-slots">
        <li><Slot k="source" l="З" /> <b>Заводила</b> — начало</li>
        <li><Slot k="quality" l="Н" /> <b>Наворот</b> — середина</li>
        <li><Slot k="delivery" l="П" /> <b>Приход</b> — финал</li>
      </ul>
      <p>Перетащи карту в ячейку (или нажми на неё → «В заклинание») и жми <b>⚡ Колдовать!</b></p>
    </>,
  },
  {
    icon: '⚡', title: 'Кто бьёт первым',
    body: <>
      <p>Все собирают заклинания тайно, а срабатывают они по очереди:</p>
      <p><b>меньше карт — раньше ход.</b> При равенстве первым идёт тот, у кого больше <b>инициатива</b> — число на Приходе.</p>
      <p>Быстрое заклинание из одной карты может добить врага до того, как он ударит.</p>
    </>,
  },
  {
    icon: '🎲', title: 'Знаки и могучий бросок',
    body: <>
      <p>У каждой карты есть <b>знак</b> школы магии (значок рядом с названием).</p>
      <p>Если карта велит сделать <b>могучий бросок</b> — бросаешь по кубику за каждую карту заклинания с её знаком. Карты одного знака бьют сильнее!</p>
    </>,
  },
  {
    icon: '💀', title: 'Погиб — не беда',
    body: <>
      <p>Погибший колдун ждёт конца схватки и получает карту <b>Дохлого колдуна</b> — бонус в начале следующей.</p>
      <p><b>Сокровища</b> дают постоянные плюсы. Нажми на любую карту, чтобы прочитать её текст.</p>
      <p>В игре по сети на ход есть время: не успел трижды — за тебя сыграет бот.</p>
    </>,
  },
]

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const close = () => { markSeen(); onClose() }
  const last = i === SLIDES.length - 1
  const sl = SLIDES[i]
  const mus = useMusic(false) // только следим, музыку не включаем
  return (
    <div className="sheet-back tut-back">
      <div className="tut" key={i}>
        {mus.tracks.length > 0 && <button className={`tut-music${mus.on ? '' : ' off'}`} onClick={() => music.toggle()} title="Музыка">{mus.on ? '🎵' : '🔇'}</button>}
        <div className="tut-icon">{sl.icon}</div>
        <h3>{sl.title}</h3>
        <div className="tut-body">{sl.body}</div>
        <div className="tut-dots">{SLIDES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Шаг ${k + 1}`} />)}</div>
        <div className="tut-nav">
          {i > 0 ? <button className="btn" onClick={() => setI(i - 1)}>←</button> : <button className="btn ghost" onClick={close}>Пропустить</button>}
          <button className="btn gold" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'В бой!' : 'Дальше →'}</button>
        </div>
      </div>
    </div>
  )
}
