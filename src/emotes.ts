// Эмоции — отсылка к Clash Royale (только для своих). Картинки и звуки собирает scripts/build-emotes.mjs
// из emotes-raw/ (giphy + Clash-Royale-SFX) в public/assets/emotes/<id>.webp|.ogg.
// Откуда берутся: base — есть сразу; road — полоса наград (кубки); chest — сундуки (пока: первая победа дня);
// wiz — фирменная эмоция колдуна: открывается на 3-м уровне колдуна, на 5-м становится золотой.
import { wizardName } from './wizards.ts'

export type EmoteKind = 'base' | 'road' | 'chest' | 'wiz'
export type EmoteRarity = 'common' | 'rare' | 'epic'
export interface Emote { id: string; name: string; kind: EmoteKind; rarity?: EmoteRarity; wiz?: number; src: string; snd: string }

// id, название, откуда, редкость, картинка (emotes-raw/giphy/...), звук (emotes-raw/cr-sfx/Emotes/....ogg)
const RAW: [string, string, EmoteKind, string, string, string][] = [
  ["laugh","Хе-хе-хе-хо","base","","king/A27OPbiCvVmoxFC0X9","King/king_laughter_01"],
  ["cry","Слёзки","base","","king/fd1bCy6hYMw5n9taIb","King/king_crying_01"],
  ["mad","Ярость","base","","king/y063lD7Dr8q9BmXb7g","King/king_mad_01"],
  ["thumbs","Красава","base","","king/QTKf7kRi0YBdLgBo9Z","King/king_congrats_01"],
  ["hehe","Хи-хи гоблин","road","","goblin/r6XGkEPJKRnlyXBx31","Goblin/01_01"],
  ["yawn","Скукотища","road","","princess/lAAfEDOsTEZHdIcM1A","Princess/emote_01"],
  ["pancakes","Блинчики!","road","","mini-pekka/GFzS5VVNeMqmSibOF9","Mini P.E.K.K.A/pancakeslash"],
  ["hog","ХОГ РАЙДЕР!","road","","hog-rider/49wFaBoT9jotg1qXZ7","Hog Rider/emote_01"],
  ["skelcry","Скелет рыдает","road","","skeleton/7y4bjqX5VYMaoz2b3j","Skeleton/01_01"],
  ["nowifi","Нет вайфая","road","","king/ks6kj8iVs4kxSSbYNU","King/nowifi"],
  ["hi","Привет!","road","","text/hQh8Osh6s0Od1UlQx7","Events/Text/hi"],
  ["bye","Пока!","road","","text/BN1uv9I4S6BgAqqftb","Events/Text/bye"],
  ["gkiss","Чмок гоблина","chest","common","goblin/DO2nKiNhB1fJrFShye","Goblin/02_01"],
  ["ghide","Не смотрю","chest","common","goblin/KO3vsrbfKd7HD3yny5","Goblin/03_01"],
  ["gcool","Крутой гоблин","chest","rare","goblin/IcZZEqKTDUku3Qdjhv","Goblin/04_01"],
  ["boohoo","Бу-у-у","chest","common","goblin/IDNJ7qQH2qC2KkzezQ","Goblin/boohoo"],
  ["micdrop","Микрофон об пол","chest","epic","goblin/TR6cNPR3rltyzPXuDR","Goblin/micdrop"],
  ["cheater","Читер!","chest","rare","goblin/AveKgX1uCLIHSbeaGx","Goblin/cheater"],
  ["pkiss","Воздушный поцелуй","chest","common","princess/ztBdq2iSitP7V6noQC","Princess/emote_02"],
  ["pangry","Принцесса в гневе","chest","rare","princess/cvRixedR6mIT6OmV0x","Princess/emote_03"],
  ["peace","Мир","chest","common","princess/mPmUDHIjZbyeBp8tWn","Princess/emote_04"],
  ["shush","Тсс","chest","rare","princess/iIba0xtJ1mShzX5Vb5","Princess/shush"],
  ["emperor","Император","chest","epic","king/VR0bl0M6iaHM5plM4g","King/emperor"],
  ["tea","Чаёк","chest","rare","king/JGfOyER2Nk5OrhN9Gi","King/paper"],
  ["sweat","Потею","chest","common","king/568lnOTey2MOTfPuO9","King/sweating"],
  ["nap","Сон","chest","common","king/wiTi20hHHGCDQUfjOr","King/clasharamanap"],
  ["skellove","Влюблённый скелет","chest","rare","skeleton/QEfKxokvJqmhmuL3t7","Skeleton/kiss"],
  ["moai","Камень с лицом","chest","epic","golem/k7eMf81HKjtRthiy3u","Golem/susrock"],
  ["popcorn","Попкорн","chest","epic","ice-wizard/v4XbnRHhFwqqx845Fe","Ice Wizard/meltsweat"],
  ["bunny","П.Е.К.К.А-зайка","chest","rare","pekka/cM0d6HfkHbuVkHYzia","P.E.K.K.A/rabbitsuit"],
  ["chicken","Курица","chest","epic","barbarian/jGcdEwaPg3nwb5ZVRU","Barbarian/01_02"],
  ["kscream","А-А-А!","chest","common","knight/Pkui9JuZNTER2ziInO","Knight/sweatoff"],
  ["ghost","Привидение в шоке","chest","rare","royal-ghost/mSa3Yy4L4w7ZiMUmq6","Royal Ghost/01_01"],
  ["dragon","Дракончик","chest","common","baby-dragon/8f8QzExwtNqJxOplku","Baby Dragon/evo_cuteyawn"],
  ["musk","Аниме-шок","chest","rare","musketeer/bfDbJvvalyRm51E1ao","Musketeer/animeshocked"],
  ["gg","ГГ","chest","common","king/qwtXgeBRp1SNCULGDe","Events/Text/gg"],
  ["w0","","wiz","","goblin-queen/cb004mOy1QT147TUKq","Goblin Queen/laugh"],
  ["w1","","wiz","","hogroyal-hog/RX0F6LiB2NDAGOYJ0j","Royal Hogs/evo_porco"],
  ["w2","","wiz","","skeleton/nEkiInAhABVZy6GqNO","Skeleton/01_02"],
  ["w3","","wiz","","spirit-empress/M90ArRZ7JXPC0YBUmM","Events/Text/yeah"],
  ["w4","","wiz","","skeleton/auCrMKVCksRwfUWubl","Skeleton/01_03"],
  ["w5","","wiz","","elite-barbarian/LlUVYHzAORyeyptWEn","Elite Barbarians/gorilla"],
  ["w6","","wiz","","hogroyal-hog/P5wHxgdCA802eRUNMp","Royal Hogs/evo_phone"],
  ["w7","","wiz","","wizard/BzmaCPvZPrR1NL3ueq","Wizard/evo_evillaugh"],
  ["w8","","wiz","","executioner/VMEEWVY5bz7Ej0vPTm","Executioner/chefskiss"],
  ["w9","","wiz","","giant/1K99cMi1Yu57ZKur8I","Giant/emote_01"],
  ["w10","","wiz","","royal-ghost/nJO8lNQ4VHOlxf12tm","Royal Ghost/01_02"],
  ["w11","","wiz","","king/3lu3DOlyjIqcrQ9h3u","King/king_congrats_02"],
  ["w12","","wiz","","princess/uGpJ6yvSvhG79EVud7","Princess/goahead"],
  ["w13","","wiz","","valkyrie/3KOAis2J4SjA4QPMgA","Valkyrie/evo_hairspin"],
  ["w14","","wiz","","hog-rider/9YKpMKO9pCu2rvz04w","Hog Rider/01_01"],
  ["w15","","wiz","","bowler/JuIPSGMhQxiePZa0l8","Bowler/handsome"],
  ["w16","","wiz","","the-log/R2BV8kNFET6YTFYf9v","The Log/02_angry_sfx1"],
  ["w17","","wiz","","berserker/FF1C3t0RiyxlQDtKnL","Berserker/bighug"],
  ["w18","","wiz","","magic-archer/Lj4mcOqtZ3dsmvCnQl","Magic Archer/magicheart"],
  ["w19","","wiz","","lumberjack/0MgUJS1niz8lEEmRVj","Lumberjack/cheers"],
  ["w20","","wiz","","royal-ghost/tMkCQPjt2BKH88czgR","Royal Ghost/evo_thinking"],
  ["w21","","wiz","","king/pJL7lSJDN6OR2AqseL","King/classiciconscream"],
  ["w22","","wiz","","baby-dragon/gkHZiwHbGjlE8Q7uMn","Baby Dragon/evo_facelick"],
  ["w23","","wiz","","lumberjack/a0Q5kOC4YOtVUDFLQR","Lumberjack/cakerun"],
  ["w24","","wiz","","mega-knight/fZXoUQOBqTeqbLlglq","Mega Knight/01_01"],
  ["w25","","wiz","","electro-wizard/B2KQU8LG0NXnBVt5fV","Electro Wizard/01_01"],
  ["w26","","wiz","","prince/aWIsxzaBsAKlv3ArMQ","Prince/emo_01"],
  ["w27","","wiz","","prince/c0h7duM3ukjylKJCVL","Lumberjack/bottle"],
  ["w28","","wiz","","ronin/Vg6FNRcxbDxZp2BXA9","Events/Text/ok"],
  ["w29","","wiz","","golden-knight/xYQj7PcOKN63drD8k4","Golden Knight/gorgeous"],
  ["w30","","wiz","","night-witch/gcHFY6DBcZKqIz0k3l","Night Witch/witch_01_01"],
  ["w31","","wiz","","king/buGakrKKlZlXTMBICA","King/rocketride"],
  ["w32","","wiz","","witch/L1JvFcpX5XV9F22U6v","Witch/evo_scaryshadow"],
  ["w33","","wiz","","barbarian/2a0OWnpvyqxW3hJahV","Barbarian/01_01"],
  ["w34","","wiz","","wizard/jcIHTjw0GkVVWAaj0r","Wizard/fire"],
  ["w35","","wiz","","ram-rider/jbKMf3ymeiLYg7OGky","Ram Rider/scream"],
  ["w36","","wiz","","mega-minion/QkWHyf7FNU9JYoyw5S","Mega Minion/scary"],
  ["w37","","wiz","","giant/TCnKWCFsg8H37CgfKL","Giant/emote_02"],
  ["w38","","wiz","","fisherman/CkHtjAOF5U7oWPqQ3J","Fisherman/slap_fighting_fish"],
  ["w39","","wiz","","princess/0QTCd6LjUy8xPE5KX3","Princess/01_01"],
  ["w40","","wiz","","hogroyal-hog/TSvJIBbigNltE3GaRv","Events/Text/hihihiha"],
]

export const EMOTES: Emote[] = RAW.map(([id, name, kind, rarity, src, snd]) => {
  const w = kind === 'wiz' ? Number(id.slice(1)) : undefined
  return { id, name: w !== undefined ? `Фирменная: ${wizardName(w)}` : name, kind, rarity: (rarity || undefined) as EmoteRarity | undefined, wiz: w, src, snd }
})
export const emoteById = (id: string) => EMOTES.find(e => e.id === id)
export const wizEmote = (portrait: number) => emoteById(`w${portrait}`)

// полоса наград: эмоция открывается, когда кубков хватает
export const EMOTE_ROAD: { cups: number; id: string }[] = [
  { cups: 30, id: 'hehe' }, { cups: 70, id: 'yawn' }, { cups: 120, id: 'pancakes' }, { cups: 180, id: 'hog' },
  { cups: 260, id: 'skelcry' }, { cups: 350, id: 'nowifi' }, { cups: 500, id: 'hi' }, { cups: 650, id: 'bye' },
]

// уровень колдуна у игрока (прогрессия); 0 — колдун не открыт
export interface EmoteOwner { cups: number; emotes?: string[]; wiz?: Record<number, { lvl: number }> }
export const wizLevelOf = (st: EmoteOwner, portrait: number) => st.wiz?.[portrait]?.lvl ?? 0

export function hasEmote(st: EmoteOwner, e: Emote): boolean {
  if (e.kind === 'base') return true
  if (e.kind === 'road') return EMOTE_ROAD.some(r => r.id === e.id && st.cups >= r.cups) || !!st.emotes?.includes(e.id)
  if (e.kind === 'wiz') return wizLevelOf(st, e.wiz!) >= 3
  return !!st.emotes?.includes(e.id)
}
// золотая версия фирменной эмоции — колдун 5-го уровня
export const isGolden = (st: EmoteOwner, e: Emote) => e.kind === 'wiz' && wizLevelOf(st, e.wiz!) >= 5

// эмоции, доступные в бою за колдуна portrait: открытые общие + фирменная только своего колдуна
export function battleEmotes(st: EmoteOwner, portrait: number): Emote[] {
  return EMOTES.filter(e => e.kind === 'wiz' ? e.wiz === portrait && hasEmote(st, e) : hasEmote(st, e))
}

// выпадение из сундука: редкость по весам, среди ещё не открытых; null — всё уже открыто
const WEIGHT: Record<EmoteRarity, number> = { common: 6, rare: 3, epic: 1 }
export function rollChestEmote(st: EmoteOwner, rnd: () => number = Math.random): Emote | null {
  const pool = EMOTES.filter(e => e.kind === 'chest' && !hasEmote(st, e))
  let x = rnd() * pool.reduce((a, e) => a + WEIGHT[e.rarity ?? 'common'], 0)
  for (const e of pool) if ((x -= WEIGHT[e.rarity ?? 'common']) < 0) return e
  return pool[pool.length - 1] ?? null
}
