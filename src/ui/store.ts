// Локальная партия (на одном телефоне): состояние в localStorage. Сетевой store (фаза 5) — с тем же интерфейсом.
import { useCallback, useState } from 'react'
import { create, tryReduce } from '../game/engine'
import type { Action, GameState, SetupPlayer } from '../game/types'

export interface GameStore {
  state: GameState
  dispatch: (a: Action) => string | null // текст ошибки или null
}

const KEY = 'esw-local-game'

export function loadLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch { return null }
}
export function clearLocal() {
  try { localStorage.removeItem(KEY) } catch { /* нет доступа — не страшно */ }
}
function save(s: GameState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* переполнение — играем без сохранения */ }
}

export function newLocalGame(players: SetupPlayer[], medalsToWin: number): GameState {
  const s = create(players, (Math.random() * 2 ** 31) | 0, medalsToWin)
  save(s)
  return s
}

export function useLocalGame(initial: GameState): GameStore {
  const [state, setState] = useState(initial)
  const dispatch = useCallback((a: Action) => {
    let err: string | null = null
    setState(cur => {
      const r = tryReduce(cur, a)
      if ('error' in r) { err = r.error; return cur }
      save(r.state)
      return r.state
    })
    return err
  }, [])
  return { state, dispatch }
}
