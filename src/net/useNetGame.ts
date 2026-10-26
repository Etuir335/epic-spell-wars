// Сетевая партия: тот же интерфейс GameStore, что и у локальной.
// Хост применяет действия движком и пишет состояние; остальные проверяют действие у себя и отправляют в очередь.
import { useCallback, useEffect, useRef, useState } from 'react'
import { tryReduce } from '../game/engine.ts'
import type { Action, GameState } from '../game/types.ts'
import {
  parseState, rejectAction, removeAction, sendAction, watchActions, watchMembers, watchRoom, writeState,
  type Member, type QueuedAction, type Room,
} from './room.ts'

export interface NetGame {
  state: GameState | null
  dispatch: (a: Action) => string | null
  room: Room | null | undefined // undefined — загружается, null — комнаты нет
  members: Member[]
  isHost: boolean
  uid: string
  remoteError: string
  clearRemoteError: () => void
}

// Может ли участник действовать за это место: своё место (пока за него не играет бот); хост — ещё и за ботов;
// «следующая игра» и пропуск хода по таймеру — хост; отдать место боту или вернуть себе — сам игрок (или хост).
export function canAct(s: GameState, uid: string, isHost: boolean, a: Action) {
  if (a.type === 'nextGame' || a.type === 'skip') return isHost
  const p = s.players[a.player]
  if (!p) return false
  if (a.type === 'seat') return p.uid === uid || isHost
  return p.bot ? isHost : p.uid === uid
}

export function useNetGame(code: string, uid: string): NetGame {
  const [room, setRoom] = useState<Room | null | undefined>(undefined)
  const [members, setMembers] = useState<Member[]>([])
  const [state, setState] = useState<GameState | null>(null)
  const [remoteError, setRemoteError] = useState('')
  const stateRef = useRef<{ s: GameState | null; v: number }>({ s: null, v: 0 })
  const isHost = !!room && room.host === uid

  useEffect(() => {
    const offRoom = watchRoom(code, r => {
      setRoom(r)
      if (!r) return
      // старые снимки (меньшая версия) не затирают свежее состояние
      if (r.v >= stateRef.current.v) {
        const s = parseState(r)
        stateRef.current = { s, v: r.v }
        setState(s)
      }
    })
    const offMembers = watchMembers(code, setMembers)
    return () => { offRoom(); offMembers() }
  }, [code])

  // Хост: разбирает очередь действий по порядку
  const busy = useRef(false)
  const done = useRef(new Set<string>())
  const latest = useRef<QueuedAction[]>([])
  useEffect(() => {
    if (!isHost) return
    const drain = async () => {
      if (busy.current) return
      busy.current = true
      try {
        let q: QueuedAction | undefined
        while ((q = latest.current.find(x => !x.error && !done.current.has(x.id)))) {
          done.current.add(q.id)
          const cur = stateRef.current.s
          if (!cur || !canAct(cur, q.uid, false, q.action)) { await rejectAction(code, q.id, 'Это не ваш ход'); continue }
          const r = tryReduce(cur, q.action)
          if ('error' in r) { await rejectAction(code, q.id, r.error); continue }
          const v = stateRef.current.v + 1
          stateRef.current = { s: r.state, v }
          setState(r.state)
          await writeState(code, r.state, v)
          await removeAction(code, q.id)
        }
      } finally {
        busy.current = false
      }
    }
    return watchActions(code, list => { latest.current = list; void drain() })
  }, [code, isHost])

  // Не-хост: ловит отказы хоста на свои действия
  useEffect(() => {
    if (isHost) return
    return watchActions(code, list => {
      for (const q of list) if (q.uid === uid && q.error) {
        setRemoteError(q.error)
        removeAction(code, q.id).catch(() => {})
      }
    })
  }, [code, isHost, uid])

  const dispatch = useCallback((a: Action): string | null => {
    const cur = stateRef.current.s
    if (!cur) return 'Турнир ещё не начался'
    if (!canAct(cur, uid, isHost, a)) return a.type === 'nextGame' ? 'Следующую игру начинает хост' : cur.players[a.player]?.bot ? 'Сейчас за тебя играет бот' : 'Это не ваш ход'
    const r = tryReduce(cur, a)
    if ('error' in r) return r.error
    if (isHost) {
      const v = stateRef.current.v + 1
      stateRef.current = { s: r.state, v }
      setState(r.state)
      writeState(code, r.state, v).catch((e: Error) => setRemoteError(`Не удалось сохранить ход: ${e.message}`))
    } else {
      sendAction(code, uid, a).catch((e: Error) => setRemoteError(`Не удалось отправить ход: ${e.message}`))
    }
    return null
  }, [code, isHost, uid])

  return { state, dispatch, room, members, isHost, uid, remoteError, clearRemoteError: () => setRemoteError('') }
}
