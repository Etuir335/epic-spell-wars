// Комната в Firestore: esw/<код>.
//   esw/<код>                 — комната: хост, статус, медалей до победы, боты, состояние партии (JSON) и его версия
//   esw/<код>/members/<uid>   — участники: имя и портрет (каждый пишет только себя)
//   esw/<код>/actions/<id>    — очередь действий игроков; хост применяет их через движок и удаляет
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore'
import { create } from '../game/engine.ts'
import type { Action, GameState } from '../game/types.ts'
import { getDb } from './firebase.ts'

export const ROOMS = 'esw'

export interface Member { uid: string; name: string; portrait: number; joinedAt: number }
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
}
export interface QueuedAction { id: string; uid: string; action: Action; clientAt: number; error?: string }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

const roomRef = (code: string) => doc(getDb(), ROOMS, code)
const memberRef = (code: string, uid: string) => doc(getDb(), ROOMS, code, 'members', uid)
const actionsCol = (code: string) => collection(getDb(), ROOMS, code, 'actions')

export const parseState = (room: Room | null): GameState | null => (room?.state ? (JSON.parse(room.state) as GameState) : null)

export async function createRoom(uid: string, name: string, portrait: number): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = newCode()
    if ((await getDoc(roomRef(code))).exists()) continue
    const room: Room = { code, host: uid, status: 'lobby', medalsToWin: 2, bots: [], state: null, v: 0, createdAt: Date.now() }
    await setDoc(roomRef(code), room)
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
  if (!existing.exists()) await setDoc(memberRef(code, uid), { uid, name, portrait, joinedAt: Date.now() } satisfies Member)
}

export const updateMember = (code: string, uid: string, patch: Partial<Member>) => updateDoc(memberRef(code, uid), patch)
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
  await updateRoom(room.code, { status: 'game', state: JSON.stringify(state), v: 1 })
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
