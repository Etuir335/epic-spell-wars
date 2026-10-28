// Арены как в Clash Royale: кубки ведут по лестнице, каждая арена добавляет новые правила (позже — по дополнению).
// Арену не теряешь: кубки не падают ниже её порога.
import { BOSS_INFO, MOD_INFO } from './daily.ts'
import type { BossKind, Mod, SetupPlayer } from './game/types.ts'
import { wizardName } from './wizards.ts'

export interface Arena { name: string; icon: string; cups: number; sky: [string, string, string]; text: string; ready: boolean; intro: { icon: string; title: string; body: string }[] }

export const ARENAS: Arena[] = [
  {
    name: 'Гора Черепламени', sky: ['#ff7a1a', '#7a1d0c', '#1e0907'], icon: '🌋', cups: 0, ready: true, text: 'Основная коробка: заводилы, навороты, приходы и могучие броски.',
    intro: [],
  },
  {
    name: 'Логово Деда', sky: ['#c9a35a', '#4b2c55', '#140a1c'], icon: '👴', cups: 100, ready: true, text: 'Бои с боссами: у них много жизней и свои подлые трюки.',
    intro: [
      { icon: '👴', title: 'Боссы', body: 'На этой арене ты дерёшься один на один с боссом. У босса 30–50 жизней и особое свойство.' },
      ...(Object.keys(BOSS_INFO) as BossKind[]).map(k => ({ icon: BOSS_INFO[k].icon, title: BOSS_INFO[k].name, body: BOSS_INFO[k].text })),
    ],
  },
  {
    name: 'Безумная гора', sky: ['#b14dff', '#2c1a7a', '#0a0a24'], icon: '🌀', cups: 250, ready: true, text: 'Безумные правила: каждый бой — два случайных.',
    intro: [
      { icon: '🌀', title: 'Безумные правила', body: 'В каждом бою действуют два случайных правила — они меняют всю игру. Плашки правил видны сверху, нажми — покажут подсказку.' },
      ...(Object.keys(MOD_INFO) as Mod[]).map(k => ({ icon: MOD_INFO[k].icon, title: MOD_INFO[k].name, body: MOD_INFO[k].text })),
    ],
  },
  { name: 'Грибучее Болото', sky: ['#8fe04a', '#245a2a', '#07160b'], icon: '🍄', cups: 450, ready: false, text: 'Дополнение «Мессиво на грибучем болоте» — скоро.', intro: [] },
  { name: 'Замок Спрутобойни', sky: ['#3fd0e0', '#163e6e', '#060f22'], icon: '🐙', cups: 700, ready: false, text: 'Дополнение с Тварями и Кровью — позже.', intro: [] },
  { name: 'Адская школа', sky: ['#ff3b3b', '#5a0f2a', '#16040a'], icon: '🏫', cups: 1000, ready: false, text: 'Дополнение «Лютый дебош в адской школе» — позже.', intro: [] },
  { name: 'Хоромы страсти', sky: ['#ff6fc8', '#6a1a5c', '#1a0618'], icon: '💋', cups: 1350, ready: false, text: 'Дополнение «Переполох в хоромах страсти» — позже.', intro: [] },
]

export const arenaOf = (cups: number) => { let i = 0; while (i + 1 < ARENAS.length && cups >= ARENAS[i + 1].cups) i++; return i }

// Кубки за схватку по месту p из n: победа +40, последнее место −5, между ними — плавно. Против живых — ×1,5.
export function cupsFor(place: number, n: number, vsHumans: boolean) {
  const t = n > 1 ? (n - place) / (n - 1) : 1
  const c = Math.round(40 * t - 5 * (1 - t))
  return c > 0 && vsHumans ? Math.round(c * 1.5) : c
}

// Бой на арене (против ботов): чем выше арена, тем умнее боты.
const MODS = Object.keys(MOD_INFO) as Mod[]
export function arenaFight(i: number, me: { name: string; portrait: number }): { setup: SetupPlayer[]; mods: Mod[] } {
  const r = (n: number) => Math.floor(Math.random() * n)
  // разные портреты, не как у игрока; ник — по портрету
  const used = new Set([me.portrait])
  const rival = (bot: number): SetupPlayer => { let p = r(41); while (used.has(p)) p = r(41); used.add(p); return { name: wizardName(p), portrait: p, bot } }
  if (i === 1) {
    const kinds = Object.keys(BOSS_INFO) as BossKind[]
    const boss = kinds[r(kinds.length)]
    const b = BOSS_INFO[boss]
    return { setup: [me, { name: boss === 'mirror' ? `Зеркальный ${me.name}` : b.name, portrait: b.portrait < 0 ? me.portrait : b.portrait, bot: 2, boss }], mods: [] }
  }
  if (i === 2) {
    const pool = [...MODS]
    const mods = [pool.splice(r(pool.length), 1)[0], pool.splice(r(pool.length), 1)[0]]
    return { setup: [me, rival(2), rival(2), rival(2)], mods }
  }
  return { setup: [me, rival(1), rival(1)], mods: [] }
}
