// Таблица рекордов испытания дня: daily/<дата>/scores/<uid> — лучший результат игрока за день.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import { ensureUser, getDb } from './firebase.ts'

export interface ScoreRow { uid: string; name: string; portrait: number; score: number; win: boolean; at: number }

export async function submitScore(day: string, e: Omit<ScoreRow, 'uid' | 'at'>) {
  const u = await ensureUser()
  const ref = doc(getDb(), 'daily', day, 'scores', u.uid)
  const old = await getDoc(ref)
  if (old.exists() && (old.data() as ScoreRow).score >= e.score) return
  await setDoc(ref, { ...e, uid: u.uid, at: Date.now() })
}

export async function topScores(day: string, n = 20): Promise<{ rows: ScoreRow[]; me: string }> {
  const u = await ensureUser()
  const snap = await getDocs(query(collection(getDb(), 'daily', day, 'scores'), orderBy('score', 'desc'), limit(n)))
  return { rows: snap.docs.map(d => d.data() as ScoreRow), me: u.uid }
}
