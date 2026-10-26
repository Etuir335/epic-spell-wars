// Проверка музыкальной библиотеки на живом Firebase: код админа, загрузка кусками, чтение и запреты.
// Запуск: ADMIN_CODE=<код> node --env-file=.env.local scripts/library-check.ts
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { Bytes, deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

const config = { apiKey: process.env.VITE_FB_API_KEY!, authDomain: process.env.VITE_FB_AUTH_DOMAIN!, projectId: process.env.VITE_FB_PROJECT_ID!, appId: process.env.VITE_FB_APP_ID! }
const CODE = process.env.ADMIN_CODE ?? ''
let failed = 0
const ok = (c: unknown, name: string) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${name}`); if (!c) failed++ }
const denied = async (p: Promise<unknown>) => p.then(() => false, (e: { code?: string }) => e.code === 'permission-denied')
async function client(name: string) {
  const app = initializeApp(config, name)
  return { db: getFirestore(app), uid: (await signInAnonymously(getAuth(app))).user.uid }
}
const A = await client('admin'), B = await client('player')
ok(await denied(setDoc(doc(A.db, 'admins', A.uid), { code: 'WRONG1', at: Date.now() })), 'неверный код не пускает')
ok(await denied(setDoc(doc(B.db, 'music', 'x'), { title: 'взлом' })), 'не-админ не может загружать')
await setDoc(doc(A.db, 'admins', A.uid), { code: CODE, at: Date.now() })
ok(true, 'верный код — админ')
const id = 'test' + Date.now().toString(36)
const data = new Uint8Array(1_200_000).map((_, i) => i % 251)
await setDoc(doc(A.db, 'music', id, 'chunks', '0'), { data: Bytes.fromUint8Array(data.subarray(0, 900_000)) })
await setDoc(doc(A.db, 'music', id, 'chunks', '1'), { data: Bytes.fromUint8Array(data.subarray(900_000)) })
await setDoc(doc(A.db, 'music', id), { id, title: 'Проба', size: data.length, type: 'audio/mpeg', chunks: 2, addedAt: Date.now() })
ok(true, 'админ загрузил песню двумя кусками')
const c1 = (await getDoc(doc(B.db, 'music', id, 'chunks', '1'))).data()!.data as Bytes
ok(c1.toUint8Array().length === 300_000 && c1.toUint8Array()[5] === data[900_005], 'игрок скачал кусок без искажений')
ok(await denied(deleteDoc(doc(B.db, 'music', id))), 'игрок не может удалить песню')
await deleteDoc(doc(A.db, 'music', id))
await deleteDoc(doc(A.db, 'music', id, 'chunks', '0')); await deleteDoc(doc(A.db, 'music', id, 'chunks', '1'))
ok(!(await getDoc(doc(B.db, 'music', id))).exists(), 'админ удалил песню')
console.log(failed ? `\nОШИБОК: ${failed}` : '\nБиблиотека работает')
process.exit(failed ? 1 : 0)
