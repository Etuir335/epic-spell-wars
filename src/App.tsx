import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { GameState } from './game/types'
import { assetUrl } from './assets'
import { ZoomProvider } from './ui/cards'
import Game from './ui/Game'
import Gallery from './ui/Gallery'
import Profile from './ui/Profile'
import Arenas, { ARENA_KEY } from './ui/Arenas'
import DailyScreen, { DAILY_KEY, finishDaily } from './ui/Daily'
import { dailyOf } from './daily'
import Setup from './ui/Setup'
import Tutorial from './ui/Tutorial'
import { clearLocal, loadLocal, newLocalGame, useLocalGame } from './ui/store'
import { tgStartRoom, useTelegramBack } from './telegram'

const NetPlay = lazy(() => import('./ui/NetPlay')) // Firebase — отдельным куском, только для сетевой игры

type Screen = 'menu' | 'setup' | 'game' | 'gallery' | 'net' | 'profile' | 'daily' | 'dailyGame' | 'arenas' | 'arenaGame'
const startRoom = tgStartRoom() // открыли по приглашению из Telegram

export default function App() {
  const [screen, setScreen] = useState<Screen>(startRoom ? 'net' : 'menu')
  useTelegramBack(screen === 'menu' ? null : () => setScreen('menu'))
  const [game, setGame] = useState<GameState | null>(() => loadLocal())
  const [gen, setGen] = useState(0) // новая партия — новый store
  const [tut, setTut] = useState(false)
  const [daily, setDaily] = useState<GameState | null>(null)
  const [arena, setArena] = useState<GameState | null>(null)
  const [dailyLast, setDailyLast] = useState<{ score: number; win: boolean } | null>(null)

  return (
    <ZoomProvider>
      {screen === 'menu' && (
        <div className="screen menu" style={{ ['--bg-img' as string]: `url(${assetUrl('assets/ui/menu-bg.webp')})` }}>
          <div className="menu-head">
            <h1>Эпичные схватки<br />боевых магов</h1>
            <p className="hint">Битва на горе Черепламени</p>
          </div>
          <div className="menu-space" />
          {game && game.phase !== 'tournament' && <button className="btn gold wide" onClick={() => setScreen('game')}>Продолжить турнир</button>}
          <button className="btn wide" onClick={() => setScreen('setup')}>Новый турнир</button>
          <button className="btn wide" onClick={() => setScreen('net')}>Игра по сети</button>
          <button className="btn wide gold" onClick={() => setScreen('arenas')}>⚔️ Арены</button>
          <button className="btn wide fire" onClick={() => setScreen('daily')}>🔥 Испытание дня</button>
          <button className="btn wide ghost" onClick={() => setScreen('profile')}>🏆 Профиль и достижения</button>
          <button className="btn wide ghost" onClick={() => setScreen('gallery')}>Галерея карт</button>
          <button className="btn wide ghost" onClick={() => setTut(true)}>📖 Как играть</button>
        </div>
      )}
      {screen === 'setup' && (
        <Setup onBack={() => setScreen('menu')} onStart={(players, medals) => {
          clearLocal()
          setGame(newLocalGame(players, medals))
          setGen(g => g + 1)
          setScreen('game')
        }} />
      )}
      {screen === 'game' && game && <LocalGame key={gen} initial={game} onExit={s => { setGame(s); setScreen('menu') }} />}
      {tut && <Tutorial onClose={() => setTut(false)} />}
      {screen === 'daily' && <DailyScreen last={dailyLast} onBack={() => setScreen('menu')} onPlay={s => { setDaily(s); setDailyLast(null); setGen(g => g + 1); setScreen('dailyGame') }} />}
      {screen === 'dailyGame' && daily && <LocalGame key={gen} initial={daily} storeKey={DAILY_KEY}
        onFinish={s => setDailyLast(finishDaily(s, dailyOf()))} onExit={() => setScreen('daily')} />}
      {screen === 'arenas' && <Arenas onBack={() => setScreen('menu')} onPlay={s => { setArena(s); setGen(g => g + 1); setScreen('arenaGame') }} />}
      {screen === 'arenaGame' && arena && <LocalGame key={gen} initial={arena} storeKey={ARENA_KEY} ranked onExit={() => setScreen('arenas')} />}
      {screen === 'profile' && <Profile onBack={() => setScreen('menu')} />}
      {screen === 'gallery' && <Gallery onBack={() => setScreen('menu')} />}
      {screen === 'net' && <Suspense fallback={<div className="screen"><p className="hint">Загрузка…</p></div>}><NetPlay onBack={() => setScreen('menu')} startCode={startRoom} /></Suspense>}
    </ZoomProvider>
  )
}

function LocalGame({ initial, onExit, storeKey, onFinish, ranked }: { initial: GameState; onExit: (s: GameState) => void; storeKey?: string; onFinish?: (s: GameState) => void; ranked?: boolean }) {
  const store = useLocalGame(initial, storeKey)
  const done = useRef(initial.phase === 'tournament')
  useEffect(() => { if (store.state.phase === 'tournament' && !done.current) { done.current = true; onFinish?.(store.state) } }, [store.state]) // eslint-disable-line react-hooks/exhaustive-deps
  return <Game store={store} ranked={ranked} onExit={() => onExit(store.state)} />
}
