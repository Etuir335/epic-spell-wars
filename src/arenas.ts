// Арены как в Clash Royale: кубки ведут по лестнице, каждая арена добавляет новые правила (позже — по дополнению).
// Арену не теряешь: кубки не падают ниже её порога.
import { BOSS_INFO, MOD_INFO } from './daily.ts'
import type { BossKind, CardSet, Mod, SetupPlayer } from './game/types.ts'
import { wizardName } from './wizards.ts'

export interface Arena { name: string; icon: string; cups: number; sets?: CardSet[]; sky: [string, string, string]; text: string; ready: boolean; intro: { icon: string; title: string; body: string }[] }

export const ARENAS: Arena[] = [
  {
    name: 'Гора Черепламени', sky: ['#ff7a1a', '#7a1d0c', '#1e0907'], icon: '🌋', cups: 0, ready: true, text: 'Основная коробка: заводилы, навороты, приходы и могучие броски.',
    intro: [],
  },
  {
    name: 'Логово Деда', sky: ['#c9a35a', '#4b2c55', '#140a1c'], icon: '👴', cups: 100, ready: true, text: 'Бои с боссами: у них много жизней и свои подлые трюки.',
    intro: [
      { icon: '👴', title: 'Боссы', body: 'На этой арене ты дерёшься один на один с боссом. У босса больше жизней, чем у тебя, и подлый трюк. Бей с умом!' },
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
  { name: 'Грибучее Болото', sky: ['#8fe04a', '#245a2a', '#07160b'], icon: '🍄', cups: 450, ready: true, sets: ['swamp'], text: 'Колода «Мессива на грибучем болоте»: твари, колдунство, пережор.',
    intro: [
      { icon: '🍄', title: 'Грибучее Болото', body: 'Здесь играют колодой дополнения «Мессиво на грибучем болоте». Правила те же, но у карт появились новые свойства.' },
      { icon: '🐾', title: 'Твари', body: 'Половина приходов — твари. Если выпало «СТОЯТЬ!», тварь остаётся перед тобой и срабатывает снова каждый твой ход. А когда враг бьёт тебя, можно подставить тварь — она примет весь удар и погибнет.' },
      { icon: '✨', title: 'Колдунство', body: 'Карта с колдунством может прыгнуть в заклинание прямо с руки во время твоего хода: сбрось 2 карты нужного типа («Шальная магия» подходит за любой). Игра сама предложит, когда можно.' },
      { icon: '🍄', title: 'Пережор', body: 'Если в заклинании 4 разных знака или больше, карта с пережором срабатывает дважды. Знаки считаются и с тварей, сокровищ и карт дохлых колдунов.' },
      { icon: '💥', title: 'Нежданчик', body: 'Подох, не успев сыграть карту с нежданчиком? Из последних сил сыграй колдунства с руки — их эффекты сработают сразу.' },
      { icon: '🎲', title: 'Два знака и вечные сокровища', body: 'У многих приходов два знака — для могучего броска считаются оба (минимум 2 кубика). «Вечные» сокровища не пропадают ни при смерти, ни в конце игры.' },
    ],
  },
  { name: 'Замок Спрутобойни', sky: ['#3fd0e0', '#163e6e', '#060f22'], icon: '🐙', cups: 700, ready: true, sets: ['castle'], text: 'Колода «Бесчинство в замке Спрутобойни»: кровь, замок, нежданчики.',
    intro: [
      { icon: '🐙', title: 'Замок Спрутобойни', body: 'Здесь играют колодой дополнения «Бесчинство в замке Спрутобойни». Правила те же, но добавились кровь и замок.' },
      { icon: '🩸', title: 'Кровь', body: 'За каждого убитого врага — 3 литра крови (не больше 25). Кровь копится весь турнир. Карты и сокровища с «Слей N литров» дают усиление, если потратить кровь.' },
      { icon: '🏰', title: 'Замок', body: 'Некоторые карты захватывают замок. Его владелец получает 1 литр крови в конце каждого раунда. Убьёшь владельца — замок твой. Многие карты сильнее, если замок у тебя.' },
      { icon: '💥', title: 'Нежданчик', body: 'Подох, не успев сыграть карту с нежданчиком? Её эффект всё равно сработает — иногда даже спасёт от смерти.' },
      { icon: '☠', title: 'Дохлые колдуны', body: 'Карты дохлых колдунов замка тоже про кровь и замок: кто-то начнёт игру с тварью, кто-то с замком в склепе.' },
    ],
  },
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
// Подбор ботов. Настрой боя от −2 (передышка) до +2 (вызов): серия на аренах (streak: +побед / −поражений подряд)
// и немного случая — то полегче, то потруднее. Уровень способности бота — около уровня колдуна игрока,
// но не выше арены + 2. На лёгком настрое боты глупее и щадят игрока (mercy), на трудном — умнее.
export function arenaMood(streak: number, rnd = Math.random()): number {
  const m = (streak <= -3 ? -2 : streak <= -1 ? -1 : streak >= 4 ? 2 : streak >= 2 ? 1 : 0) + (rnd < 0.2 ? -1 : rnd > 0.85 ? 1 : 0)
  return Math.max(-2, Math.min(2, m))
}
export function arenaFight(i: number, me: SetupPlayer, streak = 0): { setup: SetupPlayer[]; mods: Mod[]; sets?: CardSet[] } {
  const f = arenaSetup(i, me), mood = arenaMood(streak)
  const base = Math.max(1, me.lvl ?? 1), cap = Math.min(5, i + 2)
  const mercy = mood <= -2 ? 0.8 : mood === -1 ? 0.5 : i === 0 && mood === 0 ? 0.3 : 0 // 0 — явно «не щадить» (иначе лёгкий бот щадит на 0,6)
  const bot = mood <= -1 || (i === 0 && mood < 2) ? 1 : mood >= 2 && i >= 2 ? 3 : 2
  return { ...f, setup: f.setup.map(p => {
    if (!p.bot) return p
    if (p.boss) return mercy ? { ...p, mercy } : p
    const r = Math.random(), lvl = Math.max(mood <= -2 ? 0 : 1, Math.min(cap, base + mood + (r < 0.15 ? -1 : r > 0.85 ? 1 : 0)))
    return { ...p, bot, lvl: lvl || undefined, mercy }
  }) }
}
function arenaSetup(i: number, me: SetupPlayer): { setup: SetupPlayer[]; mods: Mod[]; sets?: CardSet[] } {
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
  if (i === 3) return { setup: [me, rival(2), rival(2), rival(2)], mods: [], sets: ['swamp'] }
  if (i === 4) return { setup: [me, rival(2), rival(2), rival(2)], mods: [], sets: ['castle'] }
  return { setup: [me, rival(1), rival(1)], mods: [] }
}

// Правила арен для турнира и сетевой игры: обычные, с боссом (добавляется бот-босс), безумные (2 случайных правила).
export type Rules = 'plain' | 'boss' | 'mad'
export const RULES: { v: Rules; label: string; arena: number }[] = [
  { v: 'plain', label: '⚔️ Обычные', arena: 0 },
  { v: 'boss', label: '👴 Босс', arena: 1 },
  { v: 'mad', label: '🌀 Безумные', arena: 2 },
]
export function withRules(rules: Rules | undefined, players: SetupPlayer[], net = false): { players: SetupPlayer[]; mods: Mod[] } {
  const r = (n: number) => Math.floor(Math.random() * n)
  if (rules === 'boss' && players.length < 6) { // за полным столом босс не помещается
    const kinds = Object.keys(BOSS_INFO) as BossKind[]
    const boss = kinds[r(kinds.length)], b = BOSS_INFO[boss], me = players[0]
    return { players: [...players, { name: boss === 'mirror' ? `Зеркальный ${me.name}` : b.name, portrait: b.portrait < 0 ? me.portrait : b.portrait, bot: 2, boss }], mods: [] }
  }
  if (rules === 'mad') {
    // «Колдовская лихорадка» в сети не работает — там свой таймер
    const pool = MODS.filter(m => !net || m !== 'fever')
    return { players, mods: [pool.splice(r(pool.length), 1)[0], pool.splice(r(pool.length), 1)[0]] }
  }
  return { players, mods: [] }
}
