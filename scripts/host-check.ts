// Проверка перехвата хоста на живом Firebase: пока у хоста есть пульс — нельзя, пульса нет 40 с — можно, и только хоста.
// Запуск: node --env-file=.env.local scripts/host-check.ts
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { Timestamp, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
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

const A = await client('host'), B = await client('guest'), C = await client('stranger')
const code = 'H' + Math.random().toString(36).slice(2, 6).toUpperCase()
const room = (db: typeof A.db) => doc(db, ROOMS, code)
await setDoc(room(A.db), { code, host: A.uid, status: 'game', medalsToWin: 2, bots: [], state: null, v: 3, createdAt: Date.now(), beat: serverTimestamp() })
await setDoc(doc(A.db, ROOMS, code, 'members', A.uid), { uid: A.uid, name: 'Хост', portrait: 1, joinedAt: 1 })
await setDoc(doc(B.db, ROOMS, code, 'members', B.uid), { uid: B.uid, name: 'Гость', portrait: 2, joinedAt: 2 })

ok(await denied(updateDoc(room(B.db), { host: B.uid, beat: serverTimestamp() })), 'хост жив — гость НЕ забирает хоста')
await updateDoc(room(A.db), { beat: Timestamp.fromMillis(Date.now() - 60_000) }) // пульс минуту назад
ok(await denied(updateDoc(room(C.db), { host: C.uid, beat: serverTimestamp() })), 'не участник НЕ забирает хоста')
ok(await denied(updateDoc(room(B.db), { host: B.uid, beat: serverTimestamp(), v: 99 })), 'при перехвате нельзя менять что-то ещё')
ok(await denied(updateDoc(room(B.db), { host: A.uid, beat: serverTimestamp() })), 'нельзя назначить хостом другого')
await updateDoc(room(B.db), { host: B.uid, beat: serverTimestamp() })
ok((await getDoc(room(B.db))).data()!.host === B.uid, 'хост пропал — гость забрал хоста')
ok(await denied(updateDoc(room(A.db), { v: 4 })), 'старый хост больше не пишет в комнату')
ok(await denied(updateDoc(room(A.db), { host: A.uid, beat: serverTimestamp() })), 'старый хост не отбирает назад, пока новый жив')

await deleteDoc(doc(A.db, ROOMS, code, 'members', A.uid))
await deleteDoc(doc(B.db, ROOMS, code, 'members', B.uid))
await deleteDoc(room(B.db))
console.log(failed ? `\nОШИБОК: ${failed}` : '\nВсё OK')
process.exit(failed ? 1 : 0)
