// История матчей: журнал партии с фильтрами (игра, раунд, игроки, карта/слово) и жалобы на спорные моменты —
// на раунд, на карту или на отмеченные строки. Жалоба уходит в базу (reports) вместе с куском журнала.
import { useEffect, useMemo, useState } from 'react'
import { matchById, matches, type Entry, type Match } from '../history'
import { cardName } from '../game/core'
import type { Report } from '../net/reports'

const reports = () => import('../net/reports') // Firebase — отдельным куском
const when = (t: number) => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

type Target = { kind: Report['kind']; g: number; r: number; card?: number; idx?: number[] }

export default function MatchLog({ onBack, id: id0, ver }: { onBack: () => void; id?: string; ver?: number }) {
  const [id, setId] = useState(id0 ?? null)
  const [admin, setAdmin] = useState(false)
  const [showReports, setShowReports] = useState(false)
  useEffect(() => { void reports().then(r => r.reportsReady() ? r.reportsAdmin() : false).then(setAdmin).catch(() => {}) }, [])
  const m = id ? matchById(id) : undefined
  if (showReports) return <ReportsAdmin onBack={() => setShowReports(false)} />
  if (m) return <MatchView m={m} ver={ver} onBack={id0 ? onBack : () => setId(null)} />
  const list = matches()
  return (
    <div className="screen match-log">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>История матчей</h2></div>
      {!list.length && <p className="hint center">Пока пусто — сыграй партию, и её журнал появится здесь.</p>}
      {list.map(x => (
        <button key={x.id} className="ml-match" onClick={() => setId(x.id)}>
          <b>{x.mode} · {when(x.at)}</b>
          <span>{x.names.map((n, i) => (i === x.me ? `★ ${n}` : n)).join(', ')}</span>
          <small>игр: {Math.max(1, ...x.entries.map(e => e.g))} · строк журнала: {x.entries.length}</small>
        </button>
      ))}
      {admin && <button className="btn wide" onClick={() => setShowReports(true)}>🛠 Жалобы и пожелания (админ)</button>}
    </div>
  )
}

function MatchView({ m, onBack }: { m: Match; ver?: number; onBack: () => void }) {
  const [g, setG] = useState(0), [r, setR] = useState(0)
  const [who, setWho] = useState<number[]>([])
  const [q, setQ] = useState('')
  const [marks, setMarks] = useState<number[]>([])
  const [more, setMore] = useState(1)
  const [target, setTarget] = useState<Target | null>(null)
  const E = m.entries
  const games = [...new Set(E.map(e => e.g))].filter(x => x > 0)
  const rounds = [...new Set(E.filter(e => !g || e.g === g).map(e => e.r))].filter(x => x > 0)
  const ql = q.trim().toLowerCase()
  const rows = useMemo(() => {
    const out: number[] = []
    E.forEach((e, i) => {
      if (g && e.g !== g) return
      if (r && e.r !== r) return
      if (who.length && !who.includes(e.a) && !who.some(p => e.t.includes(m.names[p]))) return
      if (ql && !e.t.toLowerCase().includes(ql)) return
      out.push(i)
    })
    return out.reverse() // свежее сверху
  }, [E, E.length, g, r, who, ql, m.names]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = rows.slice(0, 300 * more)
  const toggle = (i: number) => setMarks(x => x.includes(i) ? x.filter(y => y !== i) : [...x, i])
  let last = ''
  return (
    <div className="screen match-log">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Журнал · {m.mode}</h2></div>
      <div className="ml-filters">
        <select value={g} onChange={e => { setG(Number(e.target.value)); setR(0) }}>
          <option value={0}>Все игры</option>
          {games.map(x => <option key={x} value={x}>Игра {x}</option>)}
        </select>
        <select value={r} onChange={e => setR(Number(e.target.value))}>
          <option value={0}>Все раунды</option>
          {rounds.map(x => <option key={x} value={x}>Раунд {x}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 карта или слово" />
      </div>
      <div className="ml-who">
        {m.names.map((n, p) => (
          <button key={p} className={`chip${who.includes(p) ? ' on' : ''}`} onClick={() => setWho(w => w.includes(p) ? w.filter(x => x !== p) : [...w, p])}>{m.bots[p] ? '🤖 ' : ''}{n}</button>
        ))}
      </div>
      <p className="hint center">Нажми строку, чтобы отметить её для жалобы. ⚠ у раунда — пожаловаться на весь раунд, на карту — нажми её название.</p>
      <div className="ml-lines">
        {!shown.length && <p className="hint center">Ничего не найдено</p>}
        {shown.map(i => {
          const e: Entry = E[i]
          const key = `${e.g}:${e.r}`
          const head = key !== last; last = key
          return (
            <div key={i}>
              {head && (
                <div className="ml-head">
                  <span>Игра {e.g || '—'} · {e.r ? `Раунд ${e.r}` : 'подготовка'}</span>
                  <button onClick={() => setTarget({ kind: 'round', g: e.g, r: e.r })}>⚠ Жалоба</button>
                </div>
              )}
              <div className={`ml-line${marks.includes(i) ? ' on' : ''}${e.c ? ' reveal' : ''}${e.a === m.me ? ' mine' : ''}`} onClick={() => toggle(i)}>
                {e.c ? <>
                  <b>{m.names[e.a] ?? '?'}</b> открывает:{' '}
                  {e.c.map((c, k) => <button key={k} className="ml-card" onClick={ev => { ev.stopPropagation(); setTarget({ kind: 'card', g: e.g, r: e.r, card: c }) }}>{cardName(c)}</button>)}
                </> : e.t}
              </div>
            </div>
          )
        })}
        {rows.length > shown.length && <button className="btn wide" onClick={() => setMore(x => x + 1)}>Показать ещё</button>}
      </div>
      {marks.length > 0 && !target && (
        <div className="ml-bar">
          <span>Отмечено: {marks.length}</span>
          <button className="btn" onClick={() => setMarks([])}>Снять</button>
          <button className="btn gold" onClick={() => { const s = [...marks].sort((a, b) => a - b); setTarget({ kind: 'lines', g: E[s[0]].g, r: E[s[0]].r, idx: s }) }}>⚠ Пожаловаться</button>
        </div>
      )}
      {target && <Complaint m={m} t={target} onClose={ok => { setTarget(null); if (ok) setMarks([]) }} />}
    </div>
  )
}

const KIND_TITLE = { round: 'Жалоба на раунд', card: 'Жалоба на карту', lines: 'Жалоба на ход', wish: '💡 Пожелание' }

// Пожелания к игре из главного меню: уходят туда же, где жалобы (читают админы)
export function Wish({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'' | 'send' | 'ok' | 'err' | 'off'>('')
  const send = async () => {
    setState('send')
    try {
      const r = await reports()
      if (!r.reportsReady()) { setState('off'); return }
      await r.sendReport({ kind: 'wish', tid: 0, game: 0, round: 0, text: text.trim(), lines: [], players: [], mode: 'пожелание', ver: `${location.host} ${navigator.userAgent.slice(0, 90)}` })
      setState('ok'); setTimeout(onClose, 1200)
    } catch { setState('err') }
  }
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet ml-complaint" onClick={e => e.stopPropagation()}>
        <h3>💡 Пожелания для игры</h3>
        <p className="hint">Что добавить или поменять? Новые карты, режимы, удобство, баланс — пиши как есть.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={5} placeholder="Например: хочу режим 2 на 2 с другом против ботов" autoFocus />
        {state === 'ok' ? <p className="ml-ok">✅ Отправлено, спасибо!</p>
          : state === 'err' ? <p className="ml-err">Не получилось отправить — нет связи? Попробуй ещё раз.</p>
          : state === 'off' ? <p className="ml-err">Отправка в этой сборке не настроена.</p> : null}
        <div className="row">
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn gold" disabled={!text.trim() || state === 'send' || state === 'ok'} onClick={() => void send()}>{state === 'send' ? 'Отправляю…' : 'Отправить'}</button>
        </div>
      </div>
    </div>
  )
}

function Complaint({ m, t, onClose }: { m: Match; t: Target; onClose: (sent: boolean) => void }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'' | 'send' | 'ok' | 'err' | 'off'>('')
  const line = (e: Entry) => `[И${e.g} Р${e.r}${e.a >= 0 ? ` ход: ${m.names[e.a]}` : ''}] ${e.t}`
  const lines = t.idx ? t.idx.map(i => line(m.entries[i])) : m.entries.filter(e => e.g === t.g && e.r === t.r).map(line)
  const send = async () => {
    setState('send')
    try {
      const r = await reports()
      if (!r.reportsReady()) { setState('off'); return }
      await r.sendReport({
        kind: t.kind, tid: m.tid, game: t.g, round: t.r, text: text.trim(), lines, players: m.names, mode: m.mode,
        ...(t.card != null ? { card: t.card, cardName: cardName(t.card) } : {}),
        ver: `${location.host} ${navigator.userAgent.slice(0, 90)}`,
      })
      setState('ok'); setTimeout(() => onClose(true), 1200)
    } catch { setState('err') }
  }
  return (
    <div className="sheet-back" onClick={() => onClose(false)}>
      <div className="sheet ml-complaint" onClick={e => e.stopPropagation()}>
        <h3>⚠ {KIND_TITLE[t.kind]}</h3>
        <p className="hint">Игра {t.g} · Раунд {t.r}{t.card != null ? <> · карта <b>{cardName(t.card)}</b></> : null}</p>
        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={4} placeholder="Что не так? Например: карта нанесла 2 урона, а по тексту должна была 3" autoFocus />
        <details><summary>Что уйдёт вместе с жалобой ({lines.length} строк журнала)</summary><div className="ml-preview">{lines.slice(-60).map((l, i) => <div key={i}>{l}</div>)}</div></details>
        {state === 'ok' ? <p className="ml-ok">✅ Отправлено, спасибо! Разберёмся.</p>
          : state === 'err' ? <p className="ml-err">Не получилось отправить — нет связи? Попробуй ещё раз.</p>
          : state === 'off' ? <p className="ml-err">Отправка жалоб в этой сборке не настроена.</p> : null}
        <div className="row">
          <button className="btn" onClick={() => onClose(false)}>Отмена</button>
          <button className="btn gold" disabled={!text.trim() || state === 'send' || state === 'ok'} onClick={() => void send()}>{state === 'send' ? 'Отправляю…' : 'Отправить'}</button>
        </div>
      </div>
    </div>
  )
}

function ReportsAdmin({ onBack }: { onBack: () => void }) {
  const [list, setList] = useState<Report[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { void reports().then(r => r.listReports(100)).then(setList).catch(() => setErr(true)) }, [])
  const del = async (id: string) => { await (await reports()).deleteReport(id); setList(l => l?.filter(x => x.id !== id) ?? null) }
  return (
    <div className="screen match-log">
      <div className="top-bar"><button onClick={onBack}>←</button><h2>Жалобы и пожелания</h2><span className="gold-chip">{list?.length ?? '…'}</span></div>
      {err && <p className="ml-err">Не удалось загрузить (нет прав или связи).</p>}
      {list?.map(x => (
        <div key={x.id} className="ml-report">
          <div className="ml-report-head" onClick={() => setOpen(o => o === x.id ? null : x.id!)}>
            <b>{KIND_TITLE[x.kind]}{x.cardName ? ` ${x.cardName}` : ''}</b>
            <small>{when(x.at)} · {x.mode}{x.kind !== 'wish' ? ` · игра ${x.game}, раунд ${x.round}` : ''}</small>
            <span>{x.text}</span>
          </div>
          {open === x.id && <>
            <div className="ml-preview">{x.lines.map((l, i) => <div key={i}>{l}</div>)}</div>
            <small className="hint">Игроки: {x.players.join(', ')} · турнир {x.tid} · {x.ver}</small>
            <button className="btn" onClick={() => void del(x.id!)}>🗑 Разобрано — удалить</button>
          </>}
        </div>
      ))}
    </div>
  )
}
