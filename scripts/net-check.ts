// Проверка сети на живом Firebase: два анонимных игрока, комната, ход, правила доступа.
// Запуск: node --env-file=.env.local scripts/net-check.ts
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc } from 'firebase/firestore'
import { create, tryReduce } from '../src/game/engine.ts'
const ROOMS = 'esw' // как в src/net/room.ts

const config = {
  apiKey: process.env.VITE_FB_API_KEY!, authDomain: process.env.VITE_FB_AUTH_DOMAIN!,
  projectId: process.env.VITE_FB_PROJECT_ID!, appId: process.env.VITE_FB_APP_ID!,
}
let failed = 0
const ok = (c: unknown, name: string) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${name}`); if (!c) failed++ }
const denied = async (p: Promise<unknown>) => p.then(() => false, (e: { code?: string }) => e.code === 'permission-denied')
async function client(name: string) {
  const app = initializeApp(config, name)
  const user = (await signInAnonymously(getAuth(app))).user
  return { db: getFirestore(app), uid: user.uid }
}

const A = await client('host'), B = await client('guest')
ok(A.uid && B.uid && A.uid !== B.uid, 'два анонимных входа')
const code = 'T' + Math.random().toString(36).slice(2, 6).toUpperCase()
const room = (db = A.db) => doc(db, ROOMS, code)
await setDoc(room(), { code, host: A.uid, status: 'lobby', medalsToWin: 2, bots: [], state: null, v: 0, createdAt: Date.now() })
await setDoc(doc(A.db, ROOMS, code, 'members', A.uid), { uid: A.uid, name: 'Хост', portrait: 1, joinedAt: Date.now() })
ok((await getDoc(room(B.db))).exists(), 'гость видит комнату')
await setDoc(doc(B.db, ROOMS, code, 'members', B.uid), { uid: B.uid, name: 'Гость', portrait: 2, joinedAt: Date.now() })
ok(true, 'гость записал себя в участники')
ok(await denied(updateDoc(room(B.db), { medalsToWin: 3 })), 'гость НЕ может менять комнату')
ok(await denied(setDoc(doc(B.db, ROOMS, code, 'members', A.uid), { uid: A.uid, name: 'Взлом', portrait: 0, joinedAt: 0 })), 'гость НЕ может писать за другого')
ok(await denied(setDoc(doc(B.db, ROOMS, 'X' + code, 'x', 'y'), { a: 1 })), 'чужие коллекции закрыты')

// старт и ход гостя через очередь
let s = create([{ name: 'Хост', portrait: 1, uid: A.uid }, { name: 'Гость', portrait: 2, uid: B.uid }], 42, 2)
await updateDoc(room(), { status: 'game', state: JSON.stringify(s), v: 1 })
const g = JSON.parse((await getDoc(room(B.db))).data()!.state)
const card = g.players[1].hand.find((id: number) => Math.floor(id / 10) !== 0)
const t = Math.floor(card / 10)
const slot = t >= 0 ? (await import('../src/data/cards.ts')).SPELLS[t].type : 'source'
const act = { type: 'submit', player: 1, cards: [{ id: card, slot }] }
ok(await denied(addDoc(collection(B.db, ROOMS, code, 'actions'), { uid: A.uid, action: JSON.stringify(act), clientAt: Date.now() })), 'гость НЕ может слать действие от имени хоста')
await addDoc(collection(B.db, ROOMS, code, 'actions'), { uid: B.uid, action: JSON.stringify(act), clientAt: Date.now() })
const q = await getDocs(collection(A.db, ROOMS, code, 'actions'))
ok(q.size === 1, 'хост видит действие гостя')
const r = tryReduce(s, JSON.parse(q.docs[0].data().action))
ok('state' in r, 'движок принял ход гостя')
if ('state' in r) { s = r.state; await updateDoc(room(), { state: JSON.stringify(s), v: 2 }) }
await deleteDoc(q.docs[0].ref)
ok((await getDoc(room(B.db))).data()!.v === 2, 'гость видит новое состояние')
ok(JSON.stringify(s).length < 900_000, `размер состояния ${JSON.stringify(s).length} байт`)

// уборка
await deleteDoc(doc(B.db, ROOMS, code, 'members', B.uid))
await deleteDoc(doc(A.db, ROOMS, code, 'members', A.uid))
await deleteDoc(room())
console.log(failed ? `\nОШИБОК: ${failed}` : '\nСеть работает')
process.exit(failed ? 1 : 0)
