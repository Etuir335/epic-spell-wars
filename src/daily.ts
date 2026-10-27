// Испытание дня: у всех одна раздача, 1–2 безумных правила, иногда босс. Очки — за победу, скорость и жизни.
import type { BossKind, GameState, Mod, SetupPlayer } from './game/types.ts'

export const MOD_INFO: Record<Mod, { icon: string; name: string; text: string }> = {
  wild: { icon: '🌀', name: 'Шальной вторник', text: 'Каждая карта в заклинании — шальная: превращается в случайную того же типа.' },
  reverse: { icon: '🙃', name: 'Гравитация сломалась', text: 'Очерёдность наоборот: первыми бьют заклинания из трёх карт.' },
  blood: { icon: '🩸', name: 'Кровавая луна', text: 'У всех по 7 ❤, а за каждое убийство +5 ❤.' },
  swap: { icon: '🔄', name: 'Обмен телами', text: 'Перед каждым раундом все отдают руку соседу слева.' },
  dice: { icon: '🌕', name: 'Кубики сошли с ума', text: 'Могучий бросок кидается дважды: в полнолуние (нечётные раунды) берётся лучший, в новолуние — худший.' },
  zombie: { icon: '🧟', name: 'Зомби-апокалипсис', text: 'Погибшие встают зомби и в начале каждого раунда кусают живого на 1–3.' },
  greedy: { icon: '💰', name: 'Жадный дед', text: 'Каждый раунд — сокровище всем. Но больше трёх сокровищ кусаются: −1 ❤ за каждое лишнее.' },
  fever: { icon: '🥵', name: 'Колдовская лихорадка', text: 'На заклинание и ответ — 12 секунд. Не успел — ход пропущен.' },
  mirror: { icon: '🪞', name: 'Отражающий щит', text: 'Каждый третий удар отлетает в того, кто бил.' },
}
export const BOSS_INFO: Record<BossKind, { icon: string; name: string; text: string; portrait: number }> = {
  grandpa: { icon: '👴', name: 'Дед Черепламень', text: '50 ❤. В начале каждого раунда орёт и бьёт тебя на 2.', portrait: 7 },
  slime: { icon: '🟢', name: 'Король Слизней', text: '40 ❤. От удара 4+ отпочковывает слизняка; каждый слизняк плюётся в тебя на 1 каждый раунд.', portrait: 23 },
  mirror: { icon: '🪞', name: 'Зеркальный ты', text: '30 ❤. Повторяет твоё прошлое заклинание.', portrait: -1 },
}
const MODS = Object.keys(MOD_INFO) as Mod[]
const BOSSES = Object.keys(BOSS_INFO) as BossKind[]

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function hash(str: string) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Daily { key: string; seed: number; mods: Mod[]; boss: BossKind | null }
export function dailyOf(key = todayKey()): Daily {
  const seed = hash('esw-daily-' + key)
  let r = seed
  const rnd = (n: number) => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return (r >>> 8) % n }
  const boss = rnd(2) === 0 ? BOSSES[rnd(BOSSES.length)] : null
  const pool = [...MODS]
  const mods: Mod[] = []
  for (let i = 0; i < (boss ? 1 : 2); i++) mods.push(pool.splice(rnd(pool.length), 1)[0])
  return { key, seed: seed | 0, mods, boss }
}

const RIVALS = ['Ведьма Гниль', 'Колдун Хрыч', 'Некромант Пупс']
export function dailySetup(d: Daily, me: { name: string; portrait: number }): SetupPlayer[] {
  if (d.boss) {
    const b = BOSS_INFO[d.boss]
    return [{ ...me }, { name: d.boss === 'mirror' ? `Зеркальный ${me.name}` : b.name, portrait: b.portrait < 0 ? me.portrait : b.portrait, bot: 3, boss: d.boss }]
  }
  return [{ ...me }, ...RIVALS.map((name, i) => ({ name, portrait: (d.seed >>> (i * 5)) % 41, bot: 2 }))]
}

// Очки: победа 1000 + жизни×20 + быстрота; поражение — за убитых и продержанные раунды.
export function dailyScore(s: GameState): { score: number; win: boolean } {
  const me = s.players[0]
  const win = s.lastWinner === 0
  const kills = s.players.filter(p => p.id !== 0 && !p.alive).length
  const score = win
    ? 1000 + me.life * 20 + Math.max(0, 25 - s.round) * 15 + kills * 50
    : kills * 50 + s.round * 10
  return { score, win }
}
