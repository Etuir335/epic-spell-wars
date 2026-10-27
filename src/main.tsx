import './legacy'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initTelegram } from './telegram'

try { initTelegram() } catch { /* старый клиент Telegram — играем без его API */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
;(window as { __eswStarted?: () => void }).__eswStarted?.() // для диагностики в index.html: игра запустилась
