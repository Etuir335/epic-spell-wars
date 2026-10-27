// Расчёт хода бота в отдельном потоке (не тормозит анимации).
import './polyfills.ts'
import { think } from './mcts.ts'
import type { GameState } from '../game/types.ts'

self.onmessage = (e: MessageEvent<{ id: number; s: GameState; me: number; level: number }>) => {
  const { id, s, me, level } = e.data
  let action = null
  try { action = think(s, me, level) } catch (err) { console.error(err) }
  ;(self as unknown as Worker).postMessage({ id, action })
}
