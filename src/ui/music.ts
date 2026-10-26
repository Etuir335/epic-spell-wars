// Фоновая музыка: плейлист из public/assets/music/playlist.json ([{ file, title }]).
// Нет плейлиста — кнопки музыки нет. Включено/выключено, громкость и номер песни запоминаются.
import { useEffect, useState } from 'react'
import { assetUrl } from '../assets'

export interface Track { file: string; title: string }
interface MusicState { tracks: Track[]; index: number; on: boolean; volume: number; playing: boolean }

const KEY = 'esw-music'
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<MusicState> } catch { return {} } })()
let st: MusicState = { tracks: [], index: saved.index ?? 0, on: saved.on ?? true, volume: saved.volume ?? 0.4, playing: false }
const subs = new Set<() => void>()
const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify({ index: st.index, on: st.on, volume: st.volume })) } catch { /* не важно */ }
  subs.forEach(f => f())
}
const set = (p: Partial<MusicState>) => { st = { ...st, ...p }; emit() }

let audio: HTMLAudioElement | null = null
let wanted = false // экран боя открыт — музыка нужна
function el(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    audio.addEventListener('ended', () => music.next())
    audio.addEventListener('play', () => set({ playing: true }))
    audio.addEventListener('pause', () => set({ playing: false }))
  }
  return audio
}
function load() {
  const t = st.tracks[st.index % Math.max(1, st.tracks.length)]
  if (!t) return
  const a = el()
  const src = assetUrl('assets/music/' + t.file)
  if (!a.src.endsWith(encodeURI('assets/music/' + t.file))) a.src = src
  a.volume = st.volume
}
function sync() {
  if (!st.tracks.length) return
  const a = el()
  if (wanted && st.on) { load(); a.play().catch(() => { /* браузер ждёт касания — запустим на первом нажатии */ }) }
  else a.pause()
}

let loaded = false
async function loadPlaylist() {
  if (loaded) return
  loaded = true
  try {
    const r = await fetch(assetUrl('assets/music/playlist.json'))
    if (!r.ok) return
    const tracks = (await r.json()) as Track[]
    set({ tracks, index: st.index % Math.max(1, tracks.length) })
    sync()
  } catch { /* плейлиста нет */ }
}
// браузеры запускают звук только после касания
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { if (wanted && st.on && !st.playing) sync() })

export const music = {
  toggle() { set({ on: !st.on }); sync() },
  next() { if (st.tracks.length) { set({ index: (st.index + 1) % st.tracks.length }); load(); sync() } },
  prev() { if (st.tracks.length) { set({ index: (st.index - 1 + st.tracks.length) % st.tracks.length }); load(); sync() } },
  volume(v: number) { set({ volume: v }); if (audio) audio.volume = v },
}

// Подключить музыку к экрану (играет, пока экран открыт).
export function useMusic(active = true) {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force(x => x + 1)
    subs.add(f)
    return () => { subs.delete(f) }
  }, [])
  useEffect(() => {
    if (!active) return
    wanted = true
    void loadPlaylist().then(sync)
    sync()
    return () => { wanted = false; sync() }
  }, [active])
  return { ...st, track: st.tracks[st.index] ?? null }
}
