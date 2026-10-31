// Жалобы на спорные моменты: reports/<id> — кто, на что (раунд, карта, строки журнала), что не так и сам журнал.
// Отправить может любой вошедший (только от своего имени), читают и удаляют — админы.
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { ensureUser, getDb, netConfigured } from './firebase'
import { isAdmin } from './library'

export interface Report {
  id?: string; uid: string; at: number
  kind: 'round' | 'card' | 'lines'
  tid: number; game: number; round: number; card?: number; cardName?: string
  text: string; lines: string[]; players: string[]; mode: string; ver: string
}

export const reportsReady = netConfigured

export async function sendReport(r: Omit<Report, 'uid' | 'at' | 'id'>) {
  const u = await ensureUser()
  await addDoc(collection(getDb(), 'reports'), {
    ...r, uid: u.uid, at: Date.now(),
    text: r.text.slice(0, 1000), lines: r.lines.slice(-200).map(l => l.slice(0, 300)), players: r.players.slice(0, 8).map(p => p.slice(0, 30)),
  })
}

export const reportsAdmin = () => isAdmin().catch(() => false)

export async function listReports(n = 50): Promise<Report[]> {
  const snap = await getDocs(query(collection(getDb(), 'reports'), orderBy('at', 'desc'), limit(n)))
  return snap.docs.map(d => ({ ...(d.data() as Report), id: d.id }))
}
export const deleteReport = (id: string) => deleteDoc(doc(getDb(), 'reports', id))
