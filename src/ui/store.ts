// Локальная партия (на одном телефоне): состояние в localStorage. Сетевой store (фаза 5) — с тем же интерфейсом.
import { useCallback, useState } from 'react'
import { create, tryReduce } from '../game/engine'
import type { Action, GameState, SetupPlayer, CardSet } from '../game/types'

export interface GameStore {
  state: GameState
  dispatch: (a: Action) => string | null // текст ошибки или null
}

const KEY = 'esw-local-game'

export function loadLocal(key = KEY): GameState | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch { return null }
}
export function clearLocal(key = KEY) {
  try { localStorage.removeItem(key) } catch { /* нет доступа — не страшно */ }
}
function save(s: GameState, key = KEY) {
  try { localStorage.setItem(key, JSON.stringify(s)) } catch { /* переполнение — играем без сохранения */ }
}

export const saveLocal = save

export function newLocalGame(players: SetupPlayer[], medalsToWin: number, sets?: CardSet[]): GameState {
  const s = create(players, (Math.random() * 2 ** 31) | 0, medalsToWin, undefined, sets)
  save(s)
  return s
}

export function useLocalGame(initial: GameState, key = KEY): GameStore {
  const [state, setState] = useState(initial)
  const dispatch = useCallback((a: Action) => {
    let err: string | null = null
    setState(cur => {
      const r = tryReduce(cur, a)
      if ('error' in r) { err = r.error; return cur }
      save(r.state, key)
      return r.state
    })
    return err
  }, [])
  return { state, dispatch }
}
