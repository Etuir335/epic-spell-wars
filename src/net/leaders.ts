// Таблица лидеров: players/<uid> — витрина игрока (кубки, звание, уровни колдунов, достижения).
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import { ensureUser, getDb } from './firebase.ts'
import { ACHIEVEMENTS, xpOf, type Stats } from '../stats'
import { WIZ_COUNT, wizLvl } from '../progression'
import { dailyMe } from '../ui/Daily'

export interface PlayerRow {
  uid: string; name: string; portrait: number
  cups: number; arena: number; xp: number
  ach: string[] // полученные достижения
  wiz: number[] // уровень каждого колдуна (0 — нет)
  games: number; wins: number; at: number
}

export const rowOf = (st: Stats, me = dailyMe()): Omit<PlayerRow, 'uid' | 'at'> => ({
  name: me.name.slice(0, 16), portrait: me.portrait,
  cups: st.cups ?? 0, arena: st.arena ?? 0, xp: xpOf(st),
  ach: ACHIEVEMENTS.filter(a => st.ach[a.id]).map(a => a.id),
  wiz: Array.from({ length: WIZ_COUNT }, (_, w) => wizLvl(st, w)),
  games: st.games, wins: st.wins,
})

export async function publishProfile(row: Omit<PlayerRow, 'uid' | 'at'>) {
  const u = await ensureUser()
  await setDoc(doc(getDb(), 'players', u.uid), { ...row, uid: u.uid, at: Date.now() })
}

export async function topPlayers(n = 50): Promise<{ rows: PlayerRow[]; me: string }> {
  const u = await ensureUser()
  const snap = await getDocs(query(collection(getDb(), 'players'), orderBy('cups', 'desc'), limit(n)))
  return { rows: snap.docs.map(d => d.data() as PlayerRow), me: u.uid }
}
