// Проверка подбора на живом Firebase: открытая комната видна в поиске, закрытая — нет, гость входит, хост ведёт счётчик.
// Запуск: node --env-file=.env.local scripts/match-check.ts
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, getFirestore, limit, query, setDoc, updateDoc, where } from 'firebase/firestore'

const ROOMS = 'esw' // как в src/net/room.ts
const config = { apiKey: process.env.VITE_FB_API_KEY!, authDomain: process.env.VITE_FB_AUTH_DOMAIN!, projectId: process.env.VITE_FB_PROJECT_ID!, appId: process.env.VITE_FB_APP_ID! }
let failed = 0
const ok = (c: unknown, name: string) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${name}`); if (!c) failed++ }
async function client(name: string) {
  const app = initializeApp(config, name)
  return { db: getFirestore(app), uid: (await signInAnonymously(getAuth(app))).user.uid }
}
const A = await client('host'), B = await client('guest')
const mk = (code: string, pub: boolean) => ({ code, host: A.uid, status: 'lobby', medalsToWin: 1, bots: [], state: null, v: 0, createdAt: Date.now(), public: pub, quick: pub, open: pub, count: 1, hostName: 'Хост', seenAt: Date.now(), startAt: null })
const open = 'Q' + Math.random().toString(36).slice(2, 6).toUpperCase(), closed = 'P' + Math.random().toString(36).slice(2, 6).toUpperCase()
await setDoc(doc(A.db, ROOMS, open), mk(open, true))
await setDoc(doc(A.db, ROOMS, closed), mk(closed, false))
const found = (await getDocs(query(collection(B.db, ROOMS), where('open', '==', true), limit(60)))).docs.map(d => d.id)
ok(found.includes(open), 'гость находит открытую комнату')
ok(!found.includes(closed), 'закрытая комната в поиске не видна')
await setDoc(doc(B.db, ROOMS, open, 'members', B.uid), { uid: B.uid, name: 'Гость', portrait: 3, joinedAt: Date.now() })
ok(true, 'гость вошёл в открытую комнату')
await updateDoc(doc(A.db, ROOMS, open), { count: 2, startAt: Date.now() + 30000, seenAt: Date.now() })
ok(true, 'хост обновил счётчик и запустил отсчёт')
const again = (await getDocs(query(collection(B.db, ROOMS), where('open', '==', true), limit(60)))).docs.find(d => d.id === open)?.data()
ok(again?.count === 2 && again?.startAt, 'гость видит счётчик и отсчёт')
await deleteDoc(doc(B.db, ROOMS, open, 'members', B.uid))
await deleteDoc(doc(A.db, ROOMS, open)); await deleteDoc(doc(A.db, ROOMS, closed))
console.log(failed ? `\nОШИБОК: ${failed}` : '\nПодбор работает')
process.exit(failed ? 1 : 0)
