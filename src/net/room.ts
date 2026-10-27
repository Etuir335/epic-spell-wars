// Комната в Firestore: esw/<код>.
//   esw/<код>                 — комната: хост, статус, медалей до победы, боты, состояние партии (JSON) и его версия
//   esw/<код>/members/<uid>   — участники: имя и портрет (каждый пишет только себя)
//   esw/<код>/actions/<id>    — очередь действий игроков; хост применяет их через движок и удаляет
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  type Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import { create } from '../game/engine.ts'
import type { Action, GameState } from '../game/types.ts'
import { getDb } from './firebase.ts'

export const ROOMS = 'esw'

export interface Member { uid: string; name: string; portrait: number; joinedAt: number; beat?: Timestamp | null }
export interface BotSeat { id: string; name: string; portrait: number; level: number }
export interface Room {
  code: string
  host: string
  status: 'lobby' | 'game'
  medalsToWin: number
  bots: BotSeat[]
  state: string | null // JSON GameState
  v: number
  createdAt: number
  // подбор игроков
  public?: boolean // открытая комната: видна в списке и в быстрой игре
  quick?: boolean // создана быстрой игрой: старт сам (4 колдуна — сразу, 2+ — через отсчёт)
  open?: boolean // сейчас принимает игроков (открытая, лобби, есть места) — поддерживает хост
  count?: number // людей в комнате (пишет хост)
  hostName?: string
  seenAt?: number // «пульс» хоста — живые комнаты в списке
  startAt?: number | null // автостарт быстрой игры
  // таймер хода (ставит хост): кого ждём (ключ ожидания) и до какого времени
  turnKey?: string | null
  turnEnd?: number | null
  beat?: Timestamp | null // пульс хоста по часам сервера (раз в 10 с): пропал — хоста забирает другой участник
}
export const BEAT_MS = 10_000
export const HOST_LOST_MS = 40_000 // столько же в firestore.rules
export const MAX_SEATS = 6
export const ALIVE_MS = 70_000 // комната без пульса хоста дольше — считается брошенной
export interface QueuedAction { id: string; uid: string; action: Action; clientAt: number; error?: string }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

const roomRef = (code: string) => doc(getDb(), ROOMS, code)
const memberRef = (code: string, uid: string) => doc(getDb(), ROOMS, code, 'members', uid)
const actionsCol = (code: string) => collection(getDb(), ROOMS, code, 'actions')

export const parseState = (room: Room | null): GameState | null => (room?.state ? (JSON.parse(room.state) as GameState) : null)

export async function createRoom(uid: string, name: string, portrait: number, opts: { public?: boolean; quick?: boolean } = {}): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = newCode()
    if ((await getDoc(roomRef(code))).exists()) continue
    const pub = !!opts.public || !!opts.quick
    const room: Room = {
      code, host: uid, status: 'lobby', medalsToWin: opts.quick ? 1 : 2, bots: [], state: null, v: 0, createdAt: Date.now(),
      public: pub, quick: !!opts.quick, open: pub, count: 1, hostName: name, seenAt: Date.now(), startAt: null,
    }
    await setDoc(roomRef(code), { ...room, beat: serverTimestamp() })
    await setDoc(memberRef(code, uid), { uid, name, portrait, joinedAt: Date.now() } satisfies Member)
    return code
  }
  throw new Error('Не удалось придумать свободный код комнаты, попробуйте ещё раз')
}

export async function joinRoom(code: string, uid: string, name: string, portrait: number) {
  const snap = await getDoc(roomRef(code))
  if (!snap.exists()) throw new Error(`Комнаты ${code} нет`)
  const room = snap.data() as Room
  const existing = await getDoc(memberRef(code, uid))
  if (room.status === 'game' && !existing.exists()) throw new Error('Турнир уже идёт — новых участников не принимаем')
  if (!existing.exists() && (room.count ?? 0) + room.bots.length >= MAX_SEATS) throw new Error('В комнате уже 6 колдунов')
  if (!existing.exists()) await setDoc(memberRef(code, uid), { uid, name, portrait, joinedAt: Date.now() } satisfies Member)
}

export const updateMember = (code: string, uid: string, patch: Partial<Member>) => updateDoc(memberRef(code, uid), patch)
// Пульс: участник — «я тут»; хост — ещё и в комнате.
export const beatMember = (code: string, uid: string) => updateDoc(memberRef(code, uid), { beat: serverTimestamp() })
export const beatRoom = (code: string) => updateDoc(roomRef(code), { beat: serverTimestamp() })
// Забрать хоста себе (база разрешит, только если пульса хоста нет дольше HOST_LOST_MS).
export const takeHost = (code: string, uid: string) => updateDoc(roomRef(code), { host: uid, beat: serverTimestamp() })
export const leaveRoom = (code: string, uid: string) => deleteDoc(memberRef(code, uid))
export const updateRoom = (code: string, patch: Partial<Room>) => updateDoc(roomRef(code), patch)

export function watchRoom(code: string, cb: (room: Room | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), s => cb(s.exists() ? (s.data() as Room) : null))
}
export function watchMembers(code: string, cb: (members: Member[]) => void): Unsubscribe {
  return onSnapshot(collection(getDb(), ROOMS, code, 'members'), s =>
    cb(s.docs.map(d => d.data() as Member).sort((a, b) => a.joinedAt - b.joinedAt)))
}

// Хост: игроки за столом — люди по порядку входа, затем боты; начать турнир.
export async function startGame(room: Room, members: Member[]) {
  const players = [
    ...members.map(m => ({ uid: m.uid, name: m.name, portrait: m.portrait })),
    ...room.bots.map(b => ({ name: b.name, portrait: b.portrait, bot: b.level })),
  ]
  const state = create(players, Math.floor(Math.random() * 2 ** 31), room.medalsToWin)
  await updateRoom(room.code, { status: 'game', state: JSON.stringify(state), v: 1, open: false, startAt: null })
}

export const writeState = (code: string, state: GameState, v: number) => updateRoom(code, { state: JSON.stringify(state), v })

export async function sendAction(code: string, uid: string, action: Action) {
  const ref = await addDoc(actionsCol(code), { uid, action: JSON.stringify(action), clientAt: Date.now() })
  return ref.id
}
export function watchActions(code: string, cb: (list: QueuedAction[]) => void): Unsubscribe {
  return onSnapshot(query(actionsCol(code), orderBy('clientAt')), s =>
    cb(s.docs.map(d => {
      const x = d.data() as { uid: string; action: string; clientAt: number; error?: string }
      return { id: d.id, uid: x.uid, action: JSON.parse(x.action) as Action, clientAt: x.clientAt, error: x.error }
    })))
}
export const rejectAction = (code: string, id: string, error: string) => updateDoc(doc(actionsCol(code), id), { error })
export const removeAction = (code: string, id: string) => deleteDoc(doc(actionsCol(code), id))

// Открытые комнаты, которые ждут игроков (живые — с недавним пульсом хоста), самые полные — первыми.
export async function listOpenRooms(): Promise<Room[]> {
  const s = await getDocs(query(collection(getDb(), ROOMS), where('open', '==', true), limit(60)))
  const now = Date.now()
  return s.docs.map(d => d.data() as Room)
    .filter(r => r.status === 'lobby' && now - (r.seenAt ?? 0) < ALIVE_MS && (r.count ?? 0) + r.bots.length < MAX_SEATS)
    .sort((a, b) => (b.count ?? 0) + b.bots.length - ((a.count ?? 0) + a.bots.length) || (b.seenAt ?? 0) - (a.seenAt ?? 0))
}

// Быстрая игра: войти в самую заполненную открытую комнату быстрой игры (или любую открытую), иначе создать новую.
export async function quickMatch(uid: string, name: string, portrait: number): Promise<string> {
  const rooms = await listOpenRooms()
  const pick = rooms.find(r => r.quick && r.host !== uid) ?? rooms.find(r => r.host !== uid)
  if (pick) {
    try { await joinRoom(pick.code, uid, name, portrait); return pick.code } catch { /* заняли последнее место — создадим свою */ }
  }
  return createRoom(uid, name, portrait, { quick: true })
}
