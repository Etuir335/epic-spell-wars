// Фоновая музыка: песни с сайта (public/assets/music/playlist.json, если есть) + свои песни игрока с его устройства
// (хранятся только у него — IndexedDB, на сайт не выкладываются). Включено/выключено, громкость и номер песни запоминаются.
import { useEffect, useState } from 'react'
import { assetUrl } from '../assets'

export interface Track { title: string; file?: string; url?: string; local?: string; lib?: string }
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

// ---------- свои песни: IndexedDB ----------
const DB = 'esw-music', STORE = 'tracks', LIB = 'lib' // tracks — свои песни; lib — скачанные песни общей библиотеки
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2)
    r.onupgradeneeded = () => {
      for (const n of [STORE, LIB]) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: 'id' })
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>, store = STORE): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => {
    const q = f(d.transaction(store, mode).objectStore(store))
    q.onsuccess = () => res(q.result)
    q.onerror = () => rej(q.error)
  })
}
interface Stored { id: string; title: string; blob: Blob; added: number }
const niceTitle = (name: string) => name.replace(/\.[^.]+$/, '').replace(/^[0-9a-f]{8}-/, '').replace(/_/g, ' ').replace(/\s+-\s+/g, ' — ').trim()

// ---------- проигрыватель ----------
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
const srcOf = (t: Track) => t.url ?? assetUrl('assets/music/' + t.file)
function load() {
  const t = st.tracks[st.index % Math.max(1, st.tracks.length)]
  if (!t) return
  const a = el()
  const src = srcOf(t)
  if (a.dataset.src !== src) { a.src = src; a.dataset.src = src }
  a.volume = st.volume
}
function sync() {
  const a = audio ?? (st.tracks.length ? el() : null)
  if (!a) return
  if (wanted && st.on && st.tracks.length) { load(); a.play().catch(() => { /* браузер ждёт касания — запустим на первом нажатии */ }) }
  else a.pause()
}

let loaded: Promise<void> | null = null
function loadAll() {
  loaded ??= (async () => {
    let site: Track[] = []
    try {
      const r = await fetch(assetUrl('assets/music/playlist.json'))
      if (r.ok) site = (await r.json()) as Track[]
    } catch { /* песен на сайте нет */ }
    let mine: Track[] = []
    try {
      const all = await tx<Stored[]>('readonly', s => s.getAll() as IDBRequest<Stored[]>)
      mine = all.sort((a, b) => a.added - b.added).map(x => ({ title: x.title, url: URL.createObjectURL(x.blob), local: x.id }))
    } catch { /* нет IndexedDB */ }
    const tracks = [...site, ...mine]
    set({ tracks, index: st.index % Math.max(1, tracks.length) })
    void startLibrary()
  })()
  return loaded
}

// Заменить список песен, не сбивая играющую.
function setTracks(tracks: Track[]) {
  const cur = st.tracks[st.index]
  const i = cur ? tracks.findIndex(t => t.url === cur.url && t.file === cur.file) : -1
  set({ tracks, index: i >= 0 ? i : Math.min(st.index, Math.max(0, tracks.length - 1)) })
}

// Общая библиотека (Firestore): песни скачиваются один раз и хранятся на устройстве.
async function startLibrary() {
  let lib: typeof import('../net/library')
  try { lib = await import('../net/library'); if (!lib.libraryReady()) return; await lib.ready() } catch { return }
  let busy = false, latest: import('../net/library').LibSong[] = []
  const apply = async () => {
    if (busy) return
    busy = true
    try {
      const ids = new Set(latest.map(s => s.id))
      for (const t of st.tracks) if (t.lib && !ids.has(t.lib)) { if (t.url) URL.revokeObjectURL(t.url); void tx('readwrite', s => s.delete(t.lib!), LIB).catch(() => {}) }
      let tracks = st.tracks.filter(t => !t.lib || ids.has(t.lib))
      setTracks(tracks)
      for (const s of latest) {
        if (tracks.some(t => t.lib === s.id)) continue
        let blob: Blob | undefined
        try { blob = (await tx<{ blob: Blob } | undefined>('readonly', x => x.get(s.id) as IDBRequest<{ blob: Blob } | undefined>, LIB))?.blob } catch { /* нет кэша */ }
        if (!blob) {
          try { blob = await lib.downloadSong(s) } catch { continue }
          void tx('readwrite', x => x.put({ id: s.id, blob }), LIB).catch(() => {})
        }
        const order = latest.map(x => x.id)
        const libTracks = [...tracks.filter(t => t.lib), { title: s.title, url: URL.createObjectURL(blob), lib: s.id }]
          .sort((a, b) => order.indexOf(a.lib!) - order.indexOf(b.lib!))
        tracks = [...libTracks, ...tracks.filter(t => !t.lib)]
        setTracks(tracks)
        sync()
      }
    } finally { busy = false }
    if (latest.some(s => !st.tracks.some(t => t.lib === s.id))) void apply() // пришли новые, пока качали
  }
  lib.watchLibrary(songs => { latest = songs; void apply() })
}
// браузеры запускают звук только после касания
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { if (wanted && st.on && !st.playing) sync() })

export const music = {
  toggle() { set({ on: !st.on }); sync() },
  next() { if (st.tracks.length) { set({ index: (st.index + 1) % st.tracks.length }); load(); sync() } },
  prev() { if (st.tracks.length) { set({ index: (st.index - 1 + st.tracks.length) % st.tracks.length }); load(); sync() } },
  play(i: number) { if (st.tracks[i]) { set({ index: i, on: true }); load(); sync() } },
  volume(v: number) { set({ volume: v }); if (audio) audio.volume = v },
  // добавить песни с устройства (остаются только на этом устройстве)
  async add(files: FileList | File[]) {
    const list = [...files].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(f.name))
    const added: Track[] = []
    for (const f of list) {
      const x: Stored = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), title: niceTitle(f.name), blob: f, added: Date.now() }
      try { await tx('readwrite', s => s.put(x)) } catch { /* место кончилось — сыграем без сохранения */ }
      added.push({ title: x.title, url: URL.createObjectURL(f), local: x.id })
    }
    if (!added.length) return 0
    const first = st.tracks.length
    set({ tracks: [...st.tracks, ...added], on: true, index: first })
    load(); sync()
    return added.length
  },
  async remove(i: number) {
    const t = st.tracks[i]
    if (!t?.local) return
    try { await tx('readwrite', s => s.delete(t.local!)) } catch { /* уже нет */ }
    if (t.url) URL.revokeObjectURL(t.url)
    const tracks = st.tracks.filter((_, k) => k !== i)
    const playingThis = i === st.index
    set({ tracks, index: tracks.length ? Math.min(st.index - (i < st.index ? 1 : 0), tracks.length - 1) : 0 })
    if (playingThis) { if (audio) { audio.pause(); audio.dataset.src = '' } load(); sync() }
  },
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
    void loadAll().then(sync)
    return () => { wanted = false; sync() }
  }, [active])
  return { ...st, track: st.tracks[st.index] ?? null }
}
