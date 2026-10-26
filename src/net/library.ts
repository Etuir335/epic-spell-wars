// Общая библиотека музыки в Firestore (загружает админ; играет у всех).
//   music/<id>              — песня: название, размер, тип, число кусков (появляется, когда все куски записаны)
//   music/<id>/chunks/<i>   — кусок файла (до ~900 КБ, Bytes)
//   admins/<uid>            — админ: создаётся, только если в документе верный код (проверяет firestore.rules)
import {
  Bytes, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, type Unsubscribe,
} from 'firebase/firestore'
import { ensureUser, getDb, netConfigured } from './firebase'

export interface LibSong { id: string; title: string; size: number; type: string; chunks: number; addedAt: number }
const CHUNK = 900_000

export const libraryReady = netConfigured
export const ready = () => ensureUser()

export function watchLibrary(cb: (songs: LibSong[]) => void): Unsubscribe {
  return onSnapshot(query(collection(getDb(), 'music'), orderBy('addedAt')), s => cb(s.docs.map(d => d.data() as LibSong)))
}

// Скачать песню целиком (куски по порядку).
export async function downloadSong(s: LibSong): Promise<Blob> {
  await ensureUser()
  const parts: Uint8Array[] = []
  for (let i = 0; i < s.chunks; i++) {
    const c = await getDoc(doc(getDb(), 'music', s.id, 'chunks', String(i)))
    parts.push((c.data()!.data as Bytes).toUint8Array())
  }
  return new Blob(parts as BlobPart[], { type: s.type || 'audio/mpeg' })
}

// ---------- админ ----------
export async function isAdmin(): Promise<boolean> {
  const u = await ensureUser()
  return (await getDoc(doc(getDb(), 'admins', u.uid))).exists()
}
// Стать админом: база примет запись, только если код верный.
export async function claimAdmin(code: string): Promise<boolean> {
  const u = await ensureUser()
  if (await isAdmin()) return true // это устройство уже админ (менять запись правила не дают)
  try { await setDoc(doc(getDb(), 'admins', u.uid), { code, at: Date.now() }); return true } catch { return false }
}

const titleOf = (name: string) => name.replace(/\.[^.]+$/, '').replace(/^[0-9a-f]{8}-/, '').replace(/_/g, ' ').replace(/\s+-\s+/g, ' — ').trim()

export async function uploadSong(file: File, onProgress: (part: number, total: number) => void): Promise<void> {
  await ensureUser()
  const buf = new Uint8Array(await file.arrayBuffer())
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const total = Math.ceil(buf.length / CHUNK)
  for (let i = 0; i < total; i++) {
    await setDoc(doc(getDb(), 'music', id, 'chunks', String(i)), { data: Bytes.fromUint8Array(buf.subarray(i * CHUNK, (i + 1) * CHUNK)) })
    onProgress(i + 1, total)
  }
  // песня появляется у всех, только когда все куски на месте
  const song: LibSong = { id, title: titleOf(file.name), size: buf.length, type: file.type || 'audio/mpeg', chunks: total, addedAt: Date.now() }
  await setDoc(doc(getDb(), 'music', id), song)
}

export async function deleteSong(id: string) {
  await deleteDoc(doc(getDb(), 'music', id)) // сначала убрать из списка
  const cs = await getDocs(collection(getDb(), 'music', id, 'chunks'))
  for (const c of cs.docs) await deleteDoc(c.ref)
}
