import { lazy, Suspense, useState } from 'react'
import type { GameState } from './game/types'
import { assetUrl } from './assets'
import { ZoomProvider } from './ui/cards'
import Game from './ui/Game'
import Gallery from './ui/Gallery'
import Profile from './ui/Profile'
import Setup from './ui/Setup'
import Tutorial from './ui/Tutorial'
import { clearLocal, loadLocal, newLocalGame, useLocalGame } from './ui/store'
import { tgStartRoom, useTelegramBack } from './telegram'

const NetPlay = lazy(() => import('./ui/NetPlay')) // Firebase — отдельным куском, только для сетевой игры

type Screen = 'menu' | 'setup' | 'game' | 'gallery' | 'net' | 'profile'
const startRoom = tgStartRoom() // открыли по приглашению из Telegram

export default function App() {
  const [screen, setScreen] = useState<Screen>(startRoom ? 'net' : 'menu')
  useTelegramBack(screen === 'menu' ? null : () => setScreen('menu'))
  const [game, setGame] = useState<GameState | null>(() => loadLocal())
  const [gen, setGen] = useState(0) // новая партия — новый store
  const [tut, setTut] = useState(false)

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
      {screen === 'profile' && <Profile onBack={() => setScreen('menu')} />}
      {screen === 'gallery' && <Gallery onBack={() => setScreen('menu')} />}
      {screen === 'net' && <Suspense fallback={<div className="screen"><p className="hint">Загрузка…</p></div>}><NetPlay onBack={() => setScreen('menu')} startCode={startRoom} /></Suspense>}
    </ZoomProvider>
  )
}

function LocalGame({ initial, onExit }: { initial: GameState; onExit: (s: GameState) => void }) {
  const store = useLocalGame(initial)
  return <Game store={store} onExit={() => onExit(store.state)} />
}
